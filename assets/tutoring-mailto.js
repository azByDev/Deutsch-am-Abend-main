/**
 * 1-ON-1 TUTORING REGISTRATION — MAILTO VERSION
 * ================================================
 * Matches the pattern used by assets/registration-mailto.js. No third-party
 * email service — clicking "Submit registration" opens the visitor's own
 * email app with all the details already filled in.
 *
 * The address it sends to is set in the EMAIL_TO constant below.
 */

var EMAIL_TO = "info.deutschamabend@gmail.com";

document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("tutoring-form");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var formData = new FormData(form);
    var firstname = formData.get("firstname") || "";
    var lastname = formData.get("lastname") || "";
    var email = formData.get("email") || "";
    var phone = formData.get("phone") || "";
    var cityarea = formData.get("cityarea") || "";
    var currentlevel = formData.get("currentlevel") || "Not specified";
    var priorstudy = formData.get("priorstudy") || "";
    var location = formData.get("location") || "No";
    var goals = formData.getAll("goal").join(", ") || "Not specified";
    var examtarget = formData.get("examtarget") || "";
    var goaldetail = formData.get("goaldetail") || "";
    var format = formData.get("format") || "No preference";
    var frequency = formData.get("frequency") || "No preference";
    var sessionlength = formData.get("sessionlength") || "No preference";
    var startdate = formData.get("startdate") || "";
    var availability = formData.get("availability") || "";
    var teacherpref = formData.get("teacherpref") || "No preference";
    var langmix = formData.get("langmix") || "No preference";
    var learningstyle = formData.get("learningstyle") || "";
    var rateagreement = formData.get("rateagreement") || "";
    var budgetrange = formData.get("budgetrange") || "";
    var paymentmethod = formData.get("paymentmethod") || "No preference";
    var paymenttiming = formData.get("paymenttiming") || "No preference";
    var termsAgreed = formData.get("terms") ? "Yes" : "No";

    var subject =
      "1-on-1 Tutoring Registration — " + firstname + " " + lastname;

    var bodyLines = [
      "NEW 1-ON-1 TUTORING REGISTRATION",
      "==================================",
      "",
      "Name: " + firstname + " " + lastname,
      "Email: " + email,
      "Phone: " + phone,
      "City / area: " + cityarea,
      "",
      "Current German level: " + currentlevel,
      "Prior study: " + priorstudy,
      "Location: " + location,
      "",
      "Goal(s): " + goals,
      "Exam target: " + examtarget,
      "Goal details: " + goaldetail,
      "",
      "Preferred format: " + format,
      "Preferred frequency: " + frequency,
      "Preferred session length: " + sessionlength,
      "Preferred start date: " + startdate,
      "Availability: " + availability,
      "",
      "Teacher preference: " + teacherpref,
      "Language mix preference: " + langmix,
      "Notes for teacher: " + learningstyle,
      "",
      "Amenable to teacher rate: " + rateagreement,
      "Budget range: " + budgetrange,
      "Preferred payment method: " + paymentmethod,
      "Preferred payment arrangement: " + paymenttiming,
      "",
      "Agreed to declaration: " + termsAgreed,
      "",
      "==================================",
      "Sent from the Deutsch am Abend website — 1-on-1 tutoring form.",
    ];

    var body = bodyLines.join("\n");

    var mailtoUrl =
      "mailto:" +
      EMAIL_TO +
      "?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(body);

    window.location.href = mailtoUrl;

    showFormStatus(
      "success",
      "Opening your email app… Please review and press Send to complete your registration. " +
        "If nothing opens, please email us directly at " +
        EMAIL_TO +
        ".",
    );
  });
});

function showFormStatus(type, message) {
  var existingStatus = document.querySelector(".form-status");
  if (existingStatus) {
    existingStatus.remove();
  }

  var statusEl = document.createElement("div");
  statusEl.className = "form-status " + type;
  statusEl.textContent = message;

  var form = document.getElementById("tutoring-form");
  form.parentNode.insertBefore(statusEl, form);
  statusEl.scrollIntoView({ behavior: "smooth", block: "center" });
}
