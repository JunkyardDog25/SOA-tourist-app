import { api } from "../api.js";
import { escapeHtml, getUserFromToken, showError } from "../utils.js";

let initialized = false;

export function initFollowersPage() {
  if (!initialized) {
    initialized = true;
    document.getElementById("follow-form").addEventListener("submit", followUser);
    document.getElementById("btn-load-following").addEventListener("click", loadFollowing);
    document.getElementById("btn-load-recommendations").addEventListener("click", loadRecommendations);
    document.getElementById("btn-load-followers").addEventListener("click", loadFollowers);
  }
  loadFollowing();
  loadRecommendations();
}

async function followUser(e) {
  e.preventDefault();
  const errEl = document.getElementById("follow-error");
  showError(errEl, "");
  try {
    await api.follow(document.getElementById("followee-id").value.trim());
    document.getElementById("followee-id").value = "";
    await loadFollowing();
    await loadRecommendations();
  } catch (err) {
    showError(errEl, err.message);
  }
}

async function loadFollowing() {
  const errEl = document.getElementById("following-error");
  const listEl = document.getElementById("following-list");
  showError(errEl, "");
  try {
    const ids = await api.getFollowing();
    listEl.innerHTML = ids.length
      ? ids
          .map(
            (id) => `
        <li class="list-row">
          <span>${escapeHtml(id)}</span>
          <button type="button" class="btn danger btn-sm" data-id="${id}">Prestani pratiti</button>
        </li>`,
          )
          .join("")
      : "<li class='empty'>Ne pratiš nikoga.</li>";

    listEl.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api.unfollow(btn.dataset.id);
          await loadFollowing();
        } catch (err) {
          showError(errEl, err.message);
        }
      });
    });
  } catch (err) {
    showError(errEl, err.message);
    listEl.innerHTML = "";
  }
}

async function loadRecommendations() {
  const errEl = document.getElementById("recommendations-error");
  const listEl = document.getElementById("recommendations-list");
  showError(errEl, "");
  try {
    const users = await api.getRecommendations();
    listEl.innerHTML = users.length
      ? users
          .map(
            (u) => `
        <li class="list-row">
          <div>
            <strong>${escapeHtml(u.username)}</strong>
            <span class="meta">${escapeHtml(u.email)} · ${escapeHtml(u.role)} · ID: ${escapeHtml(u.userId)}</span>
          </div>
          <button type="button" class="btn primary btn-sm" data-id="${u.userId}">Prati</button>
        </li>`,
          )
          .join("")
      : "<li class='empty'>Nema preporuka.</li>";

    listEl.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api.follow(btn.dataset.id);
          await loadFollowing();
          await loadRecommendations();
        } catch (err) {
          showError(errEl, err.message);
        }
      });
    });
  } catch (err) {
    showError(errEl, err.message);
    listEl.innerHTML = "";
  }
}

async function loadFollowers() {
  const errEl = document.getElementById("followers-error");
  const listEl = document.getElementById("followers-list");
  showError(errEl, "");
  const userId =
    document.getElementById("followers-user-id").value.trim() ||
    getUserFromToken()?.userId;

  if (!userId) {
    showError(errEl, "Unesi ID korisnika.");
    return;
  }

  try {
    const ids = await api.getFollowers(userId);
    listEl.innerHTML = ids.length
      ? ids.map((id) => `<li class="list-row"><span>${escapeHtml(id)}</span></li>`).join("")
      : "<li class='empty'>Nema pratioca.</li>";
  } catch (err) {
    showError(errEl, err.message);
    listEl.innerHTML = "";
  }
}
