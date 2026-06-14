import { hasToken, setToken } from "./api.js";
import { getUserFromToken, hasRole } from "./utils.js";

export const NAV_ITEMS = [
  { id: "auth", label: "Prijava", always: true },
  { id: "profile", label: "Profil", auth: true },
  { id: "browse", label: "Ture (turista)", auth: true },
  { id: "cart", label: "Korpa", auth: true, role: "TOURIST" },
  { id: "guide", label: "Ture (vodič)", auth: true, role: "GUIDE" },
  { id: "blog", label: "Blog", auth: true },
  { id: "followers", label: "Pratioci", auth: true },
  { id: "simulator", label: "Simulator", auth: true, role: "TOURIST" },
  { id: "admin", label: "Admin", auth: true, role: "ADMIN" },
];

const pageInits = {};

export function registerPage(id, initFn) {
  pageInits[id] = initFn;
}

function resolvePageId(pageId) {
  const item = NAV_ITEMS.find((n) => n.id === pageId);
  if (!item) {
    return hasToken() ? "browse" : "auth";
  }
  if (item.auth && !hasToken()) {
    return "auth";
  }
  if (item.role && !hasRole(item.role)) {
    return hasToken() ? "browse" : "auth";
  }
  return pageId;
}

function showPage(pageId) {
  const resolved = resolvePageId(pageId);

  document.querySelectorAll(".page-section").forEach((el) => {
    el.classList.toggle("hidden", el.dataset.page !== resolved);
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === resolved);
  });

  updateUserBar();

  const init = pageInits[resolved];
  if (init) init();
}

export function navigate(pageId) {
  const resolved = resolvePageId(pageId);
  const current = location.hash.replace("#", "");

  if (current !== resolved) {
    location.hash = resolved;
  }
  showPage(resolved);
}

export function renderNav() {
  const nav = document.getElementById("main-nav");
  nav.innerHTML = NAV_ITEMS.filter((item) => {
    if (item.always) return true;
    if (!item.auth || !hasToken()) return false;
    if (item.role && !hasRole(item.role)) return false;
    return true;
  })
    .map(
      (item) =>
        `<a href="#${item.id}" class="nav-link" data-page="${item.id}">${item.label}</a>`,
    )
    .join("");

  nav.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(link.dataset.page);
    });
  });
}

function updateUserBar() {
  const userBar = document.getElementById("user-bar");
  const user = getUserFromToken();

  if (!user || !hasToken()) {
    userBar.innerHTML = '<span class="meta">Niste prijavljeni</span>';
    return;
  }

  const roles = (user.roles || []).map((r) => r.replace("ROLE_", "")).join(", ");
  userBar.innerHTML = `
    <span><strong>${user.username}</strong> (${roles})</span>
    <button type="button" id="btn-global-logout" class="btn ghost btn-sm">Odjava</button>
  `;
  document.getElementById("btn-global-logout")?.addEventListener("click", () => {
    setToken("");
    renderNav();
    navigate("auth");
  });
}

export function initRouter() {
  renderNav();

  window.addEventListener("hashchange", () => {
    const page = location.hash.replace("#", "") || (hasToken() ? "browse" : "auth");
    showPage(page);
  });

  const initial = location.hash.replace("#", "") || (hasToken() ? "browse" : "auth");
  navigate(initial);
}
