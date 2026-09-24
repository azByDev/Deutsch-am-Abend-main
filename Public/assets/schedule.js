document.addEventListener("DOMContentLoaded", function () {
  var table = document.getElementById("schedule-table");
  if (!table) return;

  // 1. Interactive Schedule Filtering (All, 5x, 3x)
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
        var rows = table.querySelectorAll("tbody tr");
        rows.forEach(function (row) {
          var rowPace = row.getAttribute("data-pace");
          if (selectedPace === "all" || rowPace === selectedPace) {
            row.classList.remove("is-hidden");
          } else {
            row.classList.add("is-hidden");
          }
        });
      });
    });
    var activeBtn = filterContainer.querySelector(".filter-pill.active");
    if (activeBtn) {
      applyFilter(activeBtn.getAttribute("data-pace"));
    }
  }

  // 2. Optional LocalStorage override support (from Admin panel if present)
  var raw = localStorage.getItem("daa_schedule_v1");
  if (!raw) return;
  var schedules;
  try {
    schedules = JSON.parse(raw);
  } catch (error) {
    return;
  }
  if (!Array.isArray(schedules) || schedules.length === 0) return;

  var tbody = table.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  schedules.forEach(function (item) {
    var row = document.createElement("tr");
    var paceVal = item.pace || (item.days === "Mo - Fri" ? "5x" : "3x");
    row.setAttribute("data-pace", paceVal);

    // Level
    var cellCourse = document.createElement("td");
    cellCourse.innerHTML = "<strong>" + (item.course || "") + "</strong>";
    row.appendChild(cellCourse);

    // Weekly Pace
    var cellPace = document.createElement("td");
    var paceTag = document.createElement("span");
    paceTag.className =
      "pace-tag pace-tag--" + (paceVal === "5x" ? "5x" : "3x");
    paceTag.textContent =
      paceVal === "5x" ? "5x / week (Intensive)" : "3x / week (Semi-Intensive)";
    cellPace.appendChild(paceTag);
    row.appendChild(cellPace);

    // Days
    var cellDays = document.createElement("td");
    cellDays.textContent = item.days || "Flexible";
    row.appendChild(cellDays);

    // Times
    var cellTimes = document.createElement("td");
    cellTimes.innerHTML = (item.times || "").replace(/\n/g, "<br />");
    row.appendChild(cellTimes);

    // Date
    var cellDate = document.createElement("td");
    cellDate.innerHTML = (item.date || "").replace(/\n/g, "<br />");
    row.appendChild(cellDate);

    // Registration link & badge
    var cellReg = document.createElement("td");
    var link = document.createElement("a");
    link.href = "registration.html?course=" + encodeURIComponent(item.course);
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

  if (filterContainer) {
    var activeBtnDynamic = filterContainer.querySelector(".filter-pill.active");
    if (activeBtnDynamic) {
      applyFilter(activeBtnDynamic.getAttribute("data-pace"));
    }
  }
});
