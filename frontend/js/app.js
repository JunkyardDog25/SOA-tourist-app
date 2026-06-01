import { api, hasToken, setToken } from "./api.js";
import { TourMap } from "./tour-map.js";

const views = {
  auth: document.getElementById("view-auth"),
  list: document.getElementById("view-list"),
  public: document.getElementById("view-public"),
  editor: document.getElementById("view-editor"),
};

const tokenInput = document.getElementById("token-input");
const authError = document.getElementById("auth-error");
const toursListEl = document.getElementById("tours-list");
const listError = document.getElementById("list-error");
const publicError = document.getElementById("public-error");
const publicToursListEl = document.getElementById("public-tours-list");
const editorTitle = document.getElementById("editor-title");
const editorStatus = document.getElementById("editor-status");
const tourDistance = document.getElementById("tour-distance");
const tourTimestamps = document.getElementById("tour-timestamps");
const keypointsListEl = document.getElementById("keypoints-list");
const mapHint = document.getElementById("map-hint");
const keypointForm = document.getElementById("keypoint-form");
const formTitle = document.getElementById("form-title");
const kpName = document.getElementById("kp-name");
const kpDescription = document.getElementById("kp-description");
const kpImageUrl = document.getElementById("kp-image-url");
const kpLatitude = document.getElementById("kp-latitude");
const kpLongitude = document.getElementById("kp-longitude");
const formError = document.getElementById("form-error");
const durationError = document.getElementById("duration-error");
const priceError = document.getElementById("price-error");
const tourPriceInput = document.getElementById("tour-price");
const lifecycleError = document.getElementById("lifecycle-error");
const durationInputs = {
  walking: document.getElementById("duration-walking"),
  bicycle: document.getElementById("duration-bicycle"),
  car: document.getElementById("duration-car"),
};
const lifecycleButtons = {
  publish: document.getElementById("btn-publish-tour"),
  archive: document.getElementById("btn-archive-tour"),
  reactivate: document.getElementById("btn-reactivate-tour"),
};

let tourMap = null;
let currentTour = null;
let selectedKeypointId = null;
let mapInteraction = null;
let savingKeypoint = false;
let previousPublicView = "auth";

function showView(name) {
  Object.values(views).forEach((el) => el.classList.add("hidden"));
  views[name].classList.remove("hidden");
  if (name === "editor" && tourMap) {
    tourMap.invalidateSize();
  }
}

function setMapHint(text, type = "info") {
  mapHint.textContent = text;
  mapHint.className = `map-hint map-hint-${type}`;
}

async function init() {
  document.getElementById("btn-save-token").addEventListener("click", onSaveToken);
  document
    .getElementById("btn-public-tours-auth")
    .addEventListener("click", () => showPublishedTours("auth"));
  document
    .getElementById("btn-public-tours-list")
    .addEventListener("click", () => showPublishedTours("list"));
  document.getElementById("btn-back-auth").addEventListener("click", () => {
    showView(previousPublicView === "list" ? "list" : "auth");
  });
  document.getElementById("btn-logout").addEventListener("click", onLogout);
  document.getElementById("btn-new-tour").addEventListener("click", onNewTour);
  document.getElementById("btn-back-list").addEventListener("click", () => {
    resetEditor();
    showView("list");
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
  document.getElementById("price-form").addEventListener("submit", (e) => {
    e.preventDefault();
    savePriceForm();
  });
  lifecycleButtons.publish.addEventListener("click", () => runLifecycleAction("publish"));
  lifecycleButtons.archive.addEventListener("click", () => runLifecycleAction("archive"));
  lifecycleButtons.reactivate.addEventListener("click", () =>
    runLifecycleAction("reactivate"),
  );

  if (hasToken()) {
    showView("list");
    await loadTours();
  } else {
    showView("auth");
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
    await loadTours();
    showView("list");
  } catch (err) {
    authError.textContent = err.message;
    setToken("");
  }
}

function onLogout() {
  setToken("");
  tokenInput.value = "";
  showView("auth");
}

async function loadTours() {
  listError.textContent = "";
  toursListEl.innerHTML = "<li class='loading'>Učitavanje...</li>";
  try {
    const tours = await api.getMyTours();
    if (!tours.length) {
      toursListEl.innerHTML =
        "<li class='empty'>Nemaš kreiranih tura. Klikni „Nova tura”.</li>";
      return;
    }
    toursListEl.innerHTML = tours
      .map(
        (t) => `
      <li class="tour-card">
        <div>
          <h3>${escapeHtml(t.title)}</h3>
          <p>${escapeHtml(t.description)}</p>
          <span class="badge">${t.status}</span>
          <span class="meta">${t.keypoints?.length || 0} ključnih tačaka</span>
          <span class="meta">${formatDistance(t.distance_km)}</span>
        </div>
        <button type="button" data-tour-id="${t.id}">Uredi na mapi</button>
      </li>`,
      )
      .join("");

    toursListEl.querySelectorAll("button[data-tour-id]").forEach((btn) => {
      btn.addEventListener("click", () => openEditor(btn.dataset.tourId));
    });
  } catch (err) {
    listError.textContent = err.message;
    toursListEl.innerHTML = "";
  }
}

async function onNewTour() {
  const title = prompt("Naziv ture:");
  if (!title?.trim()) return;
  const description = prompt("Opis ture:") || "";
  const difficulty = prompt("Težina (easy / medium / hard):", "easy") || "easy";
  const tagsInput = prompt("Tagovi odvojeni zarezom:", "") || "";
  const tags = tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  try {
    const tour = await api.createTour({
      title: title.trim(),
      description: description.trim() || title.trim(),
      difficulty,
      tags,
    });
    await openEditor(tour.id);
  } catch (err) {
    alert(err.message);
  }
}

async function openEditor(tourId) {
  resetEditor();
  showView("editor");

  if (!tourMap) {
    tourMap = new TourMap("tour-map", onMapPositionSelected);
  }

  try {
    currentTour = await api.getTour(tourId);
    renderEditor();
    setMapHint("Izaberi tačku sa liste ili dodaj novu klikom na mapu.", "info");
  } catch (err) {
    alert(err.message);
    showView("list");
  }
}

async function showPublishedTours(previousView) {
  previousPublicView = previousView;
  authError.textContent = "";
  listError.textContent = "";

  if (tokenInput.value.trim()) {
    setToken(tokenInput.value);
  }
  if (!hasToken()) {
    authError.textContent = "Unesi JWT token pre pregleda objavljenih tura.";
    showView("auth");
    return;
  }

  showView("public");
  publicError.textContent = "";
  publicToursListEl.innerHTML = "<li class='loading'>Učitavanje...</li>";

  try {
    const tours = await api.getPublishedTours();
    if (!tours.length) {
      publicToursListEl.innerHTML = "<li class='empty'>Nema objavljenih tura.</li>";
      return;
    }

    publicToursListEl.innerHTML = tours
      .map((tour) => {
        const firstKeypoint = tour.first_keypoint
          ? `${escapeHtml(tour.first_keypoint.name)} (${tour.first_keypoint.latitude.toFixed(5)}, ${tour.first_keypoint.longitude.toFixed(5)})`
          : "Nema prve ključne tačke";
        return `
      <li class="tour-card">
        <div>
          <h3>${escapeHtml(tour.title)}</h3>
          <p>${escapeHtml(tour.description)}</p>
          <span class="badge">${tour.status}</span>
          <span class="meta">${formatDistance(tour.distance_km)}</span>
          <span class="meta">${formatDurations(tour.durations)}</span>
          <p class="meta">Prva tačka: ${firstKeypoint}</p>
        </div>
      </li>`;
      })
      .join("");
  } catch (err) {
    publicError.textContent = err.message;
    publicToursListEl.innerHTML = "";
  }
}

function renderEditor() {
  if (!currentTour) return;

  const keypoints = currentTour.keypoints || [];
  editorTitle.textContent = currentTour.title;
  editorStatus.textContent = `Status: ${currentTour.status} · ${keypoints.length} tačaka`;
  tourDistance.textContent = `Dužina ture: ${formatDistance(currentTour.distance_km)}`;
  tourTimestamps.textContent = formatTourTimestamps(currentTour);

  populateDurationForm();
  populatePriceForm();
  updateLifecycleButtons();
  renderKeypointsSidebar();
  tourMap.renderKeypoints(keypoints, selectedKeypointId);
}

async function refreshCurrentTour() {
  currentTour = await api.getTour(currentTour.id);
  renderEditor();
}

function populateDurationForm() {
  const durations = currentTour?.durations || [];
  Object.entries(durationInputs).forEach(([transportType, input]) => {
    const duration = durations.find((item) => item.transport_type === transportType);
    input.value = duration?.minutes || "";
  });
  durationError.textContent = "";
}

function populatePriceForm() {
  tourPriceInput.value =
    currentTour?.price != null && currentTour.price > 0 ? currentTour.price : "";
  priceError.textContent = "";
}

async function savePriceForm() {
  if (!currentTour) return;
  priceError.textContent = "";
  const price = Number(tourPriceInput.value);
  if (!Number.isFinite(price) || price <= 0) {
    priceError.textContent = "Unesi cenu veću od 0 pre objavljivanja.";
    return;
  }
  try {
    currentTour = await api.updateTour(currentTour.id, { price });
    renderEditor();
    setMapHint("Cena ture je sačuvana.", "success");
  } catch (err) {
    priceError.textContent = err.message;
  }
}

function updateLifecycleButtons() {
  const status = currentTour?.status;
  lifecycleError.textContent = "";
  lifecycleButtons.publish.classList.toggle("hidden", status !== "draft");
  lifecycleButtons.archive.classList.toggle("hidden", status !== "published");
  lifecycleButtons.reactivate.classList.toggle("hidden", status !== "archived");
}

function renderKeypointsSidebar() {
  const keypoints = currentTour?.keypoints || [];
  if (!keypoints.length) {
    keypointsListEl.innerHTML =
      "<li class='empty'>Nema ključnih tačaka. Klikni „Dodaj tačku”, pa klikni na mapu.</li>";
    return;
  }

  keypointsListEl.innerHTML = keypoints
    .map(
      (kp, index) => `
    <li class="keypoint-item${kp.id === selectedKeypointId ? " selected" : ""}" data-id="${kp.id}">
      <strong>${index + 1}. ${escapeHtml(kp.name)}</strong>
      <span>${kp.latitude.toFixed(5)}, ${kp.longitude.toFixed(5)}</span>
    </li>`,
    )
    .join("");

  keypointsListEl.querySelectorAll(".keypoint-item").forEach((item) => {
    item.addEventListener("click", () => selectKeypoint(item.dataset.id));
  });
}

function selectKeypoint(keypointId) {
  selectedKeypointId = keypointId;
  const kp = currentTour.keypoints.find((k) => k.id === keypointId);
  if (!kp) return;

  mapInteraction = "edit";
  formTitle.textContent = "Izmena ključne tačke";
  kpName.value = kp.name;
  kpDescription.value = kp.description;
  kpImageUrl.value = kp.image_url || "";
  kpLatitude.value = kp.latitude;
  kpLongitude.value = kp.longitude;
  formError.textContent = "";
  keypointForm.classList.remove("hidden");
  document.getElementById("btn-delete-keypoint").classList.remove("hidden");

  renderKeypointsSidebar();
  tourMap.renderKeypoints(currentTour.keypoints, selectedKeypointId);
  setMapHint("Izmeni podatke ili „Promeni poziciju” pa klikni novu lokaciju na mapi.", "info");
  tourMap.setMode("view");
}

function startAddKeypoint() {
  selectedKeypointId = null;
  mapInteraction = "add";
  tourMap.setMode("add");
  keypointForm.classList.add("hidden");
  setMapHint("Klikni na mapu da izabereš poziciju nove ključne tačke.", "active");
}

function startMoveKeypoint() {
  if (!selectedKeypointId) {
    alert("Prvo izaberi ključnu tačku sa liste.");
    return;
  }
  mapInteraction = "move";
  tourMap.setMode("move");
  setMapHint("Klikni na mapu da postaviš novu poziciju izabrane tačke.", "active");
}

function cancelMapMode() {
  mapInteraction = null;
  tourMap.setMode("view");
  setMapHint("Izaberi tačku sa liste ili dodaj novu.", "info");
}

function onMapPositionSelected(coords, mode) {
  if (mode === "add") {
    mapInteraction = "add";
    formTitle.textContent = "Nova ključna tačka";
    kpName.value = "";
    kpDescription.value = "";
    kpImageUrl.value = "";
    kpLatitude.value = coords.latitude.toFixed(6);
    kpLongitude.value = coords.longitude.toFixed(6);
    formError.textContent = "";
    keypointForm.classList.remove("hidden");
    document.getElementById("btn-delete-keypoint").classList.add("hidden");
    tourMap.setMode("view");
    setMapHint("Popuni naziv i opis, pa sačuvaj.", "info");
    return;
  }

  if (mode === "move" && selectedKeypointId) {
    kpLatitude.value = coords.latitude.toFixed(6);
    kpLongitude.value = coords.longitude.toFixed(6);
    tourMap.setMode("view");
    setMapHint("Nova pozicija postavljena. Sačuvaj izmene.", "success");
    mapInteraction = "edit";
  }
}

async function saveKeypointForm() {
  if (savingKeypoint) return;

  formError.textContent = "";
  const payload = {
    name: kpName.value.trim(),
    description: kpDescription.value.trim(),
    latitude: Number(kpLatitude.value),
    longitude: Number(kpLongitude.value),
    image_url: kpImageUrl.value.trim(),
  };

  if (!payload.name || !payload.description) {
    formError.textContent = "Naziv i opis su obavezni.";
    return;
  }

  savingKeypoint = true;
  try {
    if (mapInteraction === "add") {
      await api.addKeypoint(currentTour.id, payload);
    } else if (selectedKeypointId) {
      await api.updateKeypoint(currentTour.id, selectedKeypointId, payload);
    } else {
      formError.textContent = "Izaberi tačku ili dodaj novu preko mape.";
      return;
    }

    await refreshCurrentTour();
    keypointForm.classList.add("hidden");
    mapInteraction = null;
    setMapHint("Sačuvano.", "success");
  } catch (err) {
    formError.textContent = err.message;
  } finally {
    savingKeypoint = false;
  }
}

async function deleteSelectedKeypoint() {
  if (!selectedKeypointId) return;
  if (!confirm("Obrisati ovu ključnu tačku?")) return;

  try {
    await api.deleteKeypoint(currentTour.id, selectedKeypointId);
    selectedKeypointId = null;
    await refreshCurrentTour();
    keypointForm.classList.add("hidden");
    setMapHint("Tačka obrisana.", "success");
  } catch (err) {
    formError.textContent = err.message;
  }
}

async function saveDurationForm() {
  if (!currentTour) return;

  durationError.textContent = "";
  const durations = [];
  for (const [transportType, input] of Object.entries(durationInputs)) {
    const rawValue = input.value.trim();
    if (!rawValue) continue;

    const minutes = Number(rawValue);
    if (!Number.isInteger(minutes) || minutes <= 0) {
      durationError.textContent = "Vreme obilaska mora biti pozitivan broj minuta.";
      return;
    }

    durations.push({
      transport_type: transportType,
      minutes,
    });
  }

  try {
    currentTour = await api.updateTourDurations(currentTour.id, { durations });
    renderEditor();
    setMapHint("Vremena obilaska su sačuvana.", "success");
  } catch (err) {
    durationError.textContent = err.message;
  }
}

async function runLifecycleAction(action) {
  if (!currentTour) return;

  const actions = {
    publish: api.publishTour,
    archive: api.archiveTour,
    reactivate: api.reactivateTour,
  };
  const messages = {
    publish: "Tura je objavljena.",
    archive: "Tura je arhivirana.",
    reactivate: "Tura je ponovo aktivirana.",
  };

  lifecycleError.textContent = "";
  try {
    currentTour = await actions[action](currentTour.id);
    renderEditor();
    setMapHint(messages[action], "success");
  } catch (err) {
    lifecycleError.textContent = err.message;
  }
}

function resetEditor() {
  currentTour = null;
  selectedKeypointId = null;
  mapInteraction = null;
  keypointForm.classList.add("hidden");
  durationError.textContent = "";
  lifecycleError.textContent = "";
  if (tourMap) {
    tourMap.setMode("view");
  }
}

function formatDistance(distanceKm) {
  const distance = Number(distanceKm || 0);
  return `${distance.toFixed(2)} km`;
}

function formatDurations(durations = []) {
  if (!durations.length) {
    return "Nema definisanih vremena";
  }

  const labels = {
    walking: "peške",
    bicycle: "biciklom",
    car: "automobilom",
  };
  return durations
    .map((duration) => `${duration.minutes} min ${labels[duration.transport_type]}`)
    .join(", ");
}

function formatTourTimestamps(tour) {
  const parts = [];
  if (tour.published_at) {
    parts.push(`Objavljeno: ${formatDateTime(tour.published_at)}`);
  }
  if (tour.archived_at) {
    const label = tour.status === "archived" ? "Arhivirano" : "Poslednje arhiviranje";
    parts.push(`${label}: ${formatDateTime(tour.archived_at)}`);
  }
  return parts.join(" · ");
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("sr-RS");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

init();
