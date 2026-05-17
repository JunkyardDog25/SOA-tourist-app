import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "./config.js";

export class SimulatorMap {
  constructor(containerId, onPositionClick) {
    this.onPositionClick = onPositionClick;
    this.marker = null;
    this.map = L.map(containerId).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(this.map);

    this.map.on("click", (event) => {
      this.onPositionClick({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    });
  }

  showPosition(latitude, longitude) {
    const latlng = [latitude, longitude];
    if (this.marker) {
      this.marker.setLatLng(latlng);
    } else {
      this.marker = L.marker(latlng, {
        icon: L.divIcon({
          className: "tourist-marker",
          html: "<span>Ti</span>",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
      }).addTo(this.map);
      this.marker.bindPopup("Tvoja trenutna lokacija");
    }
    this.map.setView(latlng, Math.max(this.map.getZoom(), 14));
  }

  clearPosition() {
    if (this.marker) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
  }

  invalidateSize() {
    setTimeout(() => this.map.invalidateSize(), 100);
  }
}
