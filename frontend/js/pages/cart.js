import { api } from "../api.js";
import { escapeHtml, formatDateTime, showError } from "../utils.js";

let initialized = false;

export function initCartPage() {
  if (!initialized) {
    initialized = true;
    document.getElementById("btn-reload-cart").addEventListener("click", loadCart);
    document.getElementById("btn-create-cart").addEventListener("click", createCart);
    document.getElementById("btn-checkout").addEventListener("click", checkout);
    document.getElementById("btn-reload-tokens").addEventListener("click", loadTokens);
  }
  loadCart();
  loadTokens();
}

async function createCart() {
  const errEl = document.getElementById("cart-error");
  showError(errEl, "");
  try {
    await api.createCart();
    await loadCart();
  } catch (err) {
    showError(errEl, err.message);
  }
}

async function loadCart() {
  const errEl = document.getElementById("cart-error");
  const listEl = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  showError(errEl, "");
  listEl.innerHTML = "<li class='loading'>Učitavanje...</li>";

  try {
    const cart = await api.getCart();
    totalEl.textContent = `${Number(cart.totalPrice || 0).toFixed(2)} RSD`;

    if (!cart.items?.length) {
      listEl.innerHTML = "<li class='empty'>Korpa je prazna.</li>";
      return;
    }

    listEl.innerHTML = cart.items
      .map(
        (item) => `
      <li class="list-row">
        <div>
          <strong>${escapeHtml(item.tourName)}</strong>
          <span class="meta">ID: ${escapeHtml(item.tourId)} · ${Number(item.price).toFixed(2)} RSD</span>
        </div>
        <button type="button" class="btn danger btn-sm" data-id="${item.tourId}">Ukloni</button>
      </li>`,
      )
      .join("");

    listEl.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api.removeFromCart(btn.dataset.id);
          await loadCart();
        } catch (err) {
          showError(errEl, err.message);
        }
      });
    });
  } catch (err) {
    showError(errEl, err.message);
    listEl.innerHTML = "";
    totalEl.textContent = "—";
  }
}

async function checkout() {
  const errEl = document.getElementById("cart-error");
  const resultEl = document.getElementById("checkout-result");
  showError(errEl, "");
  resultEl.innerHTML = "";

  try {
    const result = await api.checkout();
    resultEl.innerHTML = `<p class="success">Kupovina uspešna!</p>`;
    await loadCart();
    await loadTokens();
  } catch (err) {
    if (err.status === 409 && err.data?.invalidItems) {
      resultEl.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
    } else {
      showError(errEl, err.message);
    }
  }
}

async function loadTokens() {
  const errEl = document.getElementById("tokens-error");
  const listEl = document.getElementById("tokens-list");
  showError(errEl, "");
  listEl.innerHTML = "<li class='loading'>Učitavanje...</li>";

  try {
    const tokens = await api.getTokens();
    if (!tokens.length) {
      listEl.innerHTML = "<li class='empty'>Nema kupljenih tura.</li>";
      return;
    }

    listEl.innerHTML = tokens
      .map(
        (t) => `
      <li class="list-row">
        <div>
          <strong>${escapeHtml(t.tourName)}</strong>
          <span class="meta">${Number(t.price).toFixed(2)} RSD · ${formatDateTime(t.purchasedAt)}</span>
        </div>
      </li>`,
      )
      .join("");
  } catch (err) {
    showError(errEl, err.message);
    listEl.innerHTML = "";
  }
}
