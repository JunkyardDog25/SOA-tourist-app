import { api, hasToken, setToken } from "./api.js";
import { ExecutionMap } from "./execution-map.js";

const PROXIMITY_INTERVAL_MS = 10_000;

const viewAuth = document.getElementById("view-auth");
const viewList = document.getElementById("view-list");
const viewActive = document.getElementById("view-active");
const tokenInput = document.getElementById("token-input");
const authError = document.getElementById("auth-error");
const listError = document.getElementById("list-error");
const tokensList = document.getElementById("tokens-list");
const activeError = document.getElementById("active-error");
const activeTitle = document.getElementById("active-tour-title");
const activeStatus = document.getElementById("active-status");
const keypointsProgress = document.getElementById("keypoints-progress");
const proximityStatus = document.getElementById("proximity-status");

let executionMap = null;
let proximityTimer = null;
let currentExecution = null;
let currentTour = null;

function showView(name) {
  viewAuth.classList.toggle("hidden", name !== "auth");
  viewList.classList.toggle("hidden", name !== "list");
  viewActive.classList.toggle("hidden", name !== "active");
}

function stopProximityPolling() {
  if (proximityTimer) {
    clearInterval(proximityTimer);
    proximityTimer = null;
  }
}

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function renderKeypointsProgress() {
  if (!currentTour?.keypoints) {
    keypointsProgress.innerHTML = "";
    return;
  }
  const visited = new Set(
    (currentExecution?.visited_keypoints || []).map((v) => v.keypoint_id),
  );
  keypointsProgress.innerHTML = currentTour.keypoints
    .map((kp, i) => {
      const done = visited.has(kp.id);
      return `<li class="${done ? "kp-done" : ""}">${i + 1}. ${kp.name}${done ? " ✓" : ""}</li>`;
    })
    .join("");
}

async function refreshActiveMap() {
  if (!currentTour || !currentExecution) return;
  const visited = new Set(
    (currentExecution.visited_keypoints || []).map((v) => v.keypoint_id),
  );
  executionMap.showTour(currentTour.keypoints, visited);
  try {
    const loc = await api.getTouristLocation();
    if (loc.latitude != null && loc.longitude != null) {
      executionMap.showTouristPosition(loc.latitude, loc.longitude);
    }
  } catch {
    executionMap.showTouristPosition(
      currentExecution.start_latitude,
      currentExecution.start_longitude,
    );
  }
}

async function pollProximity() {
  if (!currentExecution || !currentTour) return;
  try {
    const loc = await api.getTouristLocation();
    if (loc.latitude == null || loc.longitude == null) {
      proximityStatus.textContent =
        "Postavi lokaciju u simulatoru pre provere blizine.";
      return;
    }
    executionMap.showTouristPosition(loc.latitude, loc.longitude);

    const result = await api.checkProximity(
      currentTour.id,
      currentExecution.id,
      { latitude: loc.latitude, longitude: loc.longitude },
    );
    currentExecution = result.execution;
    activeStatus.textContent = `Poslednja aktivnost: ${formatTime(currentExecution.last_activity_at)}`;
    renderKeypointsProgress();
    if (result.newly_visited && result.near_keypoint_id) {
      executionMap.markKeypointVisited(result.near_keypoint_id);
      proximityStatus.textContent = `Dostignuta ključna tačka (${formatTime(new Date().toISOString())}).`;
    } else {
      proximityStatus.textContent = `Provera blizine: ${new Date().toLocaleTimeString()}`;
    }
  } catch (err) {
    proximityStatus.textContent = err.message;
  }
}

async function enterActiveSession(execution) {
  currentExecution = execution;
  currentTour = await api.getTour(execution.tour_id);
  activeTitle.textContent = currentTour.title || "Aktivna tura";
  activeStatus.textContent = `Započeto: ${formatTime(execution.started_at)}`;
  activeError.textContent = "";
  renderKeypointsProgress();
  await refreshActiveMap();
  showView("active");
  stopProximityPolling();
  await pollProximity();
  proximityTimer = setInterval(pollProximity, PROXIMITY_INTERVAL_MS);
}

async function loadPurchasedTours() {
  listError.textContent = "";
  tokensList.innerHTML = "<li>Učitavanje...</li>";
  try {
    const tokens = await api.getPurchaseTokens();
    if (!tokens.length) {
      tokensList.innerHTML =
        "<li>Nema kupljenih tura. Dodaj u korpu i završi kupovinu (purchase API).</li>";
      return;
    }
    tokensList.innerHTML = "";
    for (const token of tokens) {
      const li = document.createElement("li");
      li.className = "tour-card";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn primary";
      btn.textContent = "Pokreni turu";
      btn.addEventListener("click", () => startTour(token.tourId, token.tourName));
      li.innerHTML = `<strong>${token.tourName}</strong><br><span class="meta">ID: ${token.tourId}</span><br>`;
      li.appendChild(btn);
      tokensList.appendChild(li);
    }
  } catch (err) {
    listError.textContent = err.message;
    tokensList.innerHTML = "";
  }
}

async function startTour(tourId, tourName) {
  listError.textContent = "";
  try {
    const loc = await api.getTouristLocation();
    if (loc.latitude == null || loc.longitude == null) {
      throw new Error(
        "Prvo postavi lokaciju u simulatoru, pa pokreni turu.",
      );
    }
    const execution = await api.startTourExecution(tourId, {
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
    await enterActiveSession(execution);
  } catch (err) {
    listError.textContent = `${tourName}: ${err.message}`;
  }
}

async function resumeActiveIfAny() {
  try {
    const execution = await api.getActiveExecution();
    if (execution) {
      await enterActiveSession(execution);
      return true;
    }
  } catch (err) {
    listError.textContent = err.message;
  }
  return false;
}

async function initList() {
  showView("list");
  const resumed = await resumeActiveIfAny();
  if (!resumed) {
    await loadPurchasedTours();
  }
}

document.getElementById("btn-save-token").addEventListener("click", () => {
  authError.textContent = "";
  const token = tokenInput.value.trim();
  if (!token) {
    authError.textContent = "Unesi token.";
    return;
  }
  setToken(token);
  initList();
});

document.getElementById("btn-logout").addEventListener("click", () => {
  stopProximityPolling();
  setToken("");
  showView("auth");
});

document.getElementById("btn-back-list").addEventListener("click", () => {
  stopProximityPolling();
  currentExecution = null;
  currentTour = null;
  showView("list");
  loadPurchasedTours();
});

document.getElementById("btn-complete").addEventListener("click", async () => {
  if (!currentExecution || !currentTour) return;
  activeError.textContent = "";
  try {
    await api.completeTourExecution(currentTour.id, currentExecution.id);
    stopProximityPolling();
    currentExecution = null;
    currentTour = null;
    showView("list");
    await loadPurchasedTours();
    listError.textContent = "";
    alert("Tura je uspešno završena.");
  } catch (err) {
    activeError.textContent = err.message;
  }
});

document.getElementById("btn-abandon").addEventListener("click", async () => {
  if (!currentExecution || !currentTour) return;
  if (!confirm("Da li želiš da napustiš turu?")) return;
  activeError.textContent = "";
  try {
    await api.abandonTourExecution(currentTour.id, currentExecution.id);
    stopProximityPolling();
    currentExecution = null;
    currentTour = null;
    showView("list");
    await loadPurchasedTours();
  } catch (err) {
    activeError.textContent = err.message;
  }
});

executionMap = new ExecutionMap("execution-map");

if (hasToken()) {
  initList();
} else {
  showView("auth");
}
