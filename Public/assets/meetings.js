(function () {
  "use strict";

  var BLOCKER_STORAGE_KEY = "daa_meeting_blocker_v1";
  var BOOKINGS_STORAGE_KEY = "daa_meeting_bookings_v1";
  var WEB3FORMS_KEY = "e8f3400a-a9bd-429f-9888-03d97f9b5c2c";

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

  var blockerData = loadBlockerData();
  var bookings = loadBookings();

  // Booking state machine
  var today = new Date();
  var currentMonth = today.getMonth();
  var currentYear = today.getFullYear();
  var selectedDateStr = null;
  var selectedSlot = null; // { time, endTime }
  var latestConfirmedBooking = null;

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

  function loadBookings() {
    try {
      var raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveBooking(newBooking) {
    bookings.push(newBooking);
    try {
      localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
    } catch (e) {
      console.warn("Storage write error", e);
    }
  }

  // Date utilities
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

  // Calculate available slots strictly filtering out blocked dates & blocked slots
  function getAvailableSlots(dateKey) {
    var d = parseDateKey(dateKey);
    var weekday = getWeekdayName(d);
    var dayConfig = blockerData.weeklySchedule[weekday];

    // Check if day is active
    if (!dayConfig || !dayConfig.active) return [];

    // Check if full day is blocked
    var isDayFullyBlocked = blockerData.blockedDates.some(function (b) {
      return b.date === dateKey;
    });
    if (isDayFullyBlocked) return [];

    // Check minimum notice hours
    var now = new Date();
    var minNoticeHours = blockerData.settings.minNoticeHours || 24;
    var earliestAllowedTime = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);

    var startMin = timeStrToMinutes(dayConfig.start);
    var endMin = timeStrToMinutes(dayConfig.end);
    var duration = blockerData.settings.slotDurationMinutes || 45;
    var buffer = blockerData.settings.bufferMinutes !== undefined ? blockerData.settings.bufferMinutes : 15;
    var step = duration + buffer;

    var openSlots = [];
    var cur = startMin;

    while (cur + duration <= endMin) {
      var timeStr = minutesToTimeStr(cur);
      var endTimeStr = minutesToTimeStr(cur + duration);

      // Check slot datetime vs minimum notice
      var slotDateObj = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        Math.floor(cur / 60),
        cur % 60,
        0
      );

      if (slotDateObj >= earliestAllowedTime) {
        // Check if individual slot is blocked in CMS
        var isSlotBlocked = blockerData.blockedSlots.some(function (s) {
          return s.date === dateKey && s.time === timeStr;
        });

        // Check if already booked
        var isBooked = bookings.some(function (b) {
          return b.date === dateKey && b.time === timeStr && b.status !== "cancelled";
        });

        if (!isSlotBlocked && !isBooked) {
          openSlots.push({
            time: timeStr,
            endTime: endTimeStr,
            duration: duration,
          });
        }
      }

      cur += step;
    }

    return openSlots;
  }

  // STEP NAVIGATION
  function setStep(stepNum) {
    [1, 2, 3, 4].forEach(function (num) {
      var view = document.getElementById("view-step-" + num);
      var indicator = document.getElementById("step-indicator-" + num);
      if (view) {
        view.classList.toggle("active", num === stepNum);
      }
      if (indicator) {
        indicator.classList.remove("active", "completed");
        if (num === stepNum) indicator.classList.add("active");
        else if (num < stepNum) indicator.classList.add("completed");
      }
    });

    window.scrollTo({ top: 300, behavior: "smooth" });
  }

  // STEP 1: CALENDAR RENDERING
  function renderCalendar() {
    var grid = document.getElementById("pub-cal-grid");
    var title = document.getElementById("pub-cal-month-title");
    if (!grid || !title) return;

    grid.textContent = "";

    var monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    title.textContent = monthNames[currentMonth] + " " + currentYear;

    var firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Monday=0 ... Sunday=6
    var startDayIdx = (firstDayOfMonth.getDay() + 6) % 7;

    // Leading empty cells
    for (var i = 0; i < startDayIdx; i++) {
      var emptyCell = document.createElement("div");
      emptyCell.className = "pub-cal-day empty";
      grid.appendChild(emptyCell);
    }

    var todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    var maxDays = blockerData.settings.maxAdvanceDays || 60;
    var maxDate = new Date(todayStart.getTime() + maxDays * 24 * 60 * 60 * 1000);

    for (var day = 1; day <= daysInMonth; day++) {
      var cellDate = new Date(currentYear, currentMonth, day);
      var dateKey = formatDateKey(cellDate);
      var weekday = getWeekdayName(cellDate);
      var dayConfig = blockerData.weeklySchedule[weekday];

      var cell = document.createElement("div");
      cell.className = "pub-cal-day";
      cell.dataset.date = dateKey;

      var numSpan = document.createElement("span");
      numSpan.className = "pub-cal-day-num";
      numSpan.textContent = day;
      cell.appendChild(numSpan);

      var isPast = cellDate < todayStart;
      var isTooFar = cellDate > maxDate;
      var isClosedDay = !dayConfig || !dayConfig.active;
      var isFullDayBlocked = blockerData.blockedDates.some(function (b) {
        return b.date === dateKey;
      });

      if (isPast || isTooFar) {
        cell.classList.add("past");
        var label = document.createElement("span");
        label.className = "pub-cal-day-label";
        label.textContent = "—";
        cell.appendChild(label);
      } else if (isFullDayBlocked) {
        cell.classList.add("blocked");
        var label = document.createElement("span");
        label.className = "pub-cal-day-label";
        label.textContent = "Blocked";
        cell.appendChild(label);
      } else if (isClosedDay) {
        cell.classList.add("closed");
        var label = document.createElement("span");
        label.className = "pub-cal-day-label";
        label.textContent = "Closed";
        cell.appendChild(label);
      } else {
        var openSlots = getAvailableSlots(dateKey);
        if (openSlots.length > 0) {
          cell.classList.add("available");
          if (dateKey === selectedDateStr) cell.classList.add("selected");

          var label = document.createElement("span");
          label.className = "pub-cal-day-label";
          label.textContent = openSlots.length + " open";
          cell.appendChild(label);

          cell.addEventListener("click", function () {
            selectedDateStr = this.dataset.date;
            renderCalendar();
            renderSlotsStep();
          });
        } else {
          cell.classList.add("blocked");
          var label = document.createElement("span");
          label.className = "pub-cal-day-label";
          label.textContent = "Full";
          cell.appendChild(label);
        }
      }

      grid.appendChild(cell);
    }
  }

  // STEP 2: RENDER TIME SLOTS
  function renderSlotsStep() {
    var dateDisplay = document.getElementById("step-2-date-display");
    var container = document.getElementById("pub-slots-container");
    if (!container || !selectedDateStr) return;

    dateDisplay.textContent = formatDisplayDate(selectedDateStr);
    container.textContent = "";

    var slots = getAvailableSlots(selectedDateStr);
    if (slots.length === 0) {
      container.innerHTML = '<div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--slate); background: var(--cream); border-radius: 8px;">No slots are currently available for this date. Please pick another day on the calendar.</div>';
      setStep(2);
      return;
    }

    slots.forEach(function (slot) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pub-slot-btn";

      var timeSpan = document.createElement("span");
      timeSpan.className = "pub-slot-time";
      timeSpan.textContent = slot.time;

      var durSpan = document.createElement("span");
      durSpan.className = "pub-slot-duration";
      durSpan.textContent = slot.duration + " mins (until " + slot.endTime + ")";

      btn.append(timeSpan, durSpan);

      btn.addEventListener("click", function () {
        selectedSlot = slot;
        renderDetailsStep();
      });

      container.appendChild(btn);
    });

    setStep(2);
  }

  // STEP 3: RENDER DETAILS STEP
  function renderDetailsStep() {
    var dtDisplay = document.getElementById("step-3-datetime-display");
    if (!dtDisplay || !selectedDateStr || !selectedSlot) return;

    dtDisplay.textContent = formatDisplayDate(selectedDateStr) + " at " + selectedSlot.time + " (" + selectedSlot.duration + " mins)";
    setStep(3);
  }

  // Navigation Back Buttons
  var btnBackTo1 = document.getElementById("btn-back-to-step-1");
  if (btnBackTo1) {
    btnBackTo1.addEventListener("click", function () {
      setStep(1);
    });
  }

  var btnBackTo2 = document.getElementById("btn-back-to-step-2");
  if (btnBackTo2) {
    btnBackTo2.addEventListener("click", function () {
      setStep(2);
    });
  }

  // FORM SUBMISSION
  var bookingForm = document.getElementById("consultation-booking-form");
  if (bookingForm) {
    bookingForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!bookingForm.checkValidity()) {
        bookingForm.reportValidity();
        return;
      }

      var name = document.getElementById("book-name").value.trim();
      var email = document.getElementById("book-email").value.trim();
      var phone = document.getElementById("book-phone").value.trim();
      var topic = document.getElementById("book-topic").value;
      var notes = document.getElementById("book-notes").value.trim();
      var submitBtn = document.getElementById("btn-submit-booking");
      var statusDiv = document.getElementById("booking-form-status");

      submitBtn.disabled = true;
      submitBtn.textContent = "Confirming Reservation...";
      statusDiv.className = "";
      statusDiv.textContent = "";

      var newBooking = {
        id: "consult-" + Date.now(),
        date: selectedDateStr,
        time: selectedSlot.time,
        duration: selectedSlot.duration,
        fullName: name,
        email: email,
        phone: phone,
        topic: topic,
        notes: notes,
        status: "confirmed",
        createdAt: new Date().toISOString(),
      };

      // Save locally
      saveBooking(newBooking);
      latestConfirmedBooking = newBooking;

      // Send email via Web3Forms API
      try {
        var payload = new FormData();
        payload.append("access_key", WEB3FORMS_KEY);
        payload.append("subject", "New 1-on-1 Consultation: " + name + " (" + selectedDateStr + " at " + selectedSlot.time + ")");
        payload.append("from_name", name);
        payload.append("email", email);
        payload.append(
          "message",
          [
            "NEW CONSULTATION BOOKING RECEIVED",
            "================================",
            "Learner Name: " + name,
            "Email: " + email,
            "Phone: " + phone,
            "Topic: " + topic,
            "Date: " + selectedDateStr + " (" + formatDisplayDate(selectedDateStr) + ")",
            "Time: " + selectedSlot.time + " - " + selectedSlot.endTime + " (" + selectedSlot.duration + " mins)",
            "Notes: " + (notes || "None provided"),
            "",
            "Sent from the Deutsch am Abend meeting scheduler.",
          ].join("\n")
        );

        await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          body: payload,
        });
      } catch (err) {
        console.warn("Notification submission fallback", err);
      }

      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm Consultation Reservation \u2192";
      bookingForm.reset();

      renderConfirmationStep();
    });
  }

  // STEP 4: CONFIRMATION & CALENDAR EXPORT
  function renderConfirmationStep() {
    if (!latestConfirmedBooking) return;

    var b = latestConfirmedBooking;
    var confDate = document.getElementById("conf-date");
    var confTime = document.getElementById("conf-time");
    var confName = document.getElementById("conf-name");
    var confTopic = document.getElementById("conf-topic");
    var confLocation = document.getElementById("conf-location");

    if (confDate) confDate.textContent = formatDisplayDate(b.date);
    if (confTime) confTime.textContent = b.time + " (" + b.duration + " minutes)";
    if (confName) confName.textContent = b.fullName;
    if (confTopic) confTopic.textContent = b.topic;
    if (confLocation) confLocation.textContent = blockerData.settings.meetingLocation || "Online via Google Meet";

    // Google Calendar Link
    var gcalBtn = document.getElementById("btn-add-gcal");
    if (gcalBtn) {
      var startDtStr = b.date.replace(/-/g, "") + "T" + b.time.replace(":", "") + "00";
      var endMinutes = timeStrToMinutes(b.time) + (b.duration || 45);
      var endSlotTime = minutesToTimeStr(endMinutes);
      var endDtStr = b.date.replace(/-/g, "") + "T" + endSlotTime.replace(":", "") + "00";

      var gcalTitle = encodeURIComponent(blockerData.settings.meetingTitle || "1-on-1 German Consultation");
      var gcalDetails = encodeURIComponent("Consultation for " + b.fullName + " on " + b.topic + ". Deutsch am Abend German Community.");
      var gcalLoc = encodeURIComponent(blockerData.settings.meetingLocation || "Online via Google Meet");

      gcalBtn.href = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + gcalTitle + "&dates=" + startDtStr + "/" + endDtStr + "&details=" + gcalDetails + "&location=" + gcalLoc;
    }

    // ICS File Download
    var icsBtn = document.getElementById("btn-download-ics");
    if (icsBtn) {
      icsBtn.onclick = function () {
        downloadIcs(b);
      };
    }

    setStep(4);
  }

  function downloadIcs(b) {
    var startDtStr = b.date.replace(/-/g, "") + "T" + b.time.replace(":", "") + "00";
    var endMinutes = timeStrToMinutes(b.time) + (b.duration || 45);
    var endSlotTime = minutesToTimeStr(endMinutes);
    var endDtStr = b.date.replace(/-/g, "") + "T" + endSlotTime.replace(":", "") + "00";

    var icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Deutsch am Abend//Meeting Scheduler//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      "UID:" + b.id + "@deutschamabend.org",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
      "DTSTART:" + startDtStr,
      "DTEND:" + endDtStr,
      "SUMMARY:" + (blockerData.settings.meetingTitle || "1-on-1 German Consultation"),
      "DESCRIPTION:Consultation with Deutsch am Abend advisor for " + b.fullName + " (" + b.topic + ").",
      "LOCATION:" + (blockerData.settings.meetingLocation || "Online via Google Meet"),
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    var blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "deutsch-am-abend-consultation.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  var btnBookAnother = document.getElementById("btn-book-another");
  if (btnBookAnother) {
    btnBookAnother.addEventListener("click", function () {
      selectedDateStr = null;
      selectedSlot = null;
      renderCalendar();
      setStep(1);
    });
  }

  // Month navigation
  var prevBtn = document.getElementById("pub-btn-prev");
  var nextBtn = document.getElementById("pub-btn-next");
  var todayBtn = document.getElementById("pub-btn-today");

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener("click", function () {
      var now = new Date();
      currentYear = now.getFullYear();
      currentMonth = now.getMonth();
      renderCalendar();
    });
  }

  // Initial Calendar Render
  renderCalendar();
})();
