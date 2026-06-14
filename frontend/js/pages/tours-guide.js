import { api } from "../api.js";
import { TourMap } from "../tour-map.js";
import {
  escapeHtml,
  formatDistance,
  showError,
} from "../utils.js";

let initialized = false;
let tourMap = null;
let currentTour = null;
let selectedKeypointId = null;
let mapInteraction = null;
let savingKeypoint = false;

export function initGuideToursPage() {
  if (!initialized) {
    initialized = true;
    bindEvents();
  }
  showGuideView("list");
  loadTours();
}

function bindEvents() {
  document.getElementById("btn-new-tour").addEventListener("click", onNewTour);
  document.getElementById("btn-back-guide-list").addEventListener("click", () => {
    resetEditor();
    showGuideView("list");
    loadTours();
  });
  document.getElementById("btn-add-keypoint").addEventListener("click", startAddKeypoint);
  document.getElementById("btn-move-keypoint").addEventListener("click", startMoveKeypoint);
  document.getElementById("btn-cancel-map").addEventListener("click", cancelMapMode);
  document.getElementById("btn-delete-keypoint").addEventListener("click", deleteSelectedKeypoint);
  document.getElementById("keypoint-form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveKeypointForm();
  });
  document.getElementById("duration-form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveDurationForm();
  });
  document.getElementById("tour-info-form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveTourInfo();
  });
  document.getElementById("btn-publish-tour").addEventListener("click", () => runLifecycle("publish"));
  document.getElementById("btn-archive-tour").addEventListener("click", () => runLifecycle("archive"));
  document.getElementById("btn-reactivate-tour").addEventListener("click", () => runLifecycle("reactivate"));
  document.getElementById("btn-delete-tour").addEventListener("click", deleteTour);
}

function showGuideView(name) {
  document.getElementById("guide-list-view").classList.toggle("hidden", name !== "list");
  document.getElementById("guide-editor-view").classList.toggle("hidden", name !== "editor");
  if (name === "editor" && tourMap) tourMap.invalidateSize();
}

async function loadTours() {
  const errEl = document.getElementById("guide-list-error");
  const listEl = document.getElementById("guide-tours-list");
  showError(errEl, "");
  listEl.innerHTML = "<li class='loading'>Učitavanje...</li>";

  try {
    const tours = await api.getMyTours();
    if (!tours.length) {
      listEl.innerHTML = "<li class='empty'>Nema kreiranih tura. Klikni „Nova tura”.</li>";
      return;
    }
    listEl.innerHTML = tours
      .map(
        (t) => `
      <li class="list-row">
        <div>
          <strong>${escapeHtml(t.title)}</strong>
          <p class="meta">${escapeHtml(t.description)}</p>
          <span class="badge">${t.status}</span>
          <span class="meta">${t.keypoints?.length || 0} tačaka · ${formatDistance(t.distance_km)}</span>
        </div>
        <button type="button" class="btn primary btn-sm" data-id="${t.id}">Uredi</button>
      </li>`,
      )
      .join("");

    listEl.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => openEditor(btn.dataset.id));
    });
  } catch (err) {
    showError(errEl, err.message);
    listEl.innerHTML = "";
  }
}

async function onNewTour() {
  const title = prompt("Naziv ture:");
  if (!title?.trim()) return;
  const description = prompt("Opis:", "") || "";
  const difficulty = prompt("Težina (easy/medium/hard):", "easy") || "easy";
  const tags = (prompt("Tagovi (zarezom):", "") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  try {
    const tour = await api.createTour({ title: title.trim(), description, difficulty, tags });
    await openEditor(tour.id);
  } catch (err) {
    alert(err.message);
  }
}

async function openEditor(tourId) {
  resetEditor();
  showGuideView("editor");

  if (!tourMap) {
    tourMap = new TourMap("tour-map", onMapPositionSelected);
  }

  try {
    currentTour = await api.getTour(tourId);
    renderEditor();
    setMapHint("Dodaj tačku klikom na mapu ili izaberi postojeću.", "info");
  } catch (err) {
    alert(err.message);
    showGuideView("list");
  }
}

function renderEditor() {
  if (!currentTour) return;
  const keypoints = currentTour.keypoints || [];

  document.getElementById("editor-title").textContent = currentTour.title;
  document.getElementById("editor-status").textContent =
    `Status: ${currentTour.status} · ${keypoints.length} tačaka · ${formatDistance(currentTour.distance_km)}`;

  document.getElementById("tour-title-input").value = currentTour.title;
  document.getElementById("tour-desc-input").value = currentTour.description || "";
  document.getElementById("tour-diff-input").value = currentTour.difficulty || "easy";
  document.getElementById("tour-price-input").value = currentTour.price ?? "";
  document.getElementById("tour-tags-input").value = (currentTour.tags || []).join(", ");

  populateDurationForm();
  updateLifecycleButtons();
  renderKeypointsSidebar();
  tourMap.renderKeypoints(keypoints, selectedKeypointId);
}

async function saveTourInfo() {
  const errEl = document.getElementById("tour-info-error");
  showError(errEl, "");
  try {
    currentTour = await api.updateTour(currentTour.id, {
      title: document.getElementById("tour-title-input").value.trim(),
      description: document.getElementById("tour-desc-input").value.trim(),
      difficulty: document.getElementById("tour-diff-input").value,
      price: Number(document.getElementById("tour-price-input").value) || 0,
      tags: document
        .getElementById("tour-tags-input")
        .value.split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    renderEditor();
  } catch (err) {
    showError(errEl, err.message);
  }
}

async function refreshCurrentTour() {
  currentTour = await api.getTour(currentTour.id);
  renderEditor();
}

function populateDurationForm() {
  const durations = currentTour?.durations || [];
  ["walking", "bicycle", "car"].forEach((type) => {
    const input = document.getElementById(`duration-${type}`);
    const d = durations.find((x) => x.transport_type === type);
    input.value = d?.minutes || "";
  });
  showError(document.getElementById("duration-error"), "");
}

function updateLifecycleButtons() {
  const status = currentTour?.status;
  document.getElementById("btn-publish-tour").classList.toggle("hidden", status !== "draft");
  document.getElementById("btn-archive-tour").classList.toggle("hidden", status !== "published");
  document.getElementById("btn-reactivate-tour").classList.toggle("hidden", status !== "archived");
  showError(document.getElementById("lifecycle-error"), "");
}

function renderKeypointsSidebar() {
  const keypoints = currentTour?.keypoints || [];
  const listEl = document.getElementById("keypoints-list");

  if (!keypoints.length) {
    listEl.innerHTML = "<li class='empty'>Nema tačaka. Klikni „Dodaj tačku”.</li>";
    return;
  }

  listEl.innerHTML = keypoints
    .map(
      (kp, i) => `
    <li class="keypoint-item${kp.id === selectedKeypointId ? " selected" : ""}" data-id="${kp.id}">
      <strong>${i + 1}. ${escapeHtml(kp.name)}</strong>
      <span>${kp.latitude.toFixed(5)}, ${kp.longitude.toFixed(5)}</span>
    </li>`,
    )
    .join("");

  listEl.querySelectorAll(".keypoint-item").forEach((item) => {
    item.addEventListener("click", () => selectKeypoint(item.dataset.id));
  });
}

function selectKeypoint(id) {
  selectedKeypointId = id;
  const kp = currentTour.keypoints.find((k) => k.id === id);
  if (!kp) return;

  mapInteraction = "edit";
  document.getElementById("form-title").textContent = "Izmena ključne tačke";
  document.getElementById("kp-name").value = kp.name;
  document.getElementById("kp-description").value = kp.description;
  document.getElementById("kp-image-url").value = kp.image_url || "";
  document.getElementById("kp-latitude").value = kp.latitude;
  document.getElementById("kp-longitude").value = kp.longitude;
  showError(document.getElementById("form-error"), "");
  document.getElementById("keypoint-form").classList.remove("hidden");
  document.getElementById("btn-delete-keypoint").classList.remove("hidden");
  renderKeypointsSidebar();
  tourMap.renderKeypoints(currentTour.keypoints, selectedKeypointId);
  tourMap.setMode("view");
}

function startAddKeypoint() {
  selectedKeypointId = null;
  mapInteraction = "add";
  tourMap.setMode("add");
  document.getElementById("keypoint-form").classList.add("hidden");
  setMapHint("Klikni na mapu za novu tačku.", "active");
}

function startMoveKeypoint() {
  if (!selectedKeypointId) {
    alert("Prvo izaberi tačku.");
    return;
  }
  mapInteraction = "move";
  tourMap.setMode("move");
  setMapHint("Klikni novu poziciju na mapi.", "active");
}

function cancelMapMode() {
  mapInteraction = null;
  tourMap.setMode("view");
  setMapHint("Dodaj ili izaberi tačku.", "info");
}

function onMapPositionSelected(coords, mode) {
  if (mode === "add") {
    document.getElementById("form-title").textContent = "Nova ključna tačka";
    document.getElementById("kp-name").value = "";
    document.getElementById("kp-description").value = "";
    document.getElementById("kp-image-url").value = "";
    document.getElementById("kp-latitude").value = coords.latitude.toFixed(6);
    document.getElementById("kp-longitude").value = coords.longitude.toFixed(6);
    showError(document.getElementById("form-error"), "");
    document.getElementById("keypoint-form").classList.remove("hidden");
    document.getElementById("btn-delete-keypoint").classList.add("hidden");
    tourMap.setMode("view");
    setMapHint("Popuni podatke i sačuvaj.", "info");
    return;
  }
  if (mode === "move" && selectedKeypointId) {
    document.getElementById("kp-latitude").value = coords.latitude.toFixed(6);
    document.getElementById("kp-longitude").value = coords.longitude.toFixed(6);
    tourMap.setMode("view");
    setMapHint("Nova pozicija — sačuvaj izmene.", "success");
  }
}

async function saveKeypointForm() {
  if (savingKeypoint) return;
  const errEl = document.getElementById("form-error");
  showError(errEl, "");

  const payload = {
    name: document.getElementById("kp-name").value.trim(),
    description: document.getElementById("kp-description").value.trim(),
    latitude: Number(document.getElementById("kp-latitude").value),
    longitude: Number(document.getElementById("kp-longitude").value),
    image_url: document.getElementById("kp-image-url").value.trim(),
  };

  if (!payload.name || !payload.description) {
    showError(errEl, "Naziv i opis su obavezni.");
    return;
  }

  savingKeypoint = true;
  try {
    if (mapInteraction === "add") {
      await api.addKeypoint(currentTour.id, payload);
    } else if (selectedKeypointId) {
      await api.updateKeypoint(currentTour.id, selectedKeypointId, payload);
    }
    await refreshCurrentTour();
    document.getElementById("keypoint-form").classList.add("hidden");
    setMapHint("Sačuvano.", "success");
  } catch (err) {
    showError(errEl, err.message);
  } finally {
    savingKeypoint = false;
  }
}

async function deleteSelectedKeypoint() {
  if (!selectedKeypointId || !confirm("Obrisati tačku?")) return;
  try {
    await api.deleteKeypoint(currentTour.id, selectedKeypointId);
    selectedKeypointId = null;
    await refreshCurrentTour();
    document.getElementById("keypoint-form").classList.add("hidden");
  } catch (err) {
    showError(document.getElementById("form-error"), err.message);
  }
}

async function saveDurationForm() {
  const errEl = document.getElementById("duration-error");
  showError(errEl, "");
  const durations = [];

  for (const type of ["walking", "bicycle", "car"]) {
    const raw = document.getElementById(`duration-${type}`).value.trim();
    if (!raw) continue;
    const minutes = Number(raw);
    if (!Number.isInteger(minutes) || minutes <= 0) {
      showError(errEl, "Minuti moraju biti pozitivan ceo broj.");
      return;
    }
    durations.push({ transport_type: type, minutes });
  }

  try {
    currentTour = await api.updateTourDurations(currentTour.id, { durations });
    renderEditor();
  } catch (err) {
    showError(errEl, err.message);
  }
}

async function runLifecycle(action) {
  const actions = {
    publish: api.publishTour,
    archive: api.archiveTour,
    reactivate: api.reactivateTour,
  };
  const errEl = document.getElementById("lifecycle-error");
  showError(errEl, "");
  try {
    currentTour = await actions[action](currentTour.id);
    renderEditor();
  } catch (err) {
    showError(errEl, err.message);
  }
}

async function deleteTour() {
  if (!confirm("Obrisati celu turu?")) return;
  try {
    await api.deleteTour(currentTour.id);
    resetEditor();
    showGuideView("list");
    loadTours();
  } catch (err) {
    showError(document.getElementById("lifecycle-error"), err.message);
  }
}

function resetEditor() {
  currentTour = null;
  selectedKeypointId = null;
  mapInteraction = null;
  document.getElementById("keypoint-form").classList.add("hidden");
  if (tourMap) tourMap.setMode("view");
}

function setMapHint(text, type) {
  const el = document.getElementById("map-hint");
  el.textContent = text;
  el.className = `map-hint map-hint-${type}`;
}
