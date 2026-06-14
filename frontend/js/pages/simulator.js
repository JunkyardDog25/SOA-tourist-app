import { api, hasToken } from "../api.js";
import { ExecutionMap, nearestKeypoint } from "../execution-map.js";
import { escapeHtml, formatDateTime, showError } from "../utils.js";

let eventsBound = false;
let executionMap = null;
let saving = false;
let selectedTourId = null;
let currentKeypoints = [];
let visitedKeypointIds = new Set();

const VISIT_RADIUS_M = 80;

export function initSimulatorPage() {
  bindEvents();
  if (typeof window.refreshSimulatorTours === "function") {
    window.refreshSimulatorTours();
  } else {
    loadTourOptions();
  }
  ensureMap();
  loadLocation();
}

function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;

  document.getElementById("btn-reload-location")?.addEventListener("click", () => {
    if (typeof window.refreshSimulatorTours === "function") {
      window.refreshSimulatorTours();
    } else {
      loadTourOptions();
    }
    loadLocation();
    if (selectedTourId) {
      loadExecutionProgress(selectedTourId);
    }
  });
  document.getElementById("sim-tour-select")?.addEventListener("change", onTourSelected);
}

function formatCoords(lat, lng) {
  return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
}

function buildTourOptions(tours, purchasedIds) {
  return (
    '<option value="">— Izaberi turu —</option>' +
    tours
      .map((t) => {
        const id = t.id || t._id;
        const title = t.title || "Bez naziva";
        const suffix = purchasedIds.has(id) ? " (kupljeno)" : "";
        return `<option value="${escapeHtml(id)}">${escapeHtml(title)}${suffix}</option>`;
      })
      .join("")
  );
}

function setTourStatus(message, isError = false) {
  const el = document.getElementById("sim-tour-status");
  if (!el) return;
  el.textContent = message;
  el.className = isError ? "error" : "meta";
}

function ensureMap() {
  if (executionMap) {
    executionMap.invalidateSize();
    return;
  }
  const container = document.getElementById("simulator-map");
  if (!container || typeof L === "undefined") {
    showError(document.getElementById("sim-error"), "Mapa nije spremna.");
    return;
  }
  try {
    executionMap = new ExecutionMap("simulator-map", { onPositionClick: saveLocation });
  } catch (err) {
    showError(document.getElementById("sim-error"), `Mapa: ${err.message}`);
  }
}

function renderKeypointsOnMap() {
  if (executionMap) {
    executionMap.renderKeypoints(currentKeypoints, visitedKeypointIds);
  }
}

function updateNearestInfo(latitude, longitude) {
  const infoEl = document.getElementById("sim-nearest");
  if (!infoEl) return;

  const nearest = nearestKeypoint(latitude, longitude, currentKeypoints);
  if (!currentKeypoints.length) {
    infoEl.textContent = "Izaberi turu da vidiš ključne tačke na mapi.";
    return;
  }
  if (latitude == null || longitude == null) {
    infoEl.textContent = "Postavi lokaciju klikom na mapu.";
    return;
  }
  if (!nearest) {
    infoEl.textContent = "";
    return;
  }

  const distM = nearest.distanceKm * 1000;
  const nearText =
    distM <= VISIT_RADIUS_M
      ? " — <strong>u dometu za automatsko beleženje!</strong>"
      : "";
  infoEl.innerHTML =
    `Najbliža tačka: <strong>${escapeHtml(nearest.keypoint.name)}</strong> (${distM.toFixed(0)} m)${nearText}`;
}

function renderProgressUI(progress) {
  const wrap = document.getElementById("sim-progress");
  const textEl = document.getElementById("sim-progress-text");
  const listEl = document.getElementById("sim-visits-list");
  if (!wrap || !textEl || !listEl) return;

  if (!selectedTourId || !progress) {
    wrap.classList.add("hidden");
    return;
  }

  wrap.classList.remove("hidden");
  textEl.textContent = `${progress.visited_count} / ${progress.total_keypoints} tačaka`;
  if (progress.completed) {
    textEl.textContent += " — tura završena!";
  }

  if (!progress.visits?.length) {
    listEl.innerHTML =
      "<li class='meta'>Nijedna tačka još nije obišena. Priđi blizu tačke na mapi.</li>";
    return;
  }

  listEl.innerHTML = progress.visits
    .map(
      (v) =>
        `<li>✓ <strong>${escapeHtml(v.keypoint_name)}</strong> — ${formatDateTime(v.visited_at)}</li>`,
    )
    .join("");
}

async function loadExecutionProgress(tourId) {
  if (!tourId) return null;
  try {
    const progress = await api.getExecutionProgress(tourId);
    visitedKeypointIds = new Set((progress.visits || []).map((v) => v.keypoint_id));
    renderKeypointsOnMap();
    renderProgressUI(progress);
    return progress;
  } catch (err) {
    document.getElementById("sim-progress")?.classList.add("hidden");
    return null;
  }
}

async function checkExecutionAtPosition(latitude, longitude) {
  if (!selectedTourId || latitude == null || longitude == null) return;

  try {
    const progress = await api.checkExecutionPosition(selectedTourId, {
      latitude,
      longitude,
    });
    visitedKeypointIds = new Set((progress.visits || []).map((v) => v.keypoint_id));
    renderKeypointsOnMap();
    renderProgressUI(progress);

    if (progress.newly_visited?.length) {
      const statusEl = document.getElementById("sim-status");
      if (statusEl) {
        statusEl.textContent = `Nova tačka obišena! (${progress.visited_count}/${progress.total_keypoints})`;
      }
    }
    if (progress.completed) {
      const statusEl = document.getElementById("sim-status");
      if (statusEl) {
        statusEl.textContent = "Čestitamo — obišao si celu turu!";
      }
    }
  } catch (err) {
    showError(document.getElementById("sim-error"), err.message);
  }
}

async function loadTourOptions() {
  const select = document.getElementById("sim-tour-select");
  const errEl = document.getElementById("sim-error");
  if (!select) return;

  showError(errEl, "");
  select.innerHTML = '<option value="">Učitavanje tura...</option>';
  setTourStatus("Učitavanje tura...");

  if (!hasToken()) {
    select.innerHTML = '<option value="">Prijavi se prvo</option>';
    setTourStatus("Niste prijavljeni.", true);
    return;
  }

  try {
    const published = await api.getPublishedTours();
    const tours = Array.isArray(published) ? published : [];

    if (!tours.length) {
      select.innerHTML = '<option value="">Nema objavljenih tura</option>';
      setTourStatus("Nema tura za obilazak.");
      return;
    }

    select.innerHTML = buildTourOptions(tours, new Set());
    setTourStatus("");

    api
      .getTokens()
      .then((tokensResult) => {
        const tokens = Array.isArray(tokensResult) ? tokensResult : [];
        const purchasedIds = new Set(tokens.map((t) => t.tourId || t.tour_id).filter(Boolean));
        select.innerHTML = buildTourOptions(tours, purchasedIds);
        if (selectedTourId) {
          select.value = selectedTourId;
        }
      })
      .catch(() => {});
  } catch (err) {
    select.innerHTML = '<option value="">Greška pri učitavanju</option>';
    setTourStatus(err.message, true);
    showError(errEl, err.message);
  }
}

async function onTourSelected() {
  selectedTourId = document.getElementById("sim-tour-select")?.value || null;
  const errEl = document.getElementById("sim-error");
  showError(errEl, "");
  ensureMap();

  if (!executionMap) return;

  if (!selectedTourId) {
    currentKeypoints = [];
    visitedKeypointIds = new Set();
    executionMap.clearKeypoints();
    document.getElementById("sim-progress")?.classList.add("hidden");
    updateNearestInfo(null, null);
    return;
  }

  try {
    const tour = await api.getTour(selectedTourId);
    currentKeypoints = tour.keypoints || (tour.first_keypoint ? [tour.first_keypoint] : []);

    const statusEl = document.getElementById("sim-status");
    if (tour.keypoints?.length || tour.first_keypoint) {
      statusEl.textContent = "Klikni blizu tačke na mapi da se zabeleži obilazak.";
    } else {
      statusEl.textContent = "Tura nema ključnih tačaka.";
    }

    await loadExecutionProgress(selectedTourId);

    const loc = await api.getTouristLocation();
    if (loc?.latitude != null) {
      executionMap.showTourist(loc.latitude, loc.longitude);
      updateNearestInfo(loc.latitude, loc.longitude);
      await checkExecutionAtPosition(loc.latitude, loc.longitude);
    } else {
      renderKeypointsOnMap();
    }
  } catch (err) {
    showError(errEl, err.message);
  }
}

async function loadLocation() {
  const statusEl = document.getElementById("sim-status");
  const coordsEl = document.getElementById("sim-coords");
  const errEl = document.getElementById("sim-error");
  showError(errEl, "");

  ensureMap();
  if (!executionMap || !statusEl) return;

  statusEl.textContent = "Učitavanje lokacije...";

  try {
    const loc = await api.getTouristLocation();
    if (loc?.latitude != null && loc?.longitude != null) {
      executionMap.showTourist(loc.latitude, loc.longitude);
      statusEl.textContent = selectedTourId
        ? "Lokacija učitana. Klikni blizu tačke da je obiđeš."
        : "Lokacija učitana. Izaberi turu iz padajućeg menija.";
      coordsEl.textContent = formatCoords(loc.latitude, loc.longitude);
      if (loc.updated_at) {
        coordsEl.textContent += ` (ažurirano: ${new Date(loc.updated_at).toLocaleString()})`;
      }
      updateNearestInfo(loc.latitude, loc.longitude);
      if (selectedTourId) {
        await checkExecutionAtPosition(loc.latitude, loc.longitude);
      }
    } else {
      executionMap.clearTourist();
      statusEl.textContent = "Klikni na mapu da postaviš lokaciju.";
      coordsEl.textContent = "—";
      updateNearestInfo(null, null);
    }
  } catch (err) {
    statusEl.textContent = "Greška pri učitavanju lokacije.";
    showError(errEl, err.message);
  }
}

async function saveLocation(coords) {
  const statusEl = document.getElementById("sim-status");
  const coordsEl = document.getElementById("sim-coords");
  const errEl = document.getElementById("sim-error");

  const latitude = Number(coords.latitude);
  const longitude = Number(coords.longitude);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    showError(errEl, "Neispravne koordinate.");
    return;
  }

  if (saving) return;
  saving = true;
  showError(errEl, "");
  statusEl.textContent = "Čuvanje...";

  try {
    const loc = await api.setTouristLocation({ latitude, longitude });
    ensureMap();
    executionMap?.showTourist(loc.latitude, loc.longitude);
    coordsEl.textContent = formatCoords(loc.latitude, loc.longitude);
    if (loc.updated_at) {
      coordsEl.textContent += ` (ažurirano: ${new Date(loc.updated_at).toLocaleString()})`;
    }
    updateNearestInfo(loc.latitude, loc.longitude);

    if (selectedTourId) {
      await checkExecutionAtPosition(latitude, longitude);
      statusEl.textContent = "Lokacija sačuvana. Proverena blizina tačaka ture.";
    } else {
      statusEl.textContent = "Lokacija sačuvana. Izaberi turu za evidenciju obilaska.";
    }
  } catch (err) {
    statusEl.textContent = "Greška pri čuvanju.";
    showError(errEl, err.message);
  } finally {
    saving = false;
  }
}
