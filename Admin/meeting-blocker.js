(function () {
  "use strict";

  var BLOCKER_STORAGE_KEY = "daa_meeting_blocker_v1";
  var BOOKINGS_STORAGE_KEY = "daa_meeting_bookings_v1";

  var defaultBlockerData = {
    settings: {
      slotDurationMinutes: 45,
      bufferMinutes: 15,
      minNoticeHours: 24,
      maxAdvanceDays: 60,
      meetingTitle: "1-on-1 German Consultation & Assessment",
      meetingLocation: "Online via Google Meet (Link sent upon confirmation)",
    },
    weeklySchedule: {
      Monday: { active: true, start: "09:00", end: "17:00" },
      Tuesday: { active: true, start: "09:00", end: "17:00" },
      Wednesday: { active: true, start: "09:00", end: "17:00" },
      Thursday: { active: true, start: "09:00", end: "17:00" },
      Friday: { active: true, start: "09:00", end: "15:00" },
      Saturday: { active: false, start: "10:00", end: "14:00" },
      Sunday: { active: false, start: "10:00", end: "14:00" },
    },
    blockedDates: [
      { date: "2026-10-31", reason: "Reformation Day / Public Holiday" },
      { date: "2026-11-01", reason: "All Saints' Day" },
      { date: "2026-12-24", reason: "Christmas Eve" },
      { date: "2026-12-25", reason: "Christmas Day" },
    ],
    blockedSlots: [
      { date: "2026-10-12", time: "14:00", reason: "Teacher Briefing" },
      { date: "2026-10-14", time: "10:00", reason: "Admin Maintenance" },
    ],
  };

  var defaultBookings = [
    {
      id: "booking-demo-1",
      date: "2026-10-15",
      time: "10:00",
      duration: 45,
      fullName: "Maria Santos",
      email: "maria.santos@example.com",
      phone: "+63 917 123 4567",
      topic: "Course Recommendation & Placement",
      notes: "Looking to take A1 in November for family visa application.",
      status: "confirmed",
      createdAt: "2026-09-18T10:30:00.000Z",
    },
  ];

  // State
  var blockerData = loadBlockerData();
  var bookings = loadBookings();

  // Calendar navigation state
  var today = new Date();
  var currentCalYear = today.getFullYear();
  var currentCalMonth = today.getMonth(); // 0-indexed
  var selectedDateStr = formatDateKey(today);

  // Pending slot block modal state
  var pendingSlotToBlock = null;

  function loadBlockerData() {
    try {
      var raw = localStorage.getItem(BLOCKER_STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaultBlockerData));
      var parsed = JSON.parse(raw);
      if (!parsed.weeklySchedule || !parsed.settings) {
        return JSON.parse(JSON.stringify(defaultBlockerData));
      }
      return parsed;
    } catch (e) {
      return JSON.parse(JSON.stringify(defaultBlockerData));
    }
  }

  function saveBlockerData() {
    localStorage.setItem(BLOCKER_STORAGE_KEY, JSON.stringify(blockerData));
    updateStats();
  }

  function loadBookings() {
    try {
      var raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      if (!raw) return defaultBookings.slice();
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : defaultBookings.slice();
    } catch (e) {
      return defaultBookings.slice();
    }
  }

  function saveBookings() {
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
    updateStats();
  }

  // Helper date formatting
  function formatDateKey(dateObj) {
    var y = dateObj.getFullYear();
    var m = String(dateObj.getMonth() + 1).padStart(2, "0");
    var d = String(dateObj.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function parseDateKey(keyStr) {
    var parts = keyStr.split("-");
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
  }

  function getWeekdayName(dateObj) {
    return dateObj.toLocaleDateString("en-US", { weekday: "long" });
  }

  function formatDisplayDate(dateKey) {
    var d = parseDateKey(dateKey);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function timeStrToMinutes(timeStr) {
    var parts = timeStr.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function minutesToTimeStr(mins) {
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  // Generate slots for a given date
  function generateSlotsForDate(dateKey) {
    var d = parseDateKey(dateKey);
    var weekday = getWeekdayName(d);
    var dayConfig = blockerData.weeklySchedule[weekday];

    if (!dayConfig || !dayConfig.active) {
      return [];
    }

    var startMin = timeStrToMinutes(dayConfig.start);
    var endMin = timeStrToMinutes(dayConfig.end);
    var duration = blockerData.settings.slotDurationMinutes || 45;
    var buffer = blockerData.settings.bufferMinutes || 15;
    var step = duration + buffer;

    var slots = [];
    var cur = startMin;

    var isDayFullyBlocked = blockerData.blockedDates.some(function (b) {
      return b.date === dateKey;
    });
    var dayBlockInfo = blockerData.blockedDates.find(function (b) {
      return b.date === dateKey;
    });

    while (cur + duration <= endMin) {
      var timeStr = minutesToTimeStr(cur);
      var endSlotTimeStr = minutesToTimeStr(cur + duration);

      var isSlotBlocked = blockerData.blockedSlots.some(function (s) {
        return s.date === dateKey && s.time === timeStr;
      });
      var slotBlockInfo = blockerData.blockedSlots.find(function (s) {
        return s.date === dateKey && s.time === timeStr;
      });

      var activeBooking = bookings.find(function (b) {
        return b.date === dateKey && b.time === timeStr && b.status !== "cancelled";
      });

      var status = "open";
      var reason = "";

      if (isDayFullyBlocked) {
        status = "blocked";
        reason = dayBlockInfo ? dayBlockInfo.reason || "Full day blocked" : "Day blocked";
      } else if (activeBooking) {
        status = "booked";
        reason = "Booked by " + activeBooking.fullName;
      } else if (isSlotBlocked) {
        status = "blocked";
        reason = slotBlockInfo ? slotBlockInfo.reason || "Blocked slot" : "Blocked";
      }

      slots.push({
        time: timeStr,
        endTime: endSlotTimeStr,
        status: status,
        reason: reason,
        booking: activeBooking || null,
      });

      cur += step;
    }

    return slots;
  }

  // UI Toast Banner
  function showBanner(message, type) {
    var banner = document.getElementById("status-banner");
    if (!banner) return;
    banner.className = "cms-banner " + (type || "success");
    banner.textContent = message;
    banner.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(function () {
      banner.style.display = "none";
    }, 4000);
  }

  // Update Stats Cards
  function updateStats() {
    var activeDays = 0;
    var totalHours = 0;
    Object.keys(blockerData.weeklySchedule).forEach(function (day) {
      var c = blockerData.weeklySchedule[day];
      if (c && c.active) {
        activeDays++;
        var s = timeStrToMinutes(c.start);
        var e = timeStrToMinutes(c.end);
        if (e > s) totalHours += (e - s) / 60;
      }
    });

    var statDays = document.getElementById("stat-working-days");
    if (statDays) statDays.textContent = activeDays + " days";

    var statHours = document.getElementById("stat-weekly-hours");
    if (statHours) statHours.textContent = "Approx. " + Math.round(totalHours) + " hours/week";

    var statBlockedDates = document.getElementById("stat-blocked-dates");
    if (statBlockedDates) statBlockedDates.textContent = blockerData.blockedDates.length;

    var statBlockedSlots = document.getElementById("stat-blocked-slots");
    if (statBlockedSlots) statBlockedSlots.textContent = blockerData.blockedSlots.length;

    var activeBookings = bookings.filter(function (b) {
      return b.status !== "cancelled";
    });
    var statBookings = document.getElementById("stat-bookings");
    if (statBookings) statBookings.textContent = activeBookings.length;

    var tabCount = document.getElementById("tab-bookings-count");
    if (tabCount) tabCount.textContent = activeBookings.length;
  }

  // TAB 1: RENDER CALENDAR
  function renderCalendar() {
    var grid = document.getElementById("cal-days-grid");
    var heading = document.getElementById("cal-month-heading");
    if (!grid || !heading) return;

    grid.textContent = "";

    var monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    heading.textContent = monthNames[currentCalMonth] + " " + currentCalYear;

    var firstDayOfMonth = new Date(currentCalYear, currentCalMonth, 1);
    var daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();

    // Monday=0 ... Sunday=6
    var startDayIdx = (firstDayOfMonth.getDay() + 6) % 7;

    // Leading empty cells
    for (var i = 0; i < startDayIdx; i++) {
      var emptyCell = document.createElement("div");
      emptyCell.className = "cal-cell empty";
      grid.appendChild(emptyCell);
    }

    var todayKey = formatDateKey(today);

    // Days of month
    for (var day = 1; day <= daysInMonth; day++) {
      var cellDate = new Date(currentCalYear, currentCalMonth, day);
      var dateKey = formatDateKey(cellDate);
      var weekday = getWeekdayName(cellDate);
      var dayConfig = blockerData.weeklySchedule[weekday];

      var cell = document.createElement("div");
      cell.className = "cal-cell";
      cell.dataset.date = dateKey;

      if (dateKey === todayKey) cell.classList.add("today");
      if (dateKey === selectedDateStr) cell.classList.add("selected");

      var numSpan = document.createElement("span");
      numSpan.className = "cal-cell-num";
      numSpan.textContent = day;
      cell.appendChild(numSpan);

      // Check status
      var isDayFullyBlocked = blockerData.blockedDates.some(function (b) {
        return b.date === dateKey;
      });

      var badge = document.createElement("span");
      badge.className = "cal-cell-badge";

      if (isDayFullyBlocked) {
        cell.classList.add("is-blocked");
        badge.className += " badge-blocked";
        badge.textContent = "Blocked";
        cell.appendChild(badge);
      } else if (!dayConfig || !dayConfig.active) {
        cell.classList.add("day-off");
        badge.style.color = "#888";
        badge.textContent = "Closed";
        cell.appendChild(badge);
      } else {
        var slots = generateSlotsForDate(dateKey);
        var openCount = 0;
        var blockedCount = 0;
        var bookedCount = 0;

        slots.forEach(function (s) {
          if (s.status === "open") openCount++;
          else if (s.status === "blocked") blockedCount++;
          else if (s.status === "booked") bookedCount++;
        });

        if (bookedCount > 0) {
          badge.className += " badge-booked";
          badge.textContent = bookedCount + " Booked";
          cell.appendChild(badge);
        } else if (blockedCount > 0 && openCount > 0) {
          badge.className += " badge-partial";
          badge.textContent = openCount + " open";
          cell.appendChild(badge);
        } else if (openCount > 0) {
          badge.className += " badge-open";
          badge.textContent = openCount + " open";
          cell.appendChild(badge);
        } else {
          badge.className += " badge-blocked";
          badge.textContent = "Full";
          cell.appendChild(badge);
        }
      }

      cell.addEventListener("click", function () {
        selectedDateStr = this.dataset.date;
        renderCalendar();
        renderDayInspector();
      });

      grid.appendChild(cell);
    }
  }

  // TAB 1: RENDER DAY INSPECTOR
  function renderDayInspector() {
    var titleElem = document.getElementById("inspector-date-str");
    var badgeContainer = document.getElementById("inspector-badge-container");
    var toggleBlockDay = document.getElementById("toggle-block-day");
    var fullDayReasonBox = document.getElementById("full-day-reason-box");
    var fullDayReasonInput = document.getElementById("full-day-reason");
    var fullDayCard = document.getElementById("full-day-card");
    var slotsGrid = document.getElementById("slots-grid");
    var slotCountsSummary = document.getElementById("slot-counts-summary");

    if (!titleElem || !slotsGrid) return;

    var selectedDate = parseDateKey(selectedDateStr);
    var weekday = getWeekdayName(selectedDate);
    var dayConfig = blockerData.weeklySchedule[weekday];

    titleElem.textContent = formatDisplayDate(selectedDateStr);

    var isDayFullyBlocked = blockerData.blockedDates.some(function (b) {
      return b.date === selectedDateStr;
    });
    var dayBlockItem = blockerData.blockedDates.find(function (b) {
      return b.date === selectedDateStr;
    });

    badgeContainer.textContent = "";
    if (isDayFullyBlocked) {
      badgeContainer.innerHTML = '<span class="cal-cell-badge badge-blocked" style="font-size: 0.8rem; padding: 4px 10px;">Full Day Blocked</span>';
    } else if (!dayConfig || !dayConfig.active) {
      badgeContainer.innerHTML = '<span class="cal-cell-badge" style="background: #e2ded5; color: #555; font-size: 0.8rem; padding: 4px 10px;">Weekly Day Off</span>';
    } else {
      badgeContainer.innerHTML = '<span class="cal-cell-badge badge-open" style="font-size: 0.8rem; padding: 4px 10px;">Regular Working Day</span>';
    }

    // Full day block card
    toggleBlockDay.checked = isDayFullyBlocked;
    if (isDayFullyBlocked) {
      fullDayCard.classList.add("is-blocked");
      fullDayReasonBox.style.display = "block";
      fullDayReasonInput.value = dayBlockItem ? dayBlockItem.reason || "" : "";
    } else {
      fullDayCard.classList.remove("is-blocked");
      fullDayReasonBox.style.display = "none";
      fullDayReasonInput.value = "";
    }

    // Slot generation
    slotsGrid.textContent = "";
    var slots = generateSlotsForDate(selectedDateStr);

    if (!dayConfig || !dayConfig.active) {
      slotsGrid.innerHTML = '<div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--slate); background: var(--cream); border-radius: 8px;">This day (' + weekday + ') is marked as non-working in your Weekly Base Schedule. You can enable it under the "Weekly Base Schedule" tab.</div>';
      slotCountsSummary.textContent = "0 available";
      return;
    }

    if (slots.length === 0) {
      slotsGrid.innerHTML = '<div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--slate);">No time slots fall within the working hours set for ' + weekday + '.</div>';
      slotCountsSummary.textContent = "0 available";
      return;
    }

    var openCount = 0;
    var blockedCount = 0;

    slots.forEach(function (slot) {
      if (slot.status === "open") openCount++;
      else blockedCount++;

      var card = document.createElement("div");
      card.className = "slot-card " + slot.status;

      var header = document.createElement("div");
      header.className = "slot-header";

      var timeSpan = document.createElement("span");
      timeSpan.className = "slot-time";
      timeSpan.textContent = slot.time + " - " + slot.endTime;

      var pill = document.createElement("span");
      pill.className = "slot-status-pill";
      pill.textContent = slot.status;

      header.append(timeSpan, pill);

      var reasonP = document.createElement("div");
      reasonP.className = "slot-reason";
      reasonP.textContent = slot.reason || (slot.status === "open" ? "Available for booking" : "");
      reasonP.title = slot.reason || "";

      var actionsDiv = document.createElement("div");
      actionsDiv.className = "slot-actions";

      var actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "btn-slot-toggle";

      if (slot.status === "open") {
        actionBtn.textContent = "Block Slot";
        actionBtn.addEventListener("click", function () {
          openBlockSlotModal(selectedDateStr, slot.time, slot.endTime);
        });
      } else if (slot.status === "blocked") {
        actionBtn.textContent = "Unblock Slot";
        actionBtn.addEventListener("click", function () {
          unblockSlot(selectedDateStr, slot.time);
        });
      } else if (slot.status === "booked") {
        actionBtn.textContent = "View Booking";
        actionBtn.style.borderColor = "var(--booked-blue)";
        actionBtn.style.color = "var(--booked-blue)";
        actionBtn.addEventListener("click", function () {
          switchToBookingsTab();
        });
      }

      actionsDiv.appendChild(actionBtn);
      card.append(header, reasonP, actionsDiv);
      slotsGrid.appendChild(card);
    });

    slotCountsSummary.textContent = openCount + " open · " + blockedCount + " blocked/booked";
  }

  // Full day block toggled
  document.getElementById("toggle-block-day").addEventListener("change", function () {
    var isChecked = this.checked;
    var reasonBox = document.getElementById("full-day-reason-box");
    var reasonInput = document.getElementById("full-day-reason");

    if (isChecked) {
      reasonBox.style.display = "block";
      var reason = reasonInput.value.trim() || "Full day blocked";
      // Add to blockedDates if not present
      if (!blockerData.blockedDates.some(function (b) { return b.date === selectedDateStr; })) {
        blockerData.blockedDates.push({ date: selectedDateStr, reason: reason });
      }
    } else {
      reasonBox.style.display = "none";
      blockerData.blockedDates = blockerData.blockedDates.filter(function (b) {
        return b.date !== selectedDateStr;
      });
    }

    saveBlockerData();
    renderCalendar();
    renderDayInspector();
    showBanner("Date availability updated.", "success");
  });

  document.getElementById("full-day-reason").addEventListener("change", function () {
    var newReason = this.value.trim();
    var item = blockerData.blockedDates.find(function (b) {
      return b.date === selectedDateStr;
    });
    if (item) {
      item.reason = newReason;
      saveBlockerData();
      renderDayInspector();
    }
  });

  // Modal to block a specific slot
  function openBlockSlotModal(dateKey, timeStr, endTimeStr) {
    pendingSlotToBlock = { date: dateKey, time: timeStr, endTime: endTimeStr };
    var modal = document.getElementById("block-reason-modal");
    var title = document.getElementById("modal-slot-title");
    var input = document.getElementById("slot-block-reason");
    title.textContent = formatDisplayDate(dateKey) + " at " + timeStr + " - " + endTimeStr;
    input.value = "";
    modal.hidden = false;
    input.focus();
  }

  document.getElementById("modal-cancel-btn").addEventListener("click", function () {
    document.getElementById("block-reason-modal").hidden = true;
    pendingSlotToBlock = null;
  });

  document.getElementById("modal-confirm-btn").addEventListener("click", function () {
    if (!pendingSlotToBlock) return;
    var reason = document.getElementById("slot-block-reason").value.trim() || "Blocked";

    // Remove existing if any
    blockerData.blockedSlots = blockerData.blockedSlots.filter(function (s) {
      return !(s.date === pendingSlotToBlock.date && s.time === pendingSlotToBlock.time);
    });

    blockerData.blockedSlots.push({
      date: pendingSlotToBlock.date,
      time: pendingSlotToBlock.time,
      reason: reason,
    });

    saveBlockerData();
    document.getElementById("block-reason-modal").hidden = true;
    pendingSlotToBlock = null;
    renderCalendar();
    renderDayInspector();
    showBanner("Time slot successfully blocked.", "success");
  });

  function unblockSlot(dateKey, timeStr) {
    // If the entire day is blocked, alert admin
    var isDayFullyBlocked = blockerData.blockedDates.some(function (b) {
      return b.date === dateKey;
    });
    if (isDayFullyBlocked) {
      if (confirm("The entire day is currently blocked. Would you like to unblock this whole day to make slots available?")) {
        blockerData.blockedDates = blockerData.blockedDates.filter(function (b) {
          return b.date !== dateKey;
        });
      } else {
        return;
      }
    }

    blockerData.blockedSlots = blockerData.blockedSlots.filter(function (s) {
      return !(s.date === dateKey && s.time === timeStr);
    });

    saveBlockerData();
    renderCalendar();
    renderDayInspector();
    showBanner("Time slot unblocked and marked available.", "success");
  }

  // TAB 2: WEEKLY SCHEDULE TABLE & SETTINGS
  var daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  function renderWeeklyScheduleTable() {
    var tbody = document.querySelector("#weekly-schedule-table tbody");
    if (!tbody) return;
    tbody.textContent = "";

    daysOrder.forEach(function (day) {
      var cfg = blockerData.weeklySchedule[day] || { active: false, start: "09:00", end: "17:00" };
      var tr = document.createElement("tr");

      // Active switch
      var tdActive = document.createElement("td");
      tdActive.innerHTML = '<label class="switch" style="transform: scale(0.85);"><input type="checkbox" data-day="' + day + '" class="weekly-toggle"' + (cfg.active ? " checked" : "") + '><span class="slider"></span></label>';

      // Day name
      var tdName = document.createElement("td");
      tdName.innerHTML = "<strong>" + day + "</strong>";

      // Start time
      var tdStart = document.createElement("td");
      tdStart.innerHTML = '<input type="time" data-day="' + day + '" class="weekly-start" value="' + cfg.start + '"' + (cfg.active ? "" : " disabled") + '>';

      // End time
      var tdEnd = document.createElement("td");
      tdEnd.innerHTML = '<input type="time" data-day="' + day + '" class="weekly-end" value="' + cfg.end + '"' + (cfg.active ? "" : " disabled") + '>';

      // Summary
      var tdSummary = document.createElement("td");
      tdSummary.className = "weekly-summary-cell";
      tdSummary.textContent = cfg.active ? (cfg.start + " - " + cfg.end) : "Day off (closed)";
      tdSummary.style.color = cfg.active ? "var(--forest)" : "var(--slate)";

      tr.append(tdActive, tdName, tdStart, tdEnd, tdSummary);
      tbody.appendChild(tr);
    });

    // Wire change listeners
    tbody.querySelectorAll(".weekly-toggle").forEach(function (chk) {
      chk.addEventListener("change", function () {
        var day = this.dataset.day;
        var row = this.closest("tr");
        var startInput = row.querySelector(".weekly-start");
        var endInput = row.querySelector(".weekly-end");
        var summary = row.querySelector(".weekly-summary-cell");
        startInput.disabled = !this.checked;
        endInput.disabled = !this.checked;
        summary.textContent = this.checked ? (startInput.value + " - " + endInput.value) : "Day off (closed)";
        summary.style.color = this.checked ? "var(--forest)" : "var(--slate)";
      });
    });
  }

  document.getElementById("btn-save-weekly").addEventListener("click", function () {
    var rows = document.querySelectorAll("#weekly-schedule-table tbody tr");
    rows.forEach(function (row) {
      var toggle = row.querySelector(".weekly-toggle");
      var day = toggle.dataset.day;
      var startVal = row.querySelector(".weekly-start").value || "09:00";
      var endVal = row.querySelector(".weekly-end").value || "17:00";

      blockerData.weeklySchedule[day] = {
        active: toggle.checked,
        start: startVal,
        end: endVal,
      };
    });

    saveBlockerData();
    renderCalendar();
    renderDayInspector();
    showBanner("Weekly schedule saved successfully.", "success");
  });

  function populateSettingsForm() {
    var s = blockerData.settings;
    if (!s) return;
    var durationSelect = document.getElementById("slot-duration");
    var bufferSelect = document.getElementById("buffer-time");
    var noticeSelect = document.getElementById("min-notice");
    var advanceSelect = document.getElementById("max-advance");
    var titleInput = document.getElementById("meeting-title");
    var locationInput = document.getElementById("meeting-location");

    if (durationSelect) durationSelect.value = String(s.slotDurationMinutes || 45);
    if (bufferSelect) bufferSelect.value = String(s.bufferMinutes !== undefined ? s.bufferMinutes : 15);
    if (noticeSelect) noticeSelect.value = String(s.minNoticeHours || 24);
    if (advanceSelect) advanceSelect.value = String(s.maxAdvanceDays || 60);
    if (titleInput) titleInput.value = s.meetingTitle || "";
    if (locationInput) locationInput.value = s.meetingLocation || "";
  }

  document.getElementById("btn-save-settings").addEventListener("click", function () {
    blockerData.settings = {
      slotDurationMinutes: parseInt(document.getElementById("slot-duration").value, 10),
      bufferMinutes: parseInt(document.getElementById("buffer-time").value, 10),
      minNoticeHours: parseInt(document.getElementById("min-notice").value, 10),
      maxAdvanceDays: parseInt(document.getElementById("max-advance").value, 10),
      meetingTitle: document.getElementById("meeting-title").value.trim(),
      meetingLocation: document.getElementById("meeting-location").value.trim(),
    };

    saveBlockerData();
    renderCalendar();
    renderDayInspector();
    showBanner("Consultation settings saved.", "success");
  });

  // TAB 3: BOOKINGS TABLE
  function renderBookingsTable() {
    var tbody = document.getElementById("bookings-list");
    if (!tbody) return;
    tbody.textContent = "";

    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--slate); padding: 32px;">No consultation bookings yet. When students book through the public scheduler, they will appear here.</td></tr>';
      return;
    }

    // Sort by date & time ascending
    var sorted = bookings.slice().sort(function (a, b) {
      var dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.time.localeCompare(b.time);
    });

    sorted.forEach(function (b) {
      var tr = document.createElement("tr");

      var tdDate = document.createElement("td");
      tdDate.innerHTML = '<strong>' + formatDisplayDate(b.date) + '</strong><br><span class="booking-time-badge">' + b.time + ' (' + (b.duration || 45) + 'm)</span>';

      var tdName = document.createElement("td");
      tdName.innerHTML = '<strong>' + escapeHtml(b.fullName) + '</strong>';

      var tdContact = document.createElement("td");
      tdContact.innerHTML = '<a href="mailto:' + encodeURIComponent(b.email) + '">' + escapeHtml(b.email) + '</a><br><small style="color: var(--slate);">' + escapeHtml(b.phone || "No phone") + '</small>';

      var tdTopic = document.createElement("td");
      tdTopic.innerHTML = '<strong>' + escapeHtml(b.topic || "General Consultation") + '</strong>' + (b.notes ? '<br><small style="color: var(--slate);">' + escapeHtml(b.notes) + '</small>' : "");

      var tdStatus = document.createElement("td");
      var statusColor = b.status === "confirmed" ? "var(--forest)" : (b.status === "cancelled" ? "var(--block-red)" : "var(--charcoal)");
      tdStatus.innerHTML = '<span style="font-weight: 700; text-transform: uppercase; font-size: 0.76rem; color: ' + statusColor + ';">' + escapeHtml(b.status) + '</span>';

      var tdActions = document.createElement("td");
      if (b.status !== "cancelled") {
        var cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "btn-cancel-booking";
        cancelBtn.textContent = "Cancel Booking";
        cancelBtn.addEventListener("click", function () {
          if (confirm("Cancel this consultation for " + b.fullName + " on " + b.date + " at " + b.time + "? This will restore the slot as available.")) {
            b.status = "cancelled";
            saveBookings();
            renderBookingsTable();
            renderCalendar();
            renderDayInspector();
            showBanner("Booking cancelled and slot reopened.", "info");
          }
        });
        tdActions.appendChild(cancelBtn);
      } else {
        tdActions.innerHTML = '<span style="font-size: 0.8rem; color: var(--slate);">Cancelled</span>';
      }

      tr.append(tdDate, tdName, tdContact, tdTopic, tdStatus, tdActions);
      tbody.appendChild(tr);
    });
  }

  function switchToBookingsTab() {
    var tabBtn = document.querySelector('.cms-tab-btn[data-tab="tab-bookings"]');
    if (tabBtn) tabBtn.click();
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Export Bookings CSV
  document.getElementById("btn-export-bookings").addEventListener("click", function () {
    if (bookings.length === 0) {
      alert("No bookings to export.");
      return;
    }
    var headers = ["ID", "Date", "Time", "Duration_Min", "Full_Name", "Email", "Phone", "Topic", "Notes", "Status", "Created_At"];
    var rows = bookings.map(function (b) {
      return [
        b.id,
        b.date,
        b.time,
        b.duration || 45,
        '"' + (b.fullName || "").replace(/"/g, '""') + '"',
        '"' + (b.email || "").replace(/"/g, '""') + '"',
        '"' + (b.phone || "").replace(/"/g, '""') + '"',
        '"' + (b.topic || "").replace(/"/g, '""') + '"',
        '"' + (b.notes || "").replace(/"/g, '""') + '"',
        b.status,
        b.createdAt || ""
      ].join(",");
    });

    var csvContent = "data:text/csv;charset=utf-8," + [headers.join(",")].concat(rows).join("\n");
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "deutsch-am-abend-bookings.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // TAB 4: BACKUP & DATA SYNC
  document.getElementById("btn-export-json").addEventListener("click", function () {
    var exportPayload = {
      blockerData: blockerData,
      bookings: bookings,
      exportedAt: new Date().toISOString(),
    };
    var blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "deutsch-am-abend-meeting-blocker.json";
    link.click();
    URL.revokeObjectURL(link.href);
    showBanner("Configuration JSON exported.", "success");
  });

  document.getElementById("import-json-file").addEventListener("change", function (event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var imported = JSON.parse(reader.result);
        if (imported.blockerData) {
          blockerData = imported.blockerData;
          if (Array.isArray(imported.bookings)) {
            bookings = imported.bookings;
          }
        } else if (imported.weeklySchedule && imported.settings) {
          blockerData = imported;
        } else {
          throw new Error("Invalid structure");
        }

        saveBlockerData();
        saveBookings();
        renderWeeklyScheduleTable();
        populateSettingsForm();
        renderCalendar();
        renderDayInspector();
        renderBookingsTable();
        showBanner("Blocker settings successfully imported!", "success");
      } catch (err) {
        alert("Failed to parse JSON file. Ensure this is a valid Deutsch am Abend meeting blocker backup.");
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  });

  document.getElementById("btn-reset-defaults").addEventListener("click", function () {
    if (confirm("Are you sure you want to reset all blocker data and weekly schedules to default settings?")) {
      blockerData = JSON.parse(JSON.stringify(defaultBlockerData));
      saveBlockerData();
      renderWeeklyScheduleTable();
      populateSettingsForm();
      renderCalendar();
      renderDayInspector();
      showBanner("Reset to default schedule completed.", "info");
    }
  });

  // Calendar Controls
  document.getElementById("btn-prev-month").addEventListener("click", function () {
    currentCalMonth--;
    if (currentCalMonth < 0) {
      currentCalMonth = 11;
      currentCalYear--;
    }
    renderCalendar();
  });

  document.getElementById("btn-next-month").addEventListener("click", function () {
    currentCalMonth++;
    if (currentCalMonth > 11) {
      currentCalMonth = 0;
      currentCalYear++;
    }
    renderCalendar();
  });

  document.getElementById("btn-today").addEventListener("click", function () {
    var now = new Date();
    currentCalYear = now.getFullYear();
    currentCalMonth = now.getMonth();
    selectedDateStr = formatDateKey(now);
    renderCalendar();
    renderDayInspector();
  });

  // Tabs logic
  var tabButtons = document.querySelectorAll(".cms-tab-btn");
  var tabPanels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      tabButtons.forEach(function (b) {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      tabPanels.forEach(function (p) {
        p.classList.remove("active");
      });

      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      var targetId = btn.dataset.tab;
      var targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add("active");
    });
  });

  // Init
  updateStats();
  renderWeeklyScheduleTable();
  populateSettingsForm();
  renderCalendar();
  renderDayInspector();
  renderBookingsTable();
})();
