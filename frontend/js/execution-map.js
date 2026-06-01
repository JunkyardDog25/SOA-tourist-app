const DEFAULT_CENTER = [44.8176, 20.4569];
const DEFAULT_ZOOM = 13;

export class ExecutionMap {
  constructor(containerId) {
    this.map = L.map(containerId).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(this.map);

    this.keypointMarkers = new Map();
    this.routeLine = null;
    this.touristMarker = null;
  }

  clear() {
    this.keypointMarkers.forEach((m) => this.map.removeLayer(m));
    this.keypointMarkers.clear();
    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }
    if (this.touristMarker) {
      this.map.removeLayer(this.touristMarker);
      this.touristMarker = null;
    }
  }

  showTour(keypoints, visitedIds = new Set()) {
    this.clear();
    const latlngs = [];

    keypoints.forEach((kp, index) => {
      const lat = Number(kp.latitude);
      const lng = Number(kp.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      latlngs.push([lat, lng]);
      const done = visitedIds.has(kp.id);
      const marker = L.marker([lat, lng], {
        title: kp.name,
        opacity: done ? 0.55 : 1,
      })
        .addTo(this.map)
        .bindPopup(
          `<strong>${index + 1}. ${kp.name}</strong>${done ? "<br><em>Obilazeno</em>" : ""}`,
        );
      this.keypointMarkers.set(kp.id, marker);
    });

    if (latlngs.length > 1) {
      this.routeLine = L.polyline(latlngs, { color: "#2563eb", weight: 4 }).addTo(
        this.map,
      );
    }
    if (latlngs.length > 0) {
      this.map.fitBounds(latlngs, { padding: [40, 40] });
    }
  }

  showTouristPosition(lat, lng) {
    if (this.touristMarker) {
      this.map.removeLayer(this.touristMarker);
    }
    const icon = L.divIcon({
      className: "",
      html: '<div class="tourist-marker">T</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    this.touristMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(
      this.map,
    );
  }

  markKeypointVisited(keypointId) {
    const marker = this.keypointMarkers.get(keypointId);
    if (marker) {
      marker.setOpacity(0.55);
    }
  }
}
