/**
 * 1-ON-1 TUTORING REGISTRATION — WEB3FORMS VERSION
 * ================================================
 * Submits in the background via Web3Forms (web3forms.com) instead of
 * opening the visitor's email app. Works the same on desktop and mobile,
 * with no dependency on a local mail client being configured.
 *
 * Free tier: 250 submissions/month, no account required — just an
 * access key. Set it below.
 */

var EMAIL_TO = "info.deutschamabend@gmail.com";
var WEB3FORMS_ACCESS_KEY = "340f17bc-9b00-4aad-8212-6674838e62cd";

var EMAILJS_SERVICE_ID = "service_g4yj10u"; // ← same Service ID as other forms
var EMAILJS_TEMPLATE_ID = "template_tevvuyxq"; // ← a template written for tutoring
var EMAILJS_PUBLIC_KEY = "2gmqT7hGWD_W4y83O"; // ← same Public Key as other forms

function sendTutoringConfirmationEmail(toEmail, toName) {
  return fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: toEmail,
        to_name: toName,
      },
    }),
  }).then(function (res) {
    if (!res.ok) {
      throw new Error("EmailJS request failed: " + res.status);
    }
  });
}

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
    var previouschool = formData.get("previouschool") || "";
    var location = formData.getAll("location").join(", ") || "Not specified";
    var goals = formData.getAll("goal").join(", ") || "Not specified";
    var targetexam = formData.get("targetexam") || "";
    var goaldetail = formData.get("goaldetail") || "";
    var format = formData.get("format") || "No preference";
    var frequency = formData.get("frequency") || "No preference";
    var sessionlength = formData.get("sessionlength") || "No preference";
    var startdate = formData.get("startdate") || "";
    var availability = formData.getAll("days").join(", ") || "Not specified";
    var sessiontime = formData.get("sessiontime") || "No preference";
    var rateagreement = formData.get("rateagreement") || "";
    var budgetrange = formData.get("budgetrange") || "";
    var paymentmethod = formData.get("paymentmethod") || "No preference";
    var paymentterms = formData.get("paymentterms") || "No preference";
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
      "Information:",
      "----------------------------------",
      "Current German level: " + currentlevel,
      "Previous school: " + previouschool,
      "Currently in PH?: " + location,
      "",
      "Goal(s): " + goals,
      "Target exam: " + targetexam,
      "Goal details: " + goaldetail,
      "",
      "Preferences for tutoring sessions:",
      "----------------------------------",
      "Format: " + format,
      "Frequency: " + frequency,
      "Session length: " + sessionlength,
      "Start date: " + startdate,
      "Availability: " + availability,
      "Session time: " + sessiontime,
      "",
      "Amenable to hourly rate: " + rateagreement,
      "Budget range: " + budgetrange,
      "Payment method: " + paymentmethod,
      "Payment terms: " + paymentterms,
      "",
      "Agreed to declaration: " + termsAgreed,
      "",
      "==================================",
      "Sent from the Deutsch am Abend website — 1-on-1 tutoring form.",
    ];

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
            "Thank you! Your tutoring inquiry has been sent. We'll get back to you at " +
              email +
              " soon.",
          );
          sendTutoringConfirmationEmail(
            email,
            firstname + " " + lastname,
          ).catch(function (err) {
            console.error("Confirmation email failed:", err);
          });

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

  var form = document.getElementById("tutoring-form");
  form.parentNode.insertBefore(statusEl, form);
  statusEl.scrollIntoView({ behavior: "smooth", block: "center" });
}
