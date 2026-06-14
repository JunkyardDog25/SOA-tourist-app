import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "./config.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export class ExecutionMap {
  constructor(containerId, { onPositionClick = null } = {}) {
    this.onPositionClick = onPositionClick;
    this.touristMarker = null;
    this.keypoints = [];
    this.map = L.map(containerId).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.routeLine = null;

    if (onPositionClick) {
      this.map.on("click", (event) => {
        onPositionClick({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      });
      this.map.getContainer().classList.add("map-mode-add");
    }

    this.map.on("click", () => {
      if (onPositionClick) {
        this.map.getContainer().classList.add("map-mode-add");
      }
    });
  }

  renderKeypoints(keypoints = []) {
    this.keypoints = keypoints;
    this.markersLayer.clearLayers();
    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }

    const latlngs = [];

    keypoints.forEach((kp, index) => {
      const latlng = [kp.latitude, kp.longitude];
      latlngs.push(latlng);

      const marker = L.marker(latlng, {
        icon: L.divIcon({
          className: "keypoint-marker",
          html: `<span>${index + 1}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      });

      marker.bindPopup(
        `<strong>${escapeHtml(kp.name)}</strong><br>${escapeHtml(kp.description || "")}`,
      );
      marker.addTo(this.markersLayer);
    });

    if (latlngs.length >= 2) {
      this.routeLine = L.polyline(latlngs, {
        color: "#2563eb",
        weight: 4,
        opacity: 0.85,
        dashArray: "8 6",
      }).addTo(this.map);
    }

    this.fitAll();
  }

  showTourist(latitude, longitude) {
    if (latitude == null || longitude == null) {
      this.clearTourist();
      return;
    }

    const latlng = [latitude, longitude];
    if (this.touristMarker) {
      this.touristMarker.setLatLng(latlng);
    } else {
      this.touristMarker = L.marker(latlng, {
        icon: L.divIcon({
          className: "tourist-marker",
          html: "<span>Ti</span>",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
        zIndexOffset: 1000,
      }).addTo(this.map);
      this.touristMarker.bindPopup("Tvoja trenutna lokacija");
    }
    this.fitAll();
  }

  clearTourist() {
    if (this.touristMarker) {
      this.map.removeLayer(this.touristMarker);
      this.touristMarker = null;
    }
  }

  clearKeypoints() {
    this.keypoints = [];
    this.markersLayer.clearLayers();
    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }
  }

  fitAll() {
    const latlngs = [];
    this.keypoints.forEach((kp) => latlngs.push([kp.latitude, kp.longitude]));
    if (this.touristMarker) {
      const pos = this.touristMarker.getLatLng();
      latlngs.push([pos.lat, pos.lng]);
    }

    if (latlngs.length === 1) {
      this.map.setView(latlngs[0], 14);
    } else if (latlngs.length > 1) {
      this.map.fitBounds(L.latLngBounds(latlngs), { padding: [48, 48] });
    }
  }

  invalidateSize() {
    setTimeout(() => {
      this.map.invalidateSize();
      this.fitAll();
    }, 100);
  }
}

export function nearestKeypoint(latitude, longitude, keypoints = []) {
  if (!keypoints.length || latitude == null || longitude == null) {
    return null;
  }

  let nearest = null;
  let minDist = Infinity;

  for (const kp of keypoints) {
    const dist = haversineKm(latitude, longitude, kp.latitude, kp.longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = { keypoint: kp, distanceKm: dist };
    }
  }

  return nearest;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
