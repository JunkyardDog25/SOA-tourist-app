import { api, setToken } from "../api.js";
import { navigate, renderNav } from "../router.js";
import { showError } from "../utils.js";

let initialized = false;

export function initAuthPage() {
  if (initialized) return;
  initialized = true;

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("login-error");
    showError(errEl, "");
    try {
      const res = await api.login({
        email: document.getElementById("login-email").value.trim(),
        password: document.getElementById("login-password").value,
      });
      setToken(res.token);
      renderNav();
      navigate("browse");
    } catch (err) {
      showError(errEl, err.message);
    }
  });

  document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("register-error");
    showError(errEl, "");
    try {
      const res = await api.register({
        username: document.getElementById("reg-username").value.trim(),
        email: document.getElementById("reg-email").value.trim(),
        password: document.getElementById("reg-password").value,
        role: document.getElementById("reg-role").value,
      });
      setToken(res.token);
      renderNav();
      navigate("profile");
    } catch (err) {
      showError(errEl, err.message);
    }
  });

  document.getElementById("token-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const errEl = document.getElementById("token-error");
    showError(errEl, "");
    const token = document.getElementById("manual-token").value.trim();
    if (!token) {
      showError(errEl, "Unesi token.");
      return;
    }
    setToken(token);
    renderNav();
    navigate("browse");
  });
}
