import { api, hasToken, setToken } from "./api.js";
import { SimulatorMap } from "./simulator-map.js";

const tokenInput = document.getElementById("token-input");
const authError = document.getElementById("auth-error");
const statusEl = document.getElementById("status-text");
const coordsEl = document.getElementById("coords-text");
const mapError = document.getElementById("map-error");

let simulatorMap = null;
let saving = false;

function formatCoords(lat, lng) {
  return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
}

async function loadLocation() {
  mapError.textContent = "";
  statusEl.textContent = "Učitavanje lokacije...";
  try {
    const loc = await api.getTouristLocation();
    if (loc.latitude != null && loc.longitude != null) {
      simulatorMap.showPosition(loc.latitude, loc.longitude);
      statusEl.textContent = "Lokacija učitana.";
      coordsEl.textContent = formatCoords(loc.latitude, loc.longitude);
      if (loc.updated_at) {
        coordsEl.textContent += ` (ažurirano: ${new Date(loc.updated_at).toLocaleString()})`;
      }
    } else {
      simulatorMap.clearPosition();
      statusEl.textContent = "Lokacija još nije postavljena. Klikni na mapu.";
      coordsEl.textContent = "—";
    }
  } catch (err) {
    statusEl.textContent = "Greška pri učitavanju.";
    mapError.textContent = err.message;
  }
}

async function saveLocation(coords) {
  const latitude = Number(coords.latitude);
  const longitude = Number(coords.longitude);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    mapError.textContent = "Neispravne koordinate sa mape.";
    return;
  }

  if (saving) return;
  saving = true;
  mapError.textContent = "";
  statusEl.textContent = "Čuvanje lokacije...";

  try {
    const loc = await api.setTouristLocation({ latitude, longitude });
    simulatorMap.showPosition(loc.latitude, loc.longitude);
    statusEl.textContent = "Trenutna lokacija sačuvana.";
    coordsEl.textContent = formatCoords(loc.latitude, loc.longitude);
    if (loc.updated_at) {
      coordsEl.textContent += ` (ažurirano: ${new Date(loc.updated_at).toLocaleString()})`;
    }
  } catch (err) {
    statusEl.textContent = "Greška pri čuvanju.";
    mapError.textContent = err.message;
  } finally {
    saving = false;
  }
}

async function onSaveToken() {
  authError.textContent = "";
  setToken(tokenInput.value);
  if (!hasToken()) {
    authError.textContent = "Unesi JWT token.";
    return;
  }
  try {
    document.getElementById("view-auth").classList.add("hidden");
    document.getElementById("view-simulator").classList.remove("hidden");
    if (!simulatorMap) {
      simulatorMap = new SimulatorMap("simulator-map", saveLocation);
    }
    simulatorMap.invalidateSize();
    await loadLocation();
  } catch (err) {
    authError.textContent = err.message;
    setToken("");
  }
}

function init() {
  document.getElementById("btn-save-token").addEventListener("click", onSaveToken);
  document.getElementById("btn-logout").addEventListener("click", () => {
    setToken("");
    tokenInput.value = "";
    document.getElementById("view-simulator").classList.add("hidden");
    document.getElementById("view-auth").classList.remove("hidden");
  });

  if (hasToken()) {
    onSaveToken();
  }
}

init();
