document.addEventListener("DOMContentLoaded", function () {
  renderManagedEvents();
  var toggles = document.querySelectorAll(".event-toggle");
  var forms = document.querySelectorAll(".event-form");
  var accessKey = "e8f3400a-a9bd-429f-9888-03d97f9b5c2c";
  var locationFilter = document.getElementById("event-location");
  var dateFilter = document.getElementById("event-date");
  var themeFilter = document.getElementById("event-theme");
  var onlineOnly = document.getElementById("online-only");
  var eventCards = document.querySelectorAll(".event-card");
  var eventsList = document.getElementById("events-list");

  function filterEvents() {
    eventCards.forEach(function (card) {
      var locationMatches =
        locationFilter.value === "all" ||
        card.dataset.location === locationFilter.value;
      var dateMatches =
        dateFilter.value === "all" || card.dataset.date === dateFilter.value;
      var themeMatches =
        themeFilter.value === "all" || card.dataset.theme === themeFilter.value;
      var onlineMatches =
        !onlineOnly.checked || card.dataset.location === "online";
      card.hidden = !(
        locationMatches &&
        dateMatches &&
        themeMatches &&
        onlineMatches
      );
    });
  }

  [locationFilter, dateFilter, themeFilter, onlineOnly].forEach(
    function (control) {
      if (control) control.addEventListener("change", filterEvents);
    },
  );

  if (eventsList) {
    eventsList.addEventListener("click", function (event) {
      var toggle = event.target.closest(".event-toggle");
      if (!toggle) return;
      var card = toggle.closest(".event-card");
      var shell = card && card.querySelector(".event-form-shell");
      if (!shell) return;
      var isOpen = !shell.hidden;
      shell.hidden = isOpen;
      toggle.setAttribute("aria-expanded", String(!isOpen));
      toggle.textContent = "Register";
      if (!isOpen) {
        var firstInput = shell.querySelector("input");
        if (firstInput) firstInput.focus();
      }
    });
  }

  forms.forEach(function (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var formData = new FormData(form);
      var status = form.querySelector(".form-status");
      var button = form.querySelector('button[type="submit"]');
      var email = formData.get("email");
      var fullName =
        formData.get("full_name") ||
        formData.get("Full_name") ||
        "Not provided";
      var eventName = form.dataset.event;
      button.disabled = true;
      status.className = "form-status";
      status.textContent = "Sending your registration...";
      try {
        var payload = new FormData();
        payload.append("access_key", accessKey);
        payload.append("subject", "Event registration: " + eventName);
        payload.append("from_name", fullName);
        payload.append("email", email);
        payload.append(
          "message",
          [
            "NEW COMMUNITY EVENT REGISTRATION",
            "===============================",
            "Event: " + eventName,
            "Full name: " + fullName,
            "Email: " + email,
            "",
            "Sent from the Deutsch am Abend events page.",
          ].join("\n"),
        );
        var response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          body: payload,
        });
        var result = await response.json();
        if (!result.success) throw new Error("Submission failed");
        status.className = "form-status success";
        status.textContent =
          "You are registered for " +
          eventName +
          ". We will email the joining details to " +
          email +
          ".";
        form.reset();
      } catch (error) {
        status.className = "form-status error";
        status.textContent =
          "We could not complete the registration. Please try again or contact info@deutschamabend.org.";
      } finally {
        button.disabled = false;
      }
    });
  });

  function bindToggle(toggle) {
    toggle.addEventListener("click", function () {
      var shell = toggle.nextElementSibling;
      var isOpen = !shell.hidden;
      shell.hidden = isOpen;
      toggle.setAttribute("aria-expanded", String(!isOpen));
      toggle.textContent = "Register";
      if (!isOpen) shell.querySelector("input").focus();
    });
  }

  function bindForm(form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var formData = new FormData(form);
      var status = form.querySelector(".form-status");
      var button = form.querySelector('button[type="submit"]');
      var email = formData.get("email");
      var fullName =
        formData.get("full_name") ||
        formData.get("Full_name") ||
        "Not provided";
      var eventName = form.dataset.event;
      button.disabled = true;
      status.className = "form-status";
      status.textContent = "Sending your registration...";
      try {
        var payload = new FormData();
        payload.append("access_key", accessKey);
        payload.append("subject", "Event registration: " + eventName);
        payload.append("from_name", fullName);
        payload.append("email", email);
        payload.append(
          "message",
          [
            "NEW COMMUNITY EVENT REGISTRATION",
            "===============================",
            "Event: " + eventName,
            "Full name: " + fullName,
            "Email: " + email,
            "",
            "Sent from the Deutsch am Abend events page.",
          ].join("\n"),
        );
        var response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          body: payload,
        });
        var result = await response.json();
        if (!result.success) throw new Error("Submission failed");
        status.className = "form-status success";
        status.textContent =
          "You are registered for " +
          eventName +
          ". We will email the joining details to " +
          email +
          ".";
        form.reset();
      } catch (error) {
        status.className = "form-status error";
        status.textContent =
          "We could not complete the registration. Please try again or contact info@deutschamabend.org.";
      } finally {
        button.disabled = false;
      }
    });
  }

  function renderManagedEvents() {
    var raw = localStorage.getItem("daa_events_v1");
    if (!raw) return;
    var managedEvents;
    try {
      managedEvents = JSON.parse(raw);
    } catch (error) {
      return;
    }
    if (!Array.isArray(managedEvents)) return;
    var list = document.getElementById("events-list");
    if (!list) return;
    list.textContent = "";
    managedEvents
      .sort(function (a, b) {
        return a.date.localeCompare(b.date);
      })
      .forEach(function (event) {
        var card = document.createElement("article");
        card.className = "event-card";
        card.dataset.location = event.location;
        card.dataset.date =
          event.date.slice(0, 7) === "2026-10" ? "october" : "november";
        card.dataset.theme = event.theme;
        card.innerHTML =
          '<div><span class="event-date"></span><span class="event-time"></span></div><div><h2></h2><p class="event-meta"><strong></strong> &nbsp;|&nbsp; Deutsch am Abend community<br /><span class="event-location"></span> · <span class="event-description"></span></p></div><button class="btn btn-secondary event-toggle" type="button" aria-expanded="false">Register <span aria-hidden="true">→</span></button><div class="event-form-shell" hidden><h3>Register for this event</h3><form class="event-form"><div class="field"><label>Email address *</label><input name="email" type="email" required autocomplete="email" /></div><div class="field"><label>Full Name *</label><input name="full_name" type="text" maxlength="40" placeholder="Juan dela Cruz" required /></div><button class="btn btn-primary" type="submit">Send registration</button><div class="form-status" role="status"></div></form></div>';
        card.querySelector(".event-date").textContent = formatManagedDate(
          event.date,
        );
        card.querySelector(".event-time").textContent = event.time;
        card.querySelector("h2").textContent = event.title;
        card.querySelector("strong").textContent = titleCase(event.theme);
        card.querySelector(".event-location").textContent = titleCase(
          event.location,
        );
        card.querySelector(".event-description").textContent =
          event.description;
        card.querySelector(".event-form").dataset.event = event.title;
        list.appendChild(card);
      });
    list.querySelectorAll(".event-form").forEach(bindForm);
  }

  function formatManagedDate(value) {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value + "T12:00:00"));
  }

  function titleCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
});
