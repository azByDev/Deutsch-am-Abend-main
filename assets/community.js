document.addEventListener("DOMContentLoaded", function () {
  var config = window.DAA_SUPABASE_CONFIG;
  var authForm = document.getElementById("auth-form");
  if (!authForm) return;

  var client = createClient(config);
  var status = document.getElementById("auth-status");
  var mode = "signup";
  var switchButton = document.getElementById("auth-switch");
  var switchLabel = document.getElementById("auth-switch-label");
  var levelField = document.getElementById("level-field");
  var submitButton = document.getElementById("auth-submit");
  var signoutButton = document.getElementById("auth-signout");

  if (!client) {
    showStatus(
      "error",
      "Community access is being configured. Add the Supabase URL and anon key in assets/supabase-config.js.",
    );
    return;
  }

  switchButton.addEventListener("click", function () {
    mode = mode === "signup" ? "signin" : "signup";
    var isSignup = mode === "signup";
    levelField.hidden = !isSignup;
    levelField.querySelector("select").required = isSignup;
    document.getElementById("auth-heading").querySelector("h2").textContent =
      isSignup ? "Join the conversation" : "Welcome back";
    submitButton.textContent = isSignup ? "Create account" : "Sign in";
    switchLabel.textContent = isSignup
      ? "Already have an account?"
      : "Need an account?";
    switchButton.textContent = isSignup ? "Sign in" : "Create one";
  });

  authForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!authForm.checkValidity()) {
      authForm.reportValidity();
      return;
    }
    var formData = new FormData(authForm);
    submitButton.disabled = true;
    showStatus("", "");
    try {
      if (mode === "signup") {
        var codeName = generateCodeName();
        var signup = await client.auth.signUp({
          email: formData.get("email"),
          password: formData.get("password"),
          options: {
            data: {
              display_name: codeName,
              code_name: codeName,
              level: formData.get("level"),
            },
          },
        });
        if (signup.error) throw signup.error;
        showStatus(
          "success",
          "Account created. Your code name is " +
            codeName +
            ". Check your email to verify your address, then sign in to enter your level group.",
        );
        authForm.reset();
      } else {
        var signin = await client.auth.signInWithPassword({
          email: formData.get("email"),
          password: formData.get("password"),
        });
        if (signin.error) throw signin.error;
        await ensureMembership(signin.data.user);
        window.location.href = "community-coming-soon.html";
      }
    } catch (error) {
      showStatus("error", friendlyAuthError(error));
    } finally {
      submitButton.disabled = false;
    }
  });

  signoutButton.addEventListener("click", async function () {
    await client.auth.signOut();
    window.location.reload();
  });

  client.auth.getSession().then(async function (result) {
    if (result.data.session && result.data.session.user.email_confirmed_at) {
      var user = result.data.session.user;
      var level = await getMemberLevel(user.id);
      if (level) showSignedIn(user, level);
    }
  });

  async function ensureMembership(user) {
    var level = user.user_metadata && user.user_metadata.level;
    if (!level) return;
    var result = await client
      .from("level_memberships")
      .upsert({ user_id: user.id, level: level }, { onConflict: "user_id" });
    if (result.error) throw result.error;
  }

  async function getMemberLevel(userId) {
    var result = await client
      .from("level_memberships")
      .select("level")
      .eq("user_id", userId)
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data && result.data.level;
  }

  function showSignedIn(user, level) {
    authForm.hidden = true;
    document.querySelector(".auth-switch").hidden = true;
    signoutButton.hidden = false;
    showStatus(
      "success",
      "You are signed in as " +
        (user.user_metadata.code_name || "your code name") +
        ". Your group is " +
        level +
        ".",
    );
    var link = document.createElement("a");
    link.className = "btn btn-primary auth-group-link";
    link.href = "community-coming-soon.html";
    link.textContent = "View your community update";
    status.appendChild(link);
  }

  function showStatus(type, message) {
    status.className = "form-status" + (type ? " " + type : "");
    status.textContent = message;
  }
});

function createClient(config) {
  if (
    !config ||
    !window.supabase ||
    !config.url ||
    !config.anonKey ||
    config.url.indexOf("YOUR_") !== -1 ||
    config.anonKey.indexOf("YOUR_") !== -1
  )
    return null;
  return window.supabase.createClient(config.url, config.anonKey);
}

function friendlyAuthError(error) {
  var message =
    error && error.message
      ? error.message
      : "We could not complete that request.";
  if (message.toLowerCase().indexOf("email not confirmed") !== -1)
    return "Please verify your email address before signing in.";
  if (message.toLowerCase().indexOf("invalid login") !== -1)
    return "That email and password combination was not recognised.";
  return message;
}

function generateCodeName() {
  var randomPart = new Uint32Array(1);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomPart);
  } else {
    randomPart[0] = Math.floor(Math.random() * 4294967295);
  }
  return "Learner-" + randomPart[0].toString(16).slice(-6).toUpperCase();
}
