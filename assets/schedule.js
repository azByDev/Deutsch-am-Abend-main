document.addEventListener("DOMContentLoaded", function () {
  var grid = document.getElementById("schedule-grid");
  var table = document.getElementById("schedule-table");
  if (!grid && !table) return;

  function applyFilter(selectedPace) {
    if (grid) {
      var cards = grid.querySelectorAll(".schedule-card");
      cards.forEach(function (card) {
        var cardPace = card.getAttribute("data-pace");
        if (selectedPace === "all" || cardPace === selectedPace) {
          card.classList.remove("is-hidden");
        } else {
          card.classList.add("is-hidden");
        }
      });
    }

    if (table) {
      var rows = table.querySelectorAll("tbody tr");
      rows.forEach(function (row) {
        var rowPace = row.getAttribute("data-pace");
        if (selectedPace === "all" || rowPace === selectedPace) {
          row.classList.remove("is-hidden");
        } else {
          row.classList.add("is-hidden");
        }
      });
    }
  }

  // 1. Interactive Schedule Filtering (5x, 3x, all)
  var filterContainer = document.getElementById("schedule-filters");
  if (filterContainer) {
    var filterButtons = filterContainer.querySelectorAll(".filter-pill");

    filterButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterButtons.forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");

        var selectedPace = btn.getAttribute("data-pace");
        applyFilter(selectedPace);
      });
    });

    // Apply the active filter on page load
    var activeBtn = filterContainer.querySelector(".filter-pill.active");
    if (activeBtn) {
      applyFilter(activeBtn.getAttribute("data-pace"));
    }
  }

  // 2. Course Selection Redirect & Highlight
  function scrollToAndHighlightCourse(course) {
    if (!course || !grid) return;

    // Find visible matching card for this course
    var targetCard = grid.querySelector('.schedule-card[data-course="' + course + '"]:not(.is-hidden)');

    // If not found in current tab, look for any matching card
    if (!targetCard) {
      targetCard = grid.querySelector('.schedule-card[data-course="' + course + '"]');
    }

    if (targetCard) {
      // If target card is hidden, switch filter to that card's pace
      if (targetCard.classList.contains("is-hidden")) {
        var cardPace = targetCard.getAttribute("data-pace") || "all";
        if (filterContainer) {
          var targetBtn = filterContainer.querySelector('.filter-pill[data-pace="' + cardPace + '"]');
          if (targetBtn) {
            var filterButtons = filterContainer.querySelectorAll(".filter-pill");
            filterButtons.forEach(function (b) { b.classList.remove("active"); });
            targetBtn.classList.add("active");
            applyFilter(cardPace);
          }
        }
      }

      // Smooth scroll to the target card
      var headerOffset = 90;
      var cardRect = targetCard.getBoundingClientRect();
      var targetPosition = cardRect.top + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: targetPosition,
        behavior: "smooth"
      });

      // Remove existing highlights
      grid.querySelectorAll(".schedule-card--highlighted").forEach(function (c) {
        c.classList.remove("schedule-card--highlighted");
      });

      // Trigger highlight animation
      setTimeout(function () {
        targetCard.classList.add("schedule-card--highlighted");
        setTimeout(function () {
          targetCard.classList.remove("schedule-card--highlighted");
        }, 2600);
      }, 350);
    } else {
      // Fallback: scroll to schedule section
      var scheduleSec = document.getElementById("schedule");
      if (scheduleSec) {
        scheduleSec.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  var selectCourseBtns = document.querySelectorAll(".btn-select-course");
  selectCourseBtns.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var course = btn.getAttribute("data-course");
      scrollToAndHighlightCourse(course);
    });
  });

  // Smooth scroll and highlight for #membership links
  var memberLinks = document.querySelectorAll('a[href="#membership"]');
  memberLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      var memberSec = document.getElementById("membership");
      if (memberSec) {
        e.preventDefault();
        memberSec.scrollIntoView({ behavior: "smooth", block: "start" });
        var memberCard = memberSec.querySelector(".membership-card");
        if (memberCard) {
          memberCard.classList.remove("membership-card--highlighted");
          setTimeout(function () {
            memberCard.classList.add("membership-card--highlighted");
            setTimeout(function () {
              memberCard.classList.remove("membership-card--highlighted");
            }, 2600);
          }, 400);
        }
      }
    });
  });

  // 3. Optional LocalStorage override support (from Admin panel if present)
  var raw = localStorage.getItem("daa_schedule_v1");
  if (!raw) return;
  var schedules;
  try {
    schedules = JSON.parse(raw);
  } catch (error) {
    return;
  }
  if (!Array.isArray(schedules) || schedules.length === 0) return;

  // If table exists, update table
  if (table) {
    var tbody = table.querySelector("tbody");
    if (tbody) {
      tbody.innerHTML = "";
      schedules.forEach(function (item) {
        var row = document.createElement("tr");
        var paceVal = item.pace || (item.days === "Mo - Fri" ? "5x" : "3x");
        row.setAttribute("data-pace", paceVal);

        var cellCourse = document.createElement("td");
        cellCourse.innerHTML = "<strong>" + (item.course || "") + "</strong>";
        row.appendChild(cellCourse);

        var cellPace = document.createElement("td");
        var paceTag = document.createElement("span");
        paceTag.className =
          "pace-tag pace-tag--" + (paceVal === "5x" ? "5x" : "3x");
        paceTag.textContent =
          paceVal === "5x" ? "5x/week" : "3x/week";
        cellPace.appendChild(paceTag);
        row.appendChild(cellPace);

        var cellDays = document.createElement("td");
        cellDays.textContent = item.days || "Flexible";
        row.appendChild(cellDays);

        var cellTimes = document.createElement("td");
        cellTimes.innerHTML = (item.times || "").replace(/\n/g, "<br />");
        row.appendChild(cellTimes);

        var cellDate = document.createElement("td");
        cellDate.innerHTML = (item.date || "").replace(/\n/g, "<br />");
        row.appendChild(cellDate);

        var cellReg = document.createElement("td");
        var link = document.createElement("a");
        link.href =
          "registration.html?course=" +
          encodeURIComponent(item.course) +
          "&pace=" +
          encodeURIComponent(paceVal);
        var badge = document.createElement("span");
        badge.className =
          "status-badge status-badge--" +
          (item.status === "open" ? "confirmed" : "forming");
        badge.textContent = item.status === "open" ? "Open" : "Register Interest";
        link.appendChild(badge);
        cellReg.appendChild(link);
        row.appendChild(cellReg);

        tbody.appendChild(row);
      });
    }
  }

  // If grid exists, update grid with customized schedule cards
  if (grid) {
    grid.innerHTML = "";
    schedules.forEach(function (item) {
      var paceVal = item.pace || (item.days === "Mo - Fri" ? "5x" : "3x");
      var card = document.createElement("div");
      card.className = "schedule-card";
      card.setAttribute("data-pace", paceVal);
      var courseName = item.course || "German Course";
      var levelParts = courseName.split(/[—·-]/);
      var levelCode = levelParts[0] ? levelParts[0].trim() : "Course";
      card.setAttribute("data-course", levelCode);
      var levelTitle = levelParts[1] ? levelParts[1].trim() : courseName;

      var isOpen = item.status === "open";
      var btnText = isOpen ? "Register for " + levelCode : "Register Interest";
      var price =
        levelCode === "B2"
          ? "₱27,000"
          : levelCode.indexOf("Exam") !== -1
          ? "Custom"
          : "₱18,000";

      var paceLabel = paceVal === "5x" ? "5x/week" : "3x/week";
      var paceSub = paceVal === "5x" ? "(Intensive)" : "(Semi-Intensive)";

      var timesHtml = (item.times || "Evening: 18:00 – 21:00").replace(
        /\n/g,
        "<br />"
      );
      var dateHtml = (item.date || "Forming Soon").replace(/\n/g, "<br />");

      var displayTitle = levelParts[1]
        ? levelCode + " · " + levelTitle
        : courseName;

      var priceHtml =
        price === "Custom"
          ? '<span class="schedule-price">Custom</span>'
          : '<span class="schedule-price">' +
            price +
            '</span> <span class="schedule-price-unit">/ course</span>';

      var btnClass =
        "schedule-pill-btn" + (isOpen ? " schedule-pill-btn--confirmed" : "");

      card.innerHTML =
        '<div class="schedule-card-header">' +
        '<h3 class="schedule-card-title">' +
        displayTitle +
        "</h3>" +
        '<div class="schedule-price-wrap">' +
        priceHtml +
        "</div>" +
        "</div>" +
        '<p class="schedule-card-desc">Build a strong foundation in German. This course covers essential vocabulary, basic grammar, and real-life communication skills for everyday situations.</p>' +
        '<div class="schedule-card-divider"></div>' +
        '<div class="schedule-details-row">' +
        '<div class="schedule-detail-col">' +
        '<div class="schedule-detail-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>' +
        '<div class="schedule-detail-text">' +
        '<div class="schedule-detail-label">Weekly Pace</div>' +
        '<span class="schedule-pace-pill">' +
        paceLabel +
        "</span>" +
        "</div>" +
        "</div>" +
        '<div class="schedule-detail-col">' +
        '<div class="schedule-detail-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M3 10h18"></path><path d="m9 16 2 2 4-4"></path></svg></div>' +
        '<div class="schedule-detail-text">' +
        '<div class="schedule-detail-label">Class Days</div>' +
        '<div class="schedule-detail-value">' +
        (item.days || "Flexible") +
        "</div>" +
        "</div>" +
        "</div>" +
        '<div class="schedule-detail-col">' +
        '<div class="schedule-detail-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>' +
        '<div class="schedule-detail-text">' +
        '<div class="schedule-detail-label">Times</div>' +
        '<div class="schedule-detail-value">' +
        timesHtml +
        "</div>" +
        "</div>" +
        "</div>" +
        "</div>" +
        '<div class="schedule-bottom-bar">' +
        '<div class="schedule-bottom-date">' +
        '<div class="schedule-bottom-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>' +
        '<div class="schedule-date-text">' +
        '<span class="schedule-date-label">Start / End Date</span>' +
        '<span class="schedule-date-value">' +
        dateHtml +
        "</span>" +
        "</div>" +
        "</div>" +
        '<a href="registration.html?course=' +
        encodeURIComponent(levelCode) +
        "&pace=" +
        encodeURIComponent(paceVal) +
        '" class="' +
        btnClass +
        '">' +
        btnText.toUpperCase() +
        "</a>" +
        "</div>";

      grid.appendChild(card);
    });
  }

  // Re-apply filter to update visibility of newly rendered items
  if (filterContainer) {
    var activeBtnDynamic = filterContainer.querySelector(".filter-pill.active");
    if (activeBtnDynamic) {
      applyFilter(activeBtnDynamic.getAttribute("data-pace"));
    }
  }
});
