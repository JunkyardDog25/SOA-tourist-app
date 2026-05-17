import { API_BASE_URL } from "./config.js";

function getToken() {
  return localStorage.getItem("jwt_token") || "";
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("jwt_token", token.trim());
  } else {
    localStorage.removeItem("jwt_token");
  }
}

export function hasToken() {
  return Boolean(getToken());
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Nema veze sa API-jem. Pokreni: docker compose up --build (api-gateway + tour-frontend), pa osveži stranicu (Ctrl+F5).",
    );
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!response.ok) {
    const message =
      typeof data?.detail === "string"
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((d) => d.msg || JSON.stringify(d)).join(", ")
          : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  getMyTours: () => request("/tours/my"),
  getTour: (tourId) => request(`/tours/${tourId}`),
  createTour: (body) =>
    request("/tours", { method: "POST", body: JSON.stringify(body) }),
  updateTour: (tourId, body) =>
    request(`/tours/${tourId}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteTour: (tourId) => request(`/tours/${tourId}`, { method: "DELETE" }),
  addKeypoint: (tourId, body) =>
    request(`/tours/${tourId}/keypoints`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateKeypoint: (tourId, keypointId, body) =>
    request(`/tours/${tourId}/keypoints/${keypointId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteKeypoint: (tourId, keypointId) =>
    request(`/tours/${tourId}/keypoints/${keypointId}`, { method: "DELETE" }),
};
