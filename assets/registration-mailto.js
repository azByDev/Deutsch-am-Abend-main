/**
 * REGISTRATION FORM — WEB3FORMS VERSION
 * ====================================
 * Submits in the background via Web3Forms (web3forms.com) instead of
 * opening the visitor's email app. Works the same on desktop and mobile,
 * with no dependency on a local mail client being configured.
 *
 * Free tier: 250 submissions/month, no account required — just an
 * access key. Set it below.
 */

var WEB3FORMS_ACCESS_KEY = "cd1b28ce-8440-4fd6-bc24-e3b728bb6cff";
var EMAIL_TO = "info.deutschamabend@gmail.com";

document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("reg-form");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Validate form
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var formData = new FormData(form);
    var firstname = formData.get("firstname") || "";
    var lastname = formData.get("lastname") || "";
    var email = formData.get("email") || "";
    var phone = formData.get("phone") || "";
    var dob = formData.get("dob") || "";
    var location = formData.getAll("location").join(", ") || "Not specified";
    var street = formData.get("street") || "";
    var housenumber = formData.get("housenumber") || "";
    var city = formData.get("city") || "";
    var postalcode = formData.get("postalcode") || "";
    var country = formData.get("country") || "";
    var course = formData.get("course") || "";
    var priorlevel = formData.get("priorlevel") || "";
    var schedule = formData.get("schedule") || "No preference";
    var goals = formData.get("goals") || "";
    var termsAgreed = formData.get("terms") ? "Yes" : "No";

    var subject =
      "Course Registration: " + course + " — " + firstname + " " + lastname;

    // var bodyLines = [
    //   "NEW COURSE REGISTRATION",
    //   "========================",
    //   "",
    //   "Name: " + firstname + " " + lastname,
    //   "Email: " + email,
    //   "Phone: " + phone,
    //   "Date of birth: " + dob,
    //   "",
    //   "Address:",
    //   street + " " + housenumber,
    //   postalcode + " " + city,
    //   country,
    //   "",
    //   "Course selected: " + course,
    //   "Prior German level: " + priorlevel,
    //   "Preferred schedule: " + schedule,
    //   "",
    //   "Goals / questions:",
    //   goals,
    //   "",
    //   "Agreed to Terms & Conditions: " + termsAgreed,
    //   "",
    //   "========================",
    //   "Sent from the Deutsch am Abend website registration form.",
    // ];

    var bodyLines = [
      "<h2 style='margin:0 0 8px;'>New Course Registration</h2>",
      "<hr style='border:none;border-top:2px solid #2D5016;margin:0 0 16px;'>",

      "<p><b>Name:</b> " +
        escapeHtml(firstname + " " + lastname) +
        "<br>" +
        "<b>Email:</b> " +
        escapeHtml(email) +
        "<br>" +
        "<b>Phone:</b> " +
        escapeHtml(phone) +
        "<br>" +
        "<b>Date of birth:</b> " +
        escapeHtml(dob) +
        "</p>",

      "<p><b>Address:</b><br>" + "",

      "Currently in PH?: " + location,

      escapeHtml(street + " " + housenumber) +
        "<br>" +
        escapeHtml(postalcode + " " + city) +
        "<br>" +
        escapeHtml(country) +
        "</p>",

      "<p><b>Course selected:</b> " +
        escapeHtml(course) +
        "<br>" +
        "<b>Prior German level:</b> " +
        escapeHtml(priorlevel) +
        "<br>" +
        "<b>Preferred schedule:</b> " +
        escapeHtml(schedule) +
        "</p>",

      "<p><b>Goals / questions:</b><br>" + escapeHtml(goals) + "</p>",

      "<p><b>Agreed to Terms &amp; Conditions:</b> " +
        escapeHtml(termsAgreed) +
        "</p>",

      "<hr style='border:none;border-top:1px solid #ccc;margin:16px 0 8px;'>",
      "<p style='color:#888;font-size:12px;'>Sent from the Deutsch am Abend website registration form.</p>",
    ];

    var body = bodyLines.join("");
    var body = bodyLines.join("\n");

    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = "Sending…";
    }

    var payload = new FormData();
    payload.append("access_key", WEB3FORMS_ACCESS_KEY);
    payload.append("subject", subject);
    payload.append("from_name", firstname + " " + lastname);
    payload.append("email", email);
    payload.append("message", body);

    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: payload,
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data.success) {
          showFormStatus(
            "success",
            "Thank you! Your registration has been successfully submitted. We'll be in touch within 24-48 hours at " +
              email +
              " with your confirmation.",
          );
          form.reset();
        } else {
          showFormStatus(
            "error",
            "Something went wrong sending your registration. Please try again, or email us directly at " +
              EMAIL_TO +
              ".",
          );
        }
      })
      .catch(function () {
        showFormStatus(
          "error",
          "Something went wrong sending your registration. Please try again, or email us directly at " +
            EMAIL_TO +
            ".",
        );
      })
      .finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.originalText;
        }
      });
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

  var form = document.getElementById("reg-form");
  form.parentNode.insertBefore(statusEl, form);
  statusEl.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Pre-select course from query param if present (e.g. services.html?course=A1)
(function () {
  var params = new URLSearchParams(window.location.search);
  var courseParam = params.get("course");
  if (courseParam) {
    var courseMap = {
      A1: "A1 — Beginner",
      A2: "A2 — Elementary",
      B1: "B1 — Intermediate",
      B2: "B2 — Upper Intermediate",
      "Exam-Prep": "Goethe-Zertifikat Exam Prep",
    };
    var targetValue = courseMap[courseParam];
    if (targetValue) {
      var radio = document.querySelector(
        'input[name="course"][value="' + targetValue + '"]',
      );
      if (radio) {
        radio.checked = true;
      }
    }
  }
})();

function showFormStatus(type, message) {
  var existingStatus = document.querySelector(".form-status");
  if (existingStatus) {
    existingStatus.remove();
  }

  var statusEl = document.createElement("div");
  statusEl.className = "form-status " + type;
  statusEl.textContent = message;

  var form = document.getElementById("reg-form");
  form.parentNode.insertBefore(statusEl, form);
  statusEl.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Pre-select course from query param if present (e.g. services.html?course=A1)
(function () {
  var params = new URLSearchParams(window.location.search);
  var courseParam = params.get("course");
  if (courseParam) {
    var courseMap = {
      A1: "A1 — Beginner",
      A2: "A2 — Elementary",
      B1: "B1 — Intermediate",
      B2: "B2 — Upper Intermediate",
      "Exam-Prep": "Goethe-Zertifikat Exam Prep",
    };
    var targetValue = courseMap[courseParam];
    if (targetValue) {
      var radio = document.querySelector(
        'input[name="course"][value="' + targetValue + '"]',
      );
      if (radio) {
        radio.checked = true;
      }
    }
  }
})();
