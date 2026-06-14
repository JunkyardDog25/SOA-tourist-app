import { api, hasToken } from "../api.js";
import { ExecutionMap, nearestKeypoint } from "../execution-map.js";
import { escapeHtml, showError } from "../utils.js";

let eventsBound = false;
let executionMap = null;
let saving = false;
let selectedTourId = null;
let currentKeypoints = [];

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
        const suffix = purchasedIds.has(id) ? " (kupljeno)" : " (samo prva tačka)";
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
    showError(document.getElementById("sim-error"), "Mapa nije spremna (Leaflet).");
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
  infoEl.innerHTML = `Najbliža tačka: <strong>${escapeHtml(nearest.keypoint.name)}</strong> (${nearest.distanceKm.toFixed(2)} km)`;
}

async function loadTourOptions() {
  const select = document.getElementById("sim-tour-select");
  const errEl = document.getElementById("sim-error");
  if (!select) return;

  showError(errEl, "");
  select.innerHTML = '<option value="">Učitavanje tura...</option>';
  setTourStatus("Učitavanje objavljenih tura...");

  if (!hasToken()) {
    select.innerHTML = '<option value="">Prijavi se prvo</option>';
    setTourStatus("Niste prijavljeni — token je potreban za učitavanje tura.", true);
    return;
  }

  try {
    const published = await api.getPublishedTours();
    const tours = Array.isArray(published) ? published : [];

    if (!tours.length) {
      select.innerHTML = '<option value="">Nema objavljenih tura</option>';
      setTourStatus("Nema objavljenih tura. Vodič mora prvo objaviti turu.");
      return;
    }

    select.innerHTML = buildTourOptions(tours, new Set());
    setTourStatus(`Učitano ${tours.length} objavljenih tura.`);

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
      .catch(() => {
        /* zadrži listu bez oznaka kupovine */
      });
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
    executionMap.clearKeypoints();
    updateNearestInfo(null, null);
    return;
  }

  try {
    const tour = await api.getTour(selectedTourId);
    currentKeypoints = tour.keypoints || (tour.first_keypoint ? [tour.first_keypoint] : []);
    executionMap.renderKeypoints(currentKeypoints);

    const statusEl = document.getElementById("sim-status");
    if (tour.keypoints?.length) {
      statusEl.textContent = "Puna ruta (kupljeno). Klikni na mapu za lokaciju.";
    } else if (tour.first_keypoint) {
      statusEl.textContent = "Samo prva tačka — kupi turu za celu rutu.";
    } else {
      statusEl.textContent = "Tura nema ključnih tačaka.";
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
        ? "Lokacija učitana. Klikni na mapu da je promeniš."
        : "Lokacija učitana. Izaberi turu iz padajućeg menija.";
      coordsEl.textContent = formatCoords(loc.latitude, loc.longitude);
      if (loc.updated_at) {
        coordsEl.textContent += ` (ažurirano: ${new Date(loc.updated_at).toLocaleString()})`;
      }
      updateNearestInfo(loc.latitude, loc.longitude);
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
