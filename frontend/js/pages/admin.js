import { api } from "../api.js";
import { escapeHtml, showError } from "../utils.js";

let initialized = false;

export function initAdminPage() {
  if (!initialized) {
    initialized = true;
    document.getElementById("btn-reload-users").addEventListener("click", loadUsers);
  }
  loadUsers();
}

async function loadUsers() {
  const errEl = document.getElementById("admin-error");
  const listEl = document.getElementById("admin-users-list");
  showError(errEl, "");
  listEl.innerHTML = "<li class='loading'>Učitavanje...</li>";

  try {
    const users = await api.getAdminUsers();
    if (!users.length) {
      listEl.innerHTML = "<li class='empty'>Nema korisnika.</li>";
      return;
    }

    listEl.innerHTML = users
      .map(
        (u) => `
      <li class="list-row">
        <div>
          <strong>${escapeHtml(u.username)}</strong>
          <span class="meta">${escapeHtml(u.email)} · ${escapeHtml(u.role)}</span>
          ${u.blocked ? '<span class="badge badge-danger">Blokiran</span>' : ""}
        </div>
        <div class="row-actions">
          ${
            u.blocked
              ? `<button type="button" class="btn primary btn-sm" data-action="unblock" data-id="${u.id}">Odblokiraj</button>`
              : `<button type="button" class="btn danger btn-sm" data-action="block" data-id="${u.id}">Blokiraj</button>`
          }
        </div>
      </li>`,
      )
      .join("");

    listEl.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => toggleBlock(btn.dataset.id, btn.dataset.action === "block"));
    });
  } catch (err) {
    showError(errEl, err.message);
    listEl.innerHTML = "";
  }
}

async function toggleBlock(userId, blocked) {
  const errEl = document.getElementById("admin-error");
  showError(errEl, "");
  try {
    await api.blockUser(userId, blocked);
    await loadUsers();
  } catch (err) {
    showError(errEl, err.message);
  }
}
