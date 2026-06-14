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

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Zahtev je istekao (${path}). Proveri da li su servisi pokrenuti.`);
    }
    throw new Error(
      "Nema veze sa API-jem. Pokreni: docker compose up --build, pa osveži stranicu (Ctrl+F5).",
    );
  } finally {
    clearTimeout(timeoutId);
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
      data = { detail: text, message: text };
    }
  }

  if (!response.ok) {
    const message =
      typeof data?.detail === "string"
        ? data.detail
        : typeof data?.message === "string"
          ? data.message
          : typeof data?.error === "string"
            ? data.error
            : Array.isArray(data?.detail)
              ? data.detail
                  .map((d) => {
                    const loc = Array.isArray(d.loc) ? d.loc.join(".") : "";
                    return d.msg ? `${loc}: ${d.msg}`.trim() : JSON.stringify(d);
                  })
                  .join("; ")
              : `HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  register: (body) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  getAdminUsers: () => request("/auth/admin/users"),
  blockUser: (id, blocked) =>
    request(`/auth/admin/users/${id}/block?blocked=${blocked}`, { method: "PATCH" }),

  // Stakeholders
  getProfile: () => request("/stakeholders/me"),
  updateProfile: (body) =>
    request("/stakeholders/me", { method: "PATCH", body: JSON.stringify(body) }),

  // Blog
  getBlogs: () => request("/blogs/"),
  getBlog: (blogId) => request(`/blogs/${blogId}`),
  createBlog: (body) =>
    request("/blogs/create", { method: "POST", body: JSON.stringify(body) }),
  addComment: (blogId, body) =>
    request(`/blogs/${blogId}/comments`, { method: "POST", body: JSON.stringify(body) }),
  updateComment: (blogId, commentId, body) =>
    request(`/blogs/${blogId}/comments/${commentId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  likeBlog: (blogId) => request(`/blogs/${blogId}/likes`, { method: "POST" }),
  unlikeBlog: (blogId) => request(`/blogs/${blogId}/likes`, { method: "DELETE" }),

  // Followers
  follow: (followeeId) =>
    request("/followers/follow", {
      method: "POST",
      body: JSON.stringify({ followeeId }),
    }),
  unfollow: (followeeId) =>
    request(`/followers/follow/${followeeId}`, { method: "DELETE" }),
  getFollowing: () => request("/followers/follow/following"),
  getFollowers: (userId) => request(`/followers/follow/followers/${userId}`),
  getRecommendations: () => request("/followers/follow/recommendations"),

  // Tours
  getMyTours: () => request("/tours/my"),
  getPublishedTours: () => request("/tours/published"),
  getTour: (tourId) => request(`/tours/${tourId}`),
  createTour: (body) =>
    request("/tours", { method: "POST", body: JSON.stringify(body) }),
  updateTour: (tourId, body) =>
    request(`/tours/${tourId}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteTour: (tourId) => request(`/tours/${tourId}`, { method: "DELETE" }),
  updateTourDurations: (tourId, body) =>
    request(`/tours/${tourId}/durations`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  publishTour: (tourId) => request(`/tours/${tourId}/publish`, { method: "POST" }),
  archiveTour: (tourId) => request(`/tours/${tourId}/archive`, { method: "POST" }),
  reactivateTour: (tourId) =>
    request(`/tours/${tourId}/reactivate`, { method: "POST" }),
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

  // Reviews
  createReview: (body) =>
    request("/reviews", { method: "POST", body: JSON.stringify(body) }),
  getTourReviews: (tourId) => request(`/reviews/tour/${tourId}`),
  getTourRating: (tourId) => request(`/reviews/tour/${tourId}/rating`),
  updateReview: (reviewId, body) =>
    request(`/reviews/${reviewId}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteReview: (reviewId) => request(`/reviews/${reviewId}`, { method: "DELETE" }),

  // Simulator
  getTouristLocation: () => request("/simulator/location"),
  setTouristLocation: (body) =>
    request("/simulator/location", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  // Tour execution (evidencija obilaska)
  getExecutionProgress: (tourId) => request(`/execution/${tourId}/progress`),
  checkExecutionPosition: (tourId, body) =>
    request(`/execution/${tourId}/check-position`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  markKeypointVisited: (tourId, keypointId) =>
    request(`/execution/${tourId}/keypoints/${keypointId}/visit`, { method: "POST" }),

  // Purchase
  createCart: () => request("/purchases/cart", { method: "POST" }),
  getCart: () => request("/purchases/cart"),
  addToCart: (body) =>
    request("/purchases/cart/items", { method: "POST", body: JSON.stringify(body) }),
  removeFromCart: (tourId) =>
    request(`/purchases/cart/items/${tourId}`, { method: "DELETE" }),
  checkout: () => request("/purchases/cart/checkout", { method: "POST" }),
  getTokens: () => request("/purchases/tokens"),
  checkPurchased: (tourId) => request(`/purchases/tokens/check/${tourId}`),
};
