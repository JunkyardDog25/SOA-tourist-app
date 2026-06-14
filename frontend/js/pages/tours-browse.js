import { api } from "../api.js";
import { ExecutionMap, nearestKeypoint } from "../execution-map.js";
import {
  escapeHtml,
  formatDateTime,
  formatDistance,
  formatDurations,
  getUserFromToken,
  hasRole,
  showError,
} from "../utils.js";

let initialized = false;
let selectedTourId = null;
let browseMap = null;

export function initBrowseToursPage() {
  if (!initialized) {
    initialized = true;
    document.getElementById("btn-reload-published").addEventListener("click", loadPublished);
    document.getElementById("btn-back-browse").addEventListener("click", () => {
      selectedTourId = null;
      browseMap = null;
      document.getElementById("browse-detail").classList.add("hidden");
      document.getElementById("browse-list-wrap").classList.remove("hidden");
    });
    document.getElementById("review-form").addEventListener("submit", submitReview);
    document.getElementById("btn-add-to-cart").addEventListener("click", addToCart);
    document.getElementById("btn-check-purchased").addEventListener("click", checkPurchased);
  }
  loadPublished();
}

async function loadPublished() {
  const errEl = document.getElementById("browse-error");
  const listEl = document.getElementById("published-list");
  showError(errEl, "");
  listEl.innerHTML = "<li class='loading'>Učitavanje...</li>";

  try {
    const published = await api.getPublishedTours();
    const tours = Array.isArray(published) ? published : [];
    if (!tours.length) {
      listEl.innerHTML = "<li class='empty'>Nema objavljenih tura.</li>";
      return;
    }

    listEl.innerHTML = tours
      .map(
        (t) => `
      <li class="list-row clickable" data-id="${t.id}">
        <div>
          <strong>${escapeHtml(t.title)}</strong>
          <p class="meta">${escapeHtml(t.description)}</p>
          <span class="badge">${t.status}</span>
          <span class="meta">${formatDistance(t.distance_km)} · ${Number(t.price || 0).toFixed(2)} RSD · ${t.keypoint_count ?? (t.first_keypoint ? 1 : 0)} tačaka</span>
        </div>
      </li>`,
      )
      .join("");

    listEl.querySelectorAll(".clickable").forEach((row) => {
      row.addEventListener("click", () => openTour(row.dataset.id));
    });
  } catch (err) {
    showError(errEl, err.message);
    listEl.innerHTML = "";
  }
}

async function openTour(tourId) {
  selectedTourId = tourId;
  const errEl = document.getElementById("browse-error");
  showError(errEl, "");

  try {
    const tour = await api.getTour(tourId);
    document.getElementById("browse-list-wrap").classList.add("hidden");
    document.getElementById("browse-detail").classList.remove("hidden");
    document.getElementById("browse-detail-title").textContent = tour.title;

    const keypoints = tour.keypoints || (tour.first_keypoint ? [tour.first_keypoint] : []);

    document.getElementById("browse-detail-body").innerHTML = `
      <p>${escapeHtml(tour.description)}</p>
      <p class="meta">Težina: ${escapeHtml(tour.difficulty)} · ${formatDistance(tour.distance_km)} · ${formatDurations(tour.durations)}</p>
      <p class="meta">Cena: <strong>${Number(tour.price || 0).toFixed(2)} RSD</strong></p>
      <p class="meta">Tagovi: ${(tour.tags || []).map(escapeHtml).join(", ") || "—"}</p>
      <h4>Mapa ture</h4>
      <div id="browse-execution-map"></div>
      <p id="browse-nearest" class="meta"></p>
      <h4>Ključne tačke (${keypoints.length})</h4>
      <ul class="simple-list">
        ${keypoints.map((kp, i) => `<li>${i + 1}. ${escapeHtml(kp.name)} — ${kp.latitude?.toFixed?.(5)}, ${kp.longitude?.toFixed?.(5)}</li>`).join("")}
      </ul>
    `;

    await renderBrowseMap(keypoints);

    document.getElementById("review-tour-id").value = tourId;
    document.getElementById("purchased-status").textContent = "";

    await loadReviews(tourId);
    await loadRating(tourId);

    const cartBtn = document.getElementById("btn-add-to-cart");
    cartBtn.classList.toggle("hidden", !hasRole("TOURIST"));
    document.getElementById("review-section").classList.toggle("hidden", !hasRole("TOURIST"));
  } catch (err) {
    showError(errEl, err.message);
  }
}

async function loadReviews(tourId) {
  const listEl = document.getElementById("reviews-list");
  try {
    const reviews = await api.getTourReviews(tourId);
    const userId = getUserFromToken()?.userId;

    listEl.innerHTML = reviews.length
      ? reviews
          .map(
            (r) => `
        <li class="comment-item">
          <p><strong>${r.rating}/5</strong> — ${escapeHtml(r.comment)}</p>
          <p class="meta">${escapeHtml(r.tourist_username || r.tourist_id)} · poseta: ${r.visit_date} · ${formatDateTime(r.comment_date)}</p>
          ${
            userId === r.tourist_id
              ? `<button type="button" class="btn ghost btn-sm btn-edit-review" data-id="${r.id}">Izmeni</button>
                 <button type="button" class="btn ghost btn-sm btn-del-review" data-id="${r.id}">Obriši</button>`
              : ""
          }
        </li>`,
          )
          .join("")
      : "<li class='empty'>Nema recenzija.</li>";

    listEl.querySelectorAll(".btn-del-review").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Obrisati recenziju?")) return;
        try {
          await api.deleteReview(btn.dataset.id);
          await loadReviews(tourId);
          await loadRating(tourId);
        } catch (err) {
          alert(err.message);
        }
      });
    });

    listEl.querySelectorAll(".btn-edit-review").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const review = reviews.find((r) => r.id === btn.dataset.id);
        if (!review) return;
        const rating = prompt("Nova ocena (1-5):", review.rating);
        if (!rating) return;
        const comment = prompt("Novi komentar:", review.comment);
        if (comment === null) return;
        try {
          await api.updateReview(review.id, {
            rating: Number(rating),
            comment: comment.trim(),
          });
          await loadReviews(tourId);
          await loadRating(tourId);
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    listEl.innerHTML = `<li class='error'>${escapeHtml(err.message)}</li>`;
  }
}

async function loadRating(tourId) {
  try {
    const rating = await api.getTourRating(tourId);
    document.getElementById("tour-rating").textContent =
      `Prosečna ocena: ${Number(rating.average_rating || 0).toFixed(1)} (${rating.total_reviews} recenzija)`;
  } catch {
    document.getElementById("tour-rating").textContent = "";
  }
}

async function submitReview(e) {
  e.preventDefault();
  if (!selectedTourId) return;
  const errEl = document.getElementById("review-error");
  showError(errEl, "");

  try {
    await api.createReview({
      tour_id: selectedTourId,
      rating: Number(document.getElementById("review-rating").value),
      comment: document.getElementById("review-comment").value.trim(),
      visit_date: document.getElementById("review-visit-date").value,
      images: document
        .getElementById("review-images")
        .value.split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    document.getElementById("review-form").reset();
    document.getElementById("review-tour-id").value = selectedTourId;
    await loadReviews(selectedTourId);
    await loadRating(selectedTourId);
  } catch (err) {
    showError(errEl, err.message);
  }
}

async function addToCart() {
  if (!selectedTourId) return;
  const errEl = document.getElementById("browse-error");
  showError(errEl, "");
  try {
    const tour = await api.getTour(selectedTourId);
    await api.addToCart({
      tourId: tour.id,
      tourName: tour.title,
      price: tour.price || 0,
    });
    alert("Tura dodata u korpu.");
  } catch (err) {
    showError(errEl, err.message);
  }
}

async function checkPurchased() {
  if (!selectedTourId) return;
  const statusEl = document.getElementById("purchased-status");
  try {
    const res = await api.checkPurchased(selectedTourId);
    statusEl.textContent = res.purchased ? "Kupljeno ✓" : "Nije kupljeno";
    statusEl.className = res.purchased ? "success" : "meta";
    if (res.purchased) {
      await openTour(selectedTourId);
    }
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = "error";
  }
}

async function renderBrowseMap(keypoints) {
  if (!keypoints.length) return;

  browseMap = new ExecutionMap("browse-execution-map");
  browseMap.renderKeypoints(keypoints);
  browseMap.invalidateSize();

  if (hasRole("TOURIST")) {
    try {
      const loc = await api.getTouristLocation();
      if (loc.latitude != null) {
        browseMap.showTourist(loc.latitude, loc.longitude);
        const nearest = nearestKeypoint(loc.latitude, loc.longitude, keypoints);
        if (nearest) {
          document.getElementById("browse-nearest").innerHTML =
            `Najbliža tačka: <strong>${escapeHtml(nearest.keypoint.name)}</strong> (${nearest.distanceKm.toFixed(2)} km).`;
        }
      } else {
        document.getElementById("browse-nearest").textContent =
          "Lokacija nije postavljena.";
      }
    } catch {
      document.getElementById("browse-nearest").textContent = "";
    }
  }
}
