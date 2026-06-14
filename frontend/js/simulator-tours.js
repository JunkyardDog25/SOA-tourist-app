/**
 * Nezavisan od ES modula — učitava ture u simulator padajući meni.
 * Radi čak i ako main.js moduli ne uspeju da se pokrenu.
 */
(function () {
  function esc(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isSimulatorVisible() {
    const section = document.querySelector('[data-page="simulator"]');
    return section && !section.classList.contains("hidden");
  }

  async function loadSimulatorTours() {
    if (!isSimulatorVisible()) return;

    const select = document.getElementById("sim-tour-select");
    const status = document.getElementById("sim-tour-status");
    const errEl = document.getElementById("sim-error");
    if (!select) return;

    const token = localStorage.getItem("jwt_token") || "";
    if (!token) {
      select.innerHTML = '<option value="">Prijavi se prvo</option>';
      if (status) status.textContent = "Niste prijavljeni — uloguj se kao TOURIST.";
      return;
    }

    select.innerHTML = '<option value="">Učitavanje tura...</option>';
    if (status) status.textContent = "Učitavanje objavljenih tura...";
    if (errEl) errEl.textContent = "";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(function () {
        controller.abort();
      }, 15000);

      const res = await fetch("/api/tours/published", {
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const body = await res.text();

      if (!res.ok) {
        let msg = "HTTP " + res.status;
        try {
          const parsed = JSON.parse(body);
          msg = parsed.detail || parsed.message || msg;
        } catch (_e) {
          if (body) msg = body;
        }
        throw new Error(msg);
      }

      let tours = [];
      if (body) {
        tours = JSON.parse(body);
      }
      if (!Array.isArray(tours)) {
        tours = [];
      }

      if (!tours.length) {
        select.innerHTML = '<option value="">Nema objavljenih tura</option>';
        if (status) {
          status.textContent = "Nema objavljenih tura — vodič mora kreirati i objaviti turu.";
        }
        return;
      }

      select.innerHTML =
        '<option value="">— Izaberi turu —</option>' +
        tours
          .map(function (tour) {
            const id = tour.id || "";
            const title = tour.title || "Bez naziva";
            return (
              '<option value="' + esc(id) + '">' + esc(title) + "</option>"
            );
          })
          .join("");

      if (status) {
        status.textContent = "Učitano " + tours.length + " objavljenih tura.";
      }
    } catch (err) {
      select.innerHTML = '<option value="">Greška pri učitavanju</option>';
      const msg =
        err.name === "AbortError"
          ? "Zahtev je istekao. Proveri docker compose up."
          : err.message || String(err);
      if (status) status.textContent = "Greška: " + msg;
      if (errEl) errEl.textContent = msg;
    }
  }

  window.refreshSimulatorTours = loadSimulatorTours;

  function scheduleLoad() {
    setTimeout(loadSimulatorTours, 80);
  }

  window.addEventListener("hashchange", scheduleLoad);
  window.addEventListener("load", scheduleLoad);

  document.addEventListener("click", function (e) {
    if (e.target.closest('.nav-link[data-page="simulator"]')) {
      scheduleLoad();
    }
    if (e.target.id === "btn-reload-location") {
      scheduleLoad();
    }
  });

  // Posmatraj kada se simulator sekcija prikaže (klik u meniju)
  var observer = new MutationObserver(function () {
    if (isSimulatorVisible()) {
      scheduleLoad();
    }
  });

  window.addEventListener("load", function () {
    var section = document.querySelector('[data-page="simulator"]');
    if (section) {
      observer.observe(section, { attributes: true, attributeFilter: ["class"] });
    }
    if (location.hash === "#simulator") {
      scheduleLoad();
    }
  });
})();
