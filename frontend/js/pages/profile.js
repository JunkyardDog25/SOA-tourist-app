import { api } from "../api.js";
import { escapeHtml, formatDateTime, showError } from "../utils.js";

let initialized = false;

export function initProfilePage() {
  if (!initialized) {
    initialized = true;
    document.getElementById("profile-form").addEventListener("submit", saveProfile);
    document.getElementById("btn-reload-profile").addEventListener("click", loadProfile);
  }
  loadProfile();
}

async function loadProfile() {
  const errEl = document.getElementById("profile-error");
  const outEl = document.getElementById("profile-output");
  showError(errEl, "");
  outEl.innerHTML = "<p class='loading'>Učitavanje...</p>";

  try {
    const profile = await api.getProfile();
    document.getElementById("profile-first").value = profile.firstName || "";
    document.getElementById("profile-last").value = profile.lastName || "";
    document.getElementById("profile-image").value = profile.profileImageUrl || "";
    document.getElementById("profile-bio").value = profile.biography || "";
    outEl.innerHTML = `
      <p><strong>Korisničko ime:</strong> ${escapeHtml(profile.username)}</p>
      <p><strong>Email:</strong> ${escapeHtml(profile.email)}</p>
    `;
  } catch (err) {
    showError(errEl, err.message);
    outEl.innerHTML = "";
  }
}

async function saveProfile(e) {
  e.preventDefault();
  const errEl = document.getElementById("profile-error");
  showError(errEl, "");
  try {
    const profile = await api.updateProfile({
      firstName: document.getElementById("profile-first").value.trim(),
      lastName: document.getElementById("profile-last").value.trim(),
      profileImageUrl: document.getElementById("profile-image").value.trim(),
      biography: document.getElementById("profile-bio").value.trim(),
    });
    document.getElementById("profile-output").innerHTML = `
      <p class="success">Profil sačuvan (${formatDateTime(new Date())}).</p>
      <p><strong>Korisničko ime:</strong> ${escapeHtml(profile.username)}</p>
      <p><strong>Email:</strong> ${escapeHtml(profile.email)}</p>
    `;
  } catch (err) {
    showError(errEl, err.message);
  }
}
