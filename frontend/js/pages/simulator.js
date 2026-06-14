import { api } from "../api.js";
import { ExecutionMap, nearestKeypoint } from "../execution-map.js";
import { escapeHtml, showError } from "../utils.js";

let initialized = false;
let executionMap = null;
let saving = false;
let selectedTourId = null;
let currentKeypoints = [];

export function initSimulatorPage() {
  if (!initialized) {
    initialized = true;
    document.getElementById("btn-reload-location").addEventListener("click", refreshView);
    document.getElementById("sim-tour-select").addEventListener("change", onTourSelected);
  }

  refreshView();
}

function formatCoords(lat, lng) {
  return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
}

function ensureMap() {
  if (executionMap) {
    executionMap.invalidateSize();
    return;
  }
  try {
    executionMap = new ExecutionMap("simulator-map", { onPositionClick: saveLocation });
  } catch (err) {
    showError(document.getElementById("sim-error"), `Mapa: ${err.message}`);
  }
}

function updateNearestInfo(latitude, longitude) {
  const infoEl = document.getElementById("sim-nearest");
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

  infoEl.innerHTML = `Najbliža tačka: <strong>${escapeHtml(nearest.keypoint.name)}</strong> (${nearest.distanceKm.toFixed(2)} km)`;
}

async function loadTourOptions() {
  const select = document.getElementById("sim-tour-select");
  const errEl = document.getElementById("sim-error");
  showError(errEl, "");
  select.innerHTML = '<option value="">Učitavanje tura...</option>';

  try {
    const [published, tokensResult] = await Promise.all([
      api.getPublishedTours(),
      api.getTokens().catch(() => []),
    ]);

    const publishedTours = Array.isArray(published) ? published : [];
    const tokens = Array.isArray(tokensResult) ? tokensResult : [];
    const purchasedIds = new Set(tokens.map((t) => t.tourId));

    if (!publishedTours.length) {
      select.innerHTML = '<option value="">Nema objavljenih tura</option>';
      return;
    }

    select.innerHTML =
      '<option value="">— Izaberi turu —</option>' +
      publishedTours
        .map((t) => {
          const label = purchasedIds.has(t.id)
            ? `${t.title} (kupljeno)`
            : `${t.title} (samo prva tačka)`;
          return `<option value="${t.id}">${escapeHtml(label)}</option>`;
        })
        .join("");
  } catch (err) {
    select.innerHTML = '<option value="">Greška pri učitavanju tura</option>';
    showError(errEl, err.message);
  }
}

async function onTourSelected() {
  selectedTourId = document.getElementById("sim-tour-select").value || null;
  const errEl = document.getElementById("sim-error");
  showError(errEl, "");

  ensureMap();
  if (!executionMap) return;

  if (!selectedTourId) {
    currentKeypoints = [];
    executionMap.clearKeypoints();
    updateNearestInfo(null, null);
    return;
  }

  try {
    const tour = await api.getTour(selectedTourId);
    currentKeypoints = tour.keypoints || (tour.first_keypoint ? [tour.first_keypoint] : []);
    executionMap.renderKeypoints(currentKeypoints);

    if (tour.keypoints?.length) {
      document.getElementById("sim-status").textContent =
        "Puna ruta (tura kupljena). Klikni na mapu da postaviš lokaciju.";
    } else if (tour.first_keypoint) {
      document.getElementById("sim-status").textContent =
        "Vidiš samo prvu tačku — kupi turu za celu rutu.";
    } else {
      document.getElementById("sim-status").textContent = "Tura nema ključnih tačaka.";
    }

    const loc = await api.getTouristLocation();
    if (loc?.latitude != null) {
      executionMap.showTourist(loc.latitude, loc.longitude);
      updateNearestInfo(loc.latitude, loc.longitude);
    }
  } catch (err) {
    showError(errEl, err.message);
  }
}

async function refreshView() {
  await loadTourOptions();
  ensureMap();

  if (selectedTourId) {
    const select = document.getElementById("sim-tour-select");
    const optionExists = [...select.options].some((o) => o.value === selectedTourId);
    if (optionExists) {
      select.value = selectedTourId;
      await onTourSelected();
      return;
    }
    selectedTourId = null;
  }

  await loadLocation();
}

async function loadLocation() {
  const statusEl = document.getElementById("sim-status");
  const coordsEl = document.getElementById("sim-coords");
  const errEl = document.getElementById("sim-error");
  showError(errEl, "");

  ensureMap();
  if (!executionMap) return;

  statusEl.textContent = "Učitavanje lokacije...";

  try {
    const loc = await api.getTouristLocation();
    if (loc?.latitude != null && loc?.longitude != null) {
      executionMap.showTourist(loc.latitude, loc.longitude);
      statusEl.textContent = selectedTourId
        ? "Lokacija učitana. Klikni na mapu da je promeniš."
        : "Lokacija učitana. Izaberi turu da vidiš tačke.";
      coordsEl.textContent = formatCoords(loc.latitude, loc.longitude);
      if (loc.updated_at) {
        coordsEl.textContent += ` (ažurirano: ${new Date(loc.updated_at).toLocaleString()})`;
      }
      updateNearestInfo(loc.latitude, loc.longitude);
    } else {
      executionMap.clearTourist();
      statusEl.textContent = "Lokacija nije postavljena. Klikni na mapu.";
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
    statusEl.textContent = "Lokacija sačuvana.";
    coordsEl.textContent = formatCoords(loc.latitude, loc.longitude);
    if (loc.updated_at) {
      coordsEl.textContent += ` (ažurirano: ${new Date(loc.updated_at).toLocaleString()})`;
    }
    updateNearestInfo(loc.latitude, loc.longitude);
  } catch (err) {
    statusEl.textContent = "Greška pri čuvanju.";
    showError(errEl, err.message);
  } finally {
    saving = false;
  }
}
