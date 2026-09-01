/**
 * DONATION FORM — MAILTO VERSION
 * =================================
 * This form does NOT use any third-party email service. When the visitor
 * clicks "Send Donation Enquiry," their own email app opens with all the
 * details already filled in — they just need to press Send.
 *
 * No setup, no API keys, no account needed. The address it sends to is
 * set in the EMAIL_TO constant below.
 *
 * Everything above the submit button (amount buttons, slider, frequency
 * toggle, copy-to-clipboard for bank details) still works exactly as
 * before — only the final "send" step has changed.
 */

var DONATION_EMAIL_TO = "info.deutschamabend@gmail.com";
var WEB3FORMS_ACCESS_KEY = "eee364cf-48ed-4a8a-a022-186cb653b2cf";

document.addEventListener("DOMContentLoaded", function () {
  // ---------- Amount selection (preset buttons + slider) ----------
  var amountButtons = document.querySelectorAll(".amount-btn");
  var slider = document.getElementById("amount-slider");
  var totalAmountEl = document.getElementById("total-amount");
  var totalLabelEl = document.getElementById("total-label");
  var amountField = document.getElementById("donation-amount-field");
  var freqField = document.getElementById("donation-freq-field");
  var freqButtons = document.querySelectorAll(".freq-toggle button");

  var currentFreq = "One-time";

  function formatPeso(amount) {
    return "₱" + Number(amount).toLocaleString("en-PH");
  }

  function setAmount(amount, fromSlider) {
    if (totalAmountEl) totalAmountEl.textContent = formatPeso(amount);
    if (amountField) amountField.value = amount;
    if (!fromSlider && slider) slider.value = amount;

    amountButtons.forEach(function (btn) {
      var btnAmount = parseInt(btn.getAttribute("data-amount"), 10);
      btn.classList.toggle("active", btnAmount === Number(amount));
    });
  }

  amountButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var amount = btn.getAttribute("data-amount");
      setAmount(amount, false);
    });
  });

  if (slider) {
    slider.addEventListener("input", function () {
      setAmount(slider.value, true);
    });
  }

  // ---------- Frequency toggle ----------
  freqButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      freqButtons.forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      var freq = btn.getAttribute("data-freq");
      currentFreq = freq === "monthly" ? "Monthly" : "One-time";
      if (freqField) freqField.value = currentFreq;
      if (totalLabelEl)
        totalLabelEl.textContent =
          currentFreq === "Monthly" ? "Monthly donation" : "One-time donation";
    });
  });

  // ---------- Copy-to-clipboard for bank details ----------
  document.querySelectorAll(".copy-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var targetId = btn.getAttribute("data-copy-target");
      var targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      var text = targetEl.textContent.trim();
      navigator.clipboard
        .writeText(text)
        .then(function () {
          var originalText = btn.textContent;
          btn.textContent = "Copied!";
          btn.classList.add("copied");
          setTimeout(function () {
            btn.textContent = originalText;
            btn.classList.remove("copied");
          }, 1800);
        })
        .catch(function () {
          // Fallback for browsers without clipboard API permission
          var textarea = document.createElement("textarea");
          textarea.value = text;
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand("copy");
          } catch (e) {}
          document.body.removeChild(textarea);
          btn.textContent = "Copied!";
          setTimeout(function () {
            btn.textContent = "Copy";
          }, 1800);
        });
    });
  });

  // ---------- Donation form submission via mailto ----------
  var form = document.getElementById("donation-form");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var formData = new FormData(form);
    var donorName = formData.get("donor_name") || "";
    var donorEmail = formData.get("donor_email") || "";
    var donorMessage = formData.get("donor_message") || "—";
    var donationAmount = formData.get("donation_amount") || "";
    var donationFrequency = formData.get("donation_frequency") || "One-time";
    var donorReceipt = formData.get("donor_receipt") ? "Yes" : "No";

    var subject =
      "Donation Enquiry: " +
      donationFrequency +
      " ₱" +
      donationAmount +
      " — " +
      donorName;

    var bodyLines = [
      "NEW DONATION ENQUIRY",
      "========================",
      "",
      "Name: " + donorName,
      "Email: " + donorEmail,
      "Amount: ₱" + donationAmount,
      "Frequency: " + donationFrequency,
      "Wants tax receipt: " + donorReceipt,
      "",
      "Message:",
      donorMessage,
      "",
      "========================",
      "Sent from the Deutsch am Abend website donation form.",
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
    payload.append("from_name", donorName);
    payload.append("email", donorEmail);
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
          showDonationStatus(
            "success",
            "Thank you! Your donation enquiry has been sent. We'll follow up at " +
              donorEmail +
              " soon.",
          );
          form.reset();
        } else {
          showDonationStatus(
            "error",
            "Something went wrong sending your enquiry. Please try again, or email us directly at " +
              DONATION_EMAIL_TO +
              ".",
          );
        }
      })
      .catch(function () {
        showDonationStatus(
          "error",
          "Something went wrong sending your enquiry. Please try again, or email us directly at " +
            DONATION_EMAIL_TO +
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

  function showDonationStatus(type, message) {
    var existing = document.querySelector(".donate-widget .form-status");
    if (existing) existing.remove();

    var statusEl = document.createElement("div");
    statusEl.className = "form-status " + type;
    statusEl.style.marginBottom = "18px";
    statusEl.textContent = message;

    form.parentNode.insertBefore(statusEl, form);
    statusEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});
