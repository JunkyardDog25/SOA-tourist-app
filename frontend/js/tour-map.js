import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "./config.js";

export class TourMap {
  constructor(containerId, onMapPositionSelected) {
    this.onMapPositionSelected = onMapPositionSelected;
    this.mode = "view";
    this.map = L.map(containerId).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.routeLine = null;

    this.map.on("click", (event) => {
      if (this.mode === "add" || this.mode === "move") {
        this.onMapPositionSelected(
          {
            latitude: event.latlng.lat,
            longitude: event.latlng.lng,
          },
          this.mode,
        );
      }
    });
  }

  setMode(mode) {
    this.mode = mode;
    const container = this.map.getContainer();
    container.classList.remove("map-mode-add", "map-mode-move");
    if (mode === "add") {
      container.classList.add("map-mode-add");
    } else if (mode === "move") {
      container.classList.add("map-mode-move");
    }
  }

  renderKeypoints(keypoints, selectedId) {
    this.markersLayer.clearLayers();
    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }

    const latlngs = [];

    keypoints.forEach((kp, index) => {
      const latlng = [kp.latitude, kp.longitude];
      latlngs.push(latlng);

      const isSelected = kp.id === selectedId;
      const marker = L.marker(latlng, {
        icon: L.divIcon({
          className: `keypoint-marker${isSelected ? " selected" : ""}`,
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
      }).addTo(this.map);
    }

    if (latlngs.length === 1) {
      this.map.setView(latlngs[0], 14);
    } else if (latlngs.length > 1) {
      this.map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    }
  }

  invalidateSize() {
    setTimeout(() => this.map.invalidateSize(), 100);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
