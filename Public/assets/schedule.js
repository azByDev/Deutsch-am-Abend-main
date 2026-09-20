document.addEventListener("DOMContentLoaded", function () {
  var table = document.getElementById("schedule-table");
  if (!table) return;
  var raw = localStorage.getItem("daa_schedule_v1");
  if (!raw) return;
  var schedules;
  try {
    schedules = JSON.parse(raw);
  } catch (error) {
    return;
  }
  if (!Array.isArray(schedules)) return;

  var header = table.querySelector("thead tr");
  if (!header) return;
  var body = document.createElement("tbody");
  schedules.forEach(function (item) {
    var row = document.createElement("tr");
    appendCell(row, item.course);
    appendCell(row, item.days);
    appendCell(row, item.times);
    appendCell(row, item.date);
    var registration = document.createElement("td");
    var link = document.createElement("a");
    link.href = "registration.html?course=" + encodeURIComponent(item.course);
    var badge = document.createElement("span");
    badge.className =
      "status-badge status-badge--" +
      (item.status === "open" ? "confirmed" : "forming");
    badge.textContent = item.status === "open" ? "Open" : "Register Interest";
    link.appendChild(badge);
    registration.appendChild(link);
    row.appendChild(registration);
    body.appendChild(row);
  });
  Array.from(table.querySelectorAll("thead tr"))
    .slice(1)
    .forEach(function (row) {
      row.remove();
    });
  table.appendChild(body);

  function appendCell(row, value) {
    var cell = document.createElement("td");
    cell.textContent = value;
    cell.style.whiteSpace = "pre-line";
    row.appendChild(cell);
  }
});
