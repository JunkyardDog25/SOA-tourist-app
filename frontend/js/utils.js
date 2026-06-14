export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("sr-RS");
}

export function formatDistance(distanceKm) {
  return `${Number(distanceKm || 0).toFixed(2)} km`;
}

export function formatDurations(durations = []) {
  if (!durations.length) return "Nema definisanih vremena";
  const labels = { walking: "peške", bicycle: "biciklom", car: "automobilom" };
  return durations
    .map((d) => `${d.minutes} min ${labels[d.transport_type] || d.transport_type}`)
    .join(", ");
}

export function parseJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getUserFromToken() {
  const token = localStorage.getItem("jwt_token");
  if (!token) return null;
  const claims = parseJwt(token);
  if (!claims) return null;
  return {
    userId: claims.userId || claims.sub,
    username: claims.sub,
    email: claims.email,
    roles: claims.roles || [],
  };
}

export function hasRole(role) {
  const user = getUserFromToken();
  if (!user) return false;
  const normalized = role.startsWith("ROLE_") ? role : `ROLE_${role}`;
  return user.roles.includes(normalized);
}

export function showError(el, message) {
  if (el) el.textContent = message || "";
}

export function renderJson(data) {
  return `<pre class="json-output">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
}
