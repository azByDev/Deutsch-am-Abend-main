/**
 * CONTACT FORM — WEB3FORMS HANDLER
 * ====================================
 * Submits inquiries via Web3Forms with background AJAX,
 * client-side validation, spam protection (honeypot), and accessible UI feedback.
 */

(function () {
  "use strict";

  var WEB3FORMS_ACCESS_KEY = "cd1b28ce-8440-4fd6-bc24-e3b728bb6cff";
  var FALLBACK_EMAIL = "info@deutschamabend.org";

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("contact-form");
    var statusEl = document.getElementById("contact-form-status");
    var submitBtn = document.getElementById("contact-submit-btn");

    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Check validation
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var honeypot = form.querySelector('input[name="botcheck"]');
      if (honeypot && honeypot.value) {
        return; // Spam detected
      }

      var name = (form.querySelector('[name="name"]') || {}).value || "";
      var email = (form.querySelector('[name="email"]') || {}).value || "";
      var subject =
        (form.querySelector('[name="subject"]') || {}).value ||
        "General Inquiry";
      var inquiryType =
        (form.querySelector('[name="inquiry_type"]') || {}).value || "General";
      var message = (form.querySelector('[name="message"]') || {}).value || "";

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = "Sending…";
      }

      if (statusEl) {
        statusEl.className = "form-status info";
        statusEl.textContent = "Sending your message…";
        statusEl.style.display = "block";
      }

      var fullSubject =
        "Contact Inquiry [" + inquiryType + "]: " + subject + " — " + name;
      var body = [
        "NEW CONTACT INQUIRY",
        "====================",
        "Name: " + name,
        "Email: " + email,
        "Category: " + inquiryType,
        "Subject: " + subject,
        "",
        "Message:",
        message,
        "",
        "====================",
        "Sent from deutschamabend.org contact form.",
      ].join("\n");

      var payload = new FormData();
      payload.append("access_key", WEB3FORMS_ACCESS_KEY);
      payload.append("subject", fullSubject);
      payload.append("from_name", name);
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
            if (statusEl) {
              statusEl.className = "form-status success";
              statusEl.textContent =
                "Thank you, " +
                name +
                "! Your message has been sent. We will reply to " +
                email +
                " within 24–48 hours.";
              statusEl.style.display = "block";
            }
            form.reset();
          } else {
            throw new Error(data.message || "Submission failed");
          }
        })
        .catch(function () {
          if (statusEl) {
            statusEl.className = "form-status error";
            statusEl.textContent =
              "Something went wrong sending your message. Please try again or email us directly at " +
              FALLBACK_EMAIL +
              ".";
            statusEl.style.display = "block";
          }
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent =
              submitBtn.dataset.originalText || "Send Message";
          }
        });
    });
  });
})();
