(function () {
  "use strict";

  var STORAGE_KEY = "daa_events_v1";
  var defaultEvents = [
    {
      id: "consultation",
      title: "1-on-1 Consultation",
      date: "By Appointment",
      time: "Flexible · 45 mins",
      location: "online",
      theme: "consultation",
      description:
        "Speak directly with an instructor for assessment, exam advice, or course planning.",
      link: "meetings.html",
    },
    {
      id: "conversation-2026-10-10",
      title: "German Conversation Evening",
      date: "2026-10-10",
      time: "18:00-20:00",
      location: "online",
      theme: "conversation",
      description:
        "Practise everyday German in friendly small-group conversation circles.",
    },
    {
      id: "study-2026-10-24",
      title: "Study Skills Workshop",
      date: "2026-10-24",
      time: "14:00-16:00",
      location: "online",
      theme: "study",
      description:
        "Build a practical weekly routine for vocabulary, listening, speaking, and writing.",
    },
    {
      id: "meetup-2026-11-07",
      title: "Teacher and Learner Meet-up",
      date: "2026-11-07",
      time: "16:00-18:00",
      location: "quezon",
      theme: "community",
      description:
        "Meet the people behind the classes and share ideas for growing our community.",
    },
  ];
  var events = loadEvents();
  var form = document.getElementById("event-editor");
  var list = document.getElementById("event-list");
  var status = document.getElementById("editor-status");
  var listStatus = document.getElementById("list-status");
  var cancelButton = document.getElementById("cancel-edit");
  var editorPanel = document.getElementById("editor-panel");
  var openAddButton = document.getElementById("open-add-event");
  editorPanel.hidden = true;
  var scheduleStorageKey = "daa_schedule_v1";
  var scheduleDefaults = [
    {
      id: "a1",
      course: "A1",
      days: "Mo - Fri",
      times: "Morning batch: 08:00 - 11:00\nEvening batch: 18:00 - 21:00",
      date: "28 Sep 2026 - 27 Nov 2026",
      status: "open",
    },
    {
      id: "a2",
      course: "A2",
      days: "Flexible",
      times: "Morning / Afternoon / Evening\n(based on interest)",
      date: "Forming Soon",
      status: "forming",
    },
    {
      id: "b1",
      course: "B1",
      days: "Flexible",
      times: "Morning / Afternoon / Evening\n(based on interest)",
      date: "Forming Soon",
      status: "forming",
    },
    {
      id: "b2",
      course: "B2",
      days: "Flexible",
      times: "Morning / Afternoon / Evening\n(based on interest)",
      date: "Forming Soon",
      status: "forming",
    },
    {
      id: "exam-prep",
      course: "Exam Prep",
      days: "Flexible",
      times: "Based on interest",
      date: "Forming Soon",
      status: "forming",
    },
  ];
  var schedules = loadSchedules();
  var scheduleForm = document.getElementById("schedule-editor");
  var schedulePanel = document.getElementById("schedule-editor-panel");
  var scheduleList = document.getElementById("schedule-list");

  function loadSchedules() {
    try {
      var stored = JSON.parse(localStorage.getItem(scheduleStorageKey));
      return Array.isArray(stored) ? stored : scheduleDefaults.slice();
    } catch (error) {
      return scheduleDefaults.slice();
    }
  }
  function saveSchedules() {
    localStorage.setItem(scheduleStorageKey, JSON.stringify(schedules));
  }
  function renderSchedules() {
    scheduleList.textContent = "";
    schedules.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "cms-schedule-row";
      var course = document.createElement("strong");
      course.textContent = item.course;
      var days = document.createElement("span");
      days.textContent = item.days;
      var times = document.createElement("span");
      times.className = "schedule-times";
      times.textContent = item.times;
      var date = document.createElement("span");
      date.className = "schedule-date";
      date.textContent = item.date;
      var statusBadge = document.createElement("span");
      statusBadge.className = "schedule-status " + item.status;
      statusBadge.textContent =
        item.status === "open" ? "Open" : "Register Interest";
      var buttons = document.createElement("div");
      buttons.className = "cms-event-buttons";
      var edit = document.createElement("button");
      edit.type = "button";
      edit.title = "Edit schedule";
      edit.setAttribute("aria-label", "Edit " + item.course);
      edit.innerHTML =
        '<svg class="cms-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l10.8-10.8-4-4Z"/><path d="m13.5 6.5 4 4"/></svg>';
      edit.addEventListener("click", function () {
        editSchedule(item.id);
      });
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete-event";
      remove.title = "Delete schedule row";
      remove.setAttribute("aria-label", "Delete " + item.course);
      remove.innerHTML =
        '<svg class="cms-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>';
      remove.addEventListener("click", function () {
        schedules = schedules.filter(function (schedule) {
          return schedule.id !== item.id;
        });
        saveSchedules();
        renderSchedules();
      });
      buttons.append(edit, remove);
      row.append(course, days, times, date, statusBadge, buttons);
      scheduleList.appendChild(row);
    });
    document.getElementById("schedule-list-status").textContent =
      schedules.length +
      " schedule row" +
      (schedules.length === 1 ? "" : "s") +
      " saved.";
  }
  function resetScheduleForm() {
    scheduleForm.reset();
    document.getElementById("schedule-id").value = "";
    document.getElementById("schedule-form-heading").textContent =
      "Add schedule row";
    document.getElementById("save-schedule").textContent = "Save schedule";
    schedulePanel.hidden = true;
  }
  function editSchedule(id) {
    var item = schedules.find(function (schedule) {
      return schedule.id === id;
    });
    if (!item) return;
    document.getElementById("schedule-id").value = item.id;
    document.getElementById("schedule-course").value = item.course;
    document.getElementById("schedule-days").value = item.days;
    document.getElementById("schedule-times").value = item.times;
    document.getElementById("schedule-date").value = item.date;
    document.getElementById("schedule-status").value = item.status;
    document.getElementById("schedule-form-heading").textContent =
      "Edit schedule row";
    document.getElementById("save-schedule").textContent = "Update schedule";
    schedulePanel.hidden = false;
    schedulePanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  document
    .getElementById("open-add-schedule")
    .addEventListener("click", function () {
      resetScheduleForm();
      schedulePanel.hidden = false;
      document.getElementById("schedule-course").focus();
    });
  document
    .getElementById("cancel-schedule")
    .addEventListener("click", resetScheduleForm);
  scheduleForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!scheduleForm.checkValidity()) return scheduleForm.reportValidity();
    var id =
      document.getElementById("schedule-id").value ||
      document
        .getElementById("schedule-course")
        .value.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") +
        "-" +
        Date.now();
    var item = {
      id: id,
      course: document.getElementById("schedule-course").value.trim(),
      days: document.getElementById("schedule-days").value.trim(),
      times: document.getElementById("schedule-times").value.trim(),
      date: document.getElementById("schedule-date").value.trim(),
      status: document.getElementById("schedule-status").value,
    };
    var index = schedules.findIndex(function (schedule) {
      return schedule.id === id;
    });
    if (index >= 0) schedules[index] = item;
    else schedules.push(item);
    saveSchedules();
    renderSchedules();
    resetScheduleForm();
    document.getElementById("schedule-editor-status").textContent =
      index >= 0 ? "Schedule updated." : "Schedule added.";
  });
  renderSchedules();

  function loadEvents() {
    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(stored) ? stored : defaultEvents.slice();
    } catch (error) {
      return defaultEvents.slice();
    }
  }

  function saveEvents() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  function label(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatDate(value) {
    if (!value || isNaN(new Date(value + "T12:00:00").getTime())) {
      return value || "By Appointment";
    }
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value + "T12:00:00"));
  }

  function renderList() {
    list.textContent = "";
    if (!events.length) {
      listStatus.textContent =
        "No events yet. Add your first event on the left.";
      return;
    }
    listStatus.textContent =
      events.length + " event" + (events.length === 1 ? "" : "s") + " saved.";
    events
      .slice()
      .sort(function (a, b) {
        var aIsConsultation =
          a.id === "consultation" ||
          (a.title && a.title.toLowerCase().indexOf("consultation") !== -1);
        var bIsConsultation =
          b.id === "consultation" ||
          (b.title && b.title.toLowerCase().indexOf("consultation") !== -1);
        if (aIsConsultation && !bIsConsultation) return -1;
        if (!aIsConsultation && bIsConsultation) return 1;
        return (a.date || "").localeCompare(b.date || "");
      })
      .forEach(function (event) {
        var row = document.createElement("div");
        row.className = "cms-event-row";
        var details = document.createElement("div");
        details.className = "cms-event-details";
        var dateBlock = document.createElement("div");
        dateBlock.className = "cms-event-date-block";
        var date = document.createElement("span");
        date.className = "cms-event-date";
        date.textContent = formatDate(event.date);
        var time = document.createElement("span");
        time.className = "cms-event-time";
        time.textContent = event.time;
        dateBlock.append(date, time);
        var title = document.createElement("h3");
        title.textContent = event.title;
        var meta = document.createElement("div");
        meta.className = "cms-event-meta";
        meta.textContent =
          label(event.location) +
          " · " +
          label(event.theme) +
          " · " +
          event.description;
        details.append(title, meta);
        var buttons = document.createElement("div");
        buttons.className = "cms-event-buttons";
        var view = document.createElement("button");
        view.type = "button";
        view.setAttribute("aria-label", "View details for " + event.title);
        view.title = "Details";
        view.innerHTML =
          '<svg class="cms-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
        var edit = document.createElement("button");
        edit.type = "button";
        edit.setAttribute("aria-label", "Edit " + event.title);
        edit.title = "Edit";
        edit.innerHTML =
          '<svg class="cms-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l10.8-10.8-4-4Z"/><path d="m13.5 6.5 4 4"/></svg>';
        edit.addEventListener("click", function () {
          editEvent(event.id);
        });
        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "delete-event";
        remove.setAttribute("aria-label", "Delete " + event.title);
        remove.title = "Delete";
        remove.innerHTML =
          '<svg class="cms-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>';
        remove.addEventListener("click", function () {
          deleteEvent(event.id);
        });
        buttons.append(view, edit, remove);
        row.append(dateBlock, details, buttons);
        list.appendChild(row);
      });
  }

  function resetForm() {
    form.reset();
    document.getElementById("event-id").value = "";
    document.getElementById("form-heading").textContent = "Add event";
    document.getElementById("save-event").textContent = "Save event";
    editorPanel.hidden = true;
  }

  function editEvent(id) {
    var event = events.find(function (item) {
      return item.id === id;
    });
    if (!event) return;
    document.getElementById("event-id").value = event.id;
    document.getElementById("event-title").value = event.title;
    document.getElementById("event-date").value = event.date;
    document.getElementById("event-time").value = event.time;
    document.getElementById("event-location").value = event.location;
    document.getElementById("event-theme").value = event.theme;
    document.getElementById("event-description").value = event.description;
    document.getElementById("form-heading").textContent = "Edit event";
    document.getElementById("save-event").textContent = "Update event";
    editorPanel.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  openAddButton.addEventListener("click", function () {
    resetForm();
    editorPanel.hidden = false;
    document.getElementById("form-heading").textContent = "Add event";
    document.getElementById("save-event").textContent = "Save event";
    document.getElementById("event-title").focus();
  });

  function deleteEvent(id) {
    var event = events.find(function (item) {
      return item.id === id;
    });
    if (!event || !window.confirm("Delete " + event.title + "?")) return;
    events = events.filter(function (item) {
      return item.id !== id;
    });
    saveEvents();
    renderList();
    setStatus("Event deleted.", "success");
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.checkValidity()) return form.reportValidity();
    var id =
      document.getElementById("event-id").value ||
      document
        .getElementById("event-title")
        .value.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") +
        "-" +
        Date.now();
    var item = {
      id: id,
      title: document.getElementById("event-title").value.trim(),
      date: document.getElementById("event-date").value,
      time: document.getElementById("event-time").value.trim(),
      location: document.getElementById("event-location").value,
      theme: document.getElementById("event-theme").value,
      description: document.getElementById("event-description").value.trim(),
    };
    var existingIndex = events.findIndex(function (existing) {
      return existing.id === id;
    });
    if (existingIndex >= 0) events[existingIndex] = item;
    else events.push(item);
    saveEvents();
    renderList();
    resetForm();
    setStatus(
      existingIndex >= 0 ? "Event updated." : "Event added.",
      "success",
    );
  });

  cancelButton.addEventListener("click", resetForm);
  document
    .getElementById("export-events")
    .addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(events, null, 2)], {
        type: "application/json",
      });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "deutsch-am-abend-events.json";
      link.click();
      URL.revokeObjectURL(link.href);
    });
  document
    .getElementById("import-events")
    .addEventListener("change", function (event) {
      var file = event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var imported = JSON.parse(reader.result);
          if (
            !Array.isArray(imported) ||
            imported.some(function (item) {
              return !item.title || !item.date || !item.time;
            })
          )
            throw new Error("Invalid format");
          events = imported;
          saveEvents();
          renderList();
          setStatus("Events imported.", "success");
        } catch (error) {
          setStatus("That file is not a valid events export.", "error");
        }
        event.target.value = "";
      };
      reader.readAsText(file);
    });

  function setStatus(message, type) {
    status.textContent = message;
    status.className = "cms-status " + type;
  }

  renderList();
})();
