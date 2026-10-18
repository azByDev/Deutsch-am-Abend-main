(function () {
  "use strict";

  var buttons = document.querySelectorAll(".admin-nav [data-view]");
  var panels = document.querySelectorAll("[data-view-panel]");
  var heading = document.getElementById("view-heading");
  var titleByView = {
    home: "Dashboard overview",
    events: "Events & Courses",
    blocker: "Meeting Blocker",
    availability: "Teacher Availability",
  };

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      var view = button.dataset.view;
      buttons.forEach(function (item) {
        item.removeAttribute("aria-current");
      });
      button.setAttribute("aria-current", "page");
      panels.forEach(function (panel) {
        panel.hidden = panel.dataset.viewPanel !== view;
        if (panel.dataset.viewPanel === view) {
          var frame = panel.querySelector("iframe[data-src]");
          if (frame && !frame.hasAttribute("src")) frame.src = frame.dataset.src;
        }
      });
      heading.textContent = titleByView[view];
    });
  });

  document.querySelectorAll("iframe[data-src]").forEach(function (frame) {
    frame.addEventListener("load", function () {
      frame.contentDocument.body.classList.add("embed");
    });
  });

  var toggle = document.getElementById("sidebar-toggle");
  toggle.addEventListener("click", function () {
    var collapsed = document.body.classList.toggle("sidebar-collapsed");
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
  });

  function showCount(id, value) {
    document.getElementById(id).textContent = String(value);
  }

  async function loadStats() {
    var status = document.getElementById("dashboard-status");
    try {
      var config = window.DAAMeetingSync;
      var events = JSON.parse(localStorage.getItem("daa_events_v1") || "null");
      showCount("stat-events", Array.isArray(events) ? events.length : 4);
      if (!config || !config.isConfigured()) {
        throw new Error("Configure the Supabase project URL and anon key to load shared meeting statistics.");
      }
      var blocker = await config.loadBlockerData();
      if (blocker) blocker = config.normalizeBlockerData(blocker);
      var bookings = await config.loadBookings();
      showCount(
        "stat-meetings",
        bookings.filter(function (booking) {
          return booking.status === "confirmed" && booking.date >= new Date().toISOString().slice(0, 10);
        }).length,
      );
      showCount("stat-dates", blocker ? blocker.blockedDates.length : "—");
      showCount("stat-slots", blocker ? blocker.blockedSlots.length : "—");
      status.textContent = "Meeting data is shared through Supabase.";
    } catch (error) {
      status.textContent = error.message || "Could not load dashboard statistics.";
    }
  }

  if (window.DAA_ADMIN_AUTHORIZED) {
    loadStats();
  } else {
    window.addEventListener("daa-admin-authorized", loadStats, { once: true });
  }
})();
