// teacher-availability-mailto.js
// Handles Web3Forms submission + EmailJS auto-reply for the Teacher Availability form
// Field names below match teacher-availability.html exactly as of this version.

document.addEventListener("DOMContentLoaded", function () {
  // Visual feedback for checked radio-cards
  document
    .querySelectorAll(".radio-card input[type=checkbox]")
    .forEach(function (cb) {
      cb.addEventListener("change", function () {
        this.closest(".radio-card").classList.toggle("checked", this.checked);
      });
    });

  const form = document.getElementById("availability-form");
  const statusEl = document.getElementById("form-status");
  const submitBtn = document.getElementById("submitBtn");

  // ---- CONFIG: replace with your actual keys ----
  const WEB3FORMS_ACCESS_KEY = "2db60610-8381-4026-85f0-59b988a385b8";
  const EMAILJS_PUBLIC_KEY = "YOUR_EMAILJS_PUBLIC_KEY";
  const EMAILJS_SERVICE_ID = "YOUR_EMAILJS_SERVICE_ID";
  const EMAILJS_TEMPLATE_ID = "YOUR_EMAILJS_TEMPLATE_ID_TEACHER_AVAILABILITY";
  // -------------------------------------------------

  if (window.emailjs && EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY") {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  function getCheckedValues(name) {
    return Array.from(
      form.querySelectorAll(`input[name="${name}"]:checked`),
    ).map((el) => el.value);
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    statusEl.className = "";
    statusEl.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    const data = {
      fullName: form.fullName.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      preferredContact: form.preferredContact.value,
      levels: getCheckedValues("levels"),
      HonoraryFee: form.HonoraryFee.value,
      startDate: form.startDate.value,
      days: getCheckedValues("days"),
      timeSlots: getCheckedValues("timeSlots"),
      numberOfCourses: getCheckedValues("NumberOfCourses"),
      hoursPerDay: form.hoursPerDay.value,
      hoursPerWeek: form.hoursPerWeek.value,
      frequencyPerWeek: form.FrequencyPerWeek.value,
      format: form.format.value,
      notes: form.notes.value.trim(),
    };

    if (
      data.levels.length === 0 ||
      data.days.length === 0 ||
      data.timeSlots.length === 0 ||
      data.numberOfCourses.length === 0 ||
      data.HonoraryFee === ""
    ) {
      statusEl.className = "error";
      statusEl.textContent =
        "Please select at least one level, day, time slot, and number of courses, and provide your honorarium fee.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Availability";
      return;
    }

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: `Teacher Availability: ${data.fullName}`,
          from_name: "Deutsch am Abend — Teacher Availability Form",
          "Full Name:": data.fullName,
          Email: data.email,
          Phone: data.phone,
          "Preferred Contact Method:": data.preferredContact,
          "Levels They Can Teach:": data.levels.join(", "),
          "Honorarium Fee:": data.HonoraryFee,
          "Available From:": data.startDate,
          "Available Days:": data.days.join(", "),
          "Preferred Time Slots:": data.timeSlots.join(", "),
          "Number of Courses:": data.numberOfCourses.join(", "),
          "Hours Available Per Day:": data.hoursPerDay,
          "Hours Available Per Week:": data.hoursPerWeek,
          "Class Frequency Per Week:": data.frequencyPerWeek,
          "Preferred Format:": data.format,
          "Additional Notes:": data.notes || "—",
        }),
      });
      const result = await res.json();

      if (result.success) {
        statusEl.className = "success";
        statusEl.textContent =
          "Thank you! Your availability has been submitted. We'll confirm your course assignments soon.";
        form.reset();
        document
          .querySelectorAll(".radio-card.checked")
          .forEach((el) => el.classList.remove("checked"));

        if (
          window.emailjs &&
          EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY"
        ) {
          emailjs
            .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
              to_email: data.email,
              to_name: data.fullName,
              levels: data.levels.join(", "),
              start_date: data.startDate,
            })
            .catch((err) => console.warn("EmailJS auto-reply failed:", err));
        }
      } else {
        throw new Error(result.message || "Submission failed.");
      }
    } catch (err) {
      statusEl.className = "error";
      statusEl.textContent =
        "Something went wrong submitting your form. Please try again or email us directly at info@deutschamabend.org.";
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Availability";
    }
  });
});
