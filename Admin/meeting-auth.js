(function () {
  "use strict";

  var content = document.querySelectorAll("[data-admin-content]");
  if (!content.length) return;

  var sync = window.DAAMeetingSync;
  if (!sync || !sync.isConfigured()) {
    showFallbackGate("Supabase is not configured. Add the project URL and anon key in assets/supabase-config.js.");
    return;
  }

  var client;
  try {
    client = sync.getClient();
  } catch (error) {
    showFallbackGate(error.message);
    return;
  }

  /* Listen for sign-out to redirect back to sign-in */
  client.auth.onAuthStateChange(function (event) {
    if (event === "SIGNED_OUT" && window.DAA_ADMIN_AUTHORIZED) {
      window.location.replace("index.html");
    }
  });

  /* Check for existing session */
  client.auth.getSession().then(async function (result) {
    if (result.error) {
      redirectToSignIn();
      return;
    }
    if (!result.data.session) {
      redirectToSignIn();
      return;
    }
    try {
      await verifyAdmin(result.data.session.user);
    } catch (error) {
      redirectToSignIn();
    }
  });

  async function verifyAdmin(user) {
    var result = await client
      .from("daa_admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (result.error) {
      var errMsg = result.error.message || "";
      if (errMsg.includes("daa_admin_users") || errMsg.toLowerCase().includes("schema cache")) {
        showFallbackGate("Database table missing: Table 'public.daa_admin_users' was not found in Supabase. Please run supabase-meeting-sync.sql in the Supabase SQL Editor.");
        return;
      }
      throw result.error;
    }
    if (!result.data) {
      await client.auth.signOut();
      throw new Error("This account is not authorized to access the admin dashboard.");
    }
    window.DAA_ADMIN_AUTHORIZED = true;
    content.forEach(function (element) {
      element.hidden = false;
    });
    window.dispatchEvent(new Event("daa-admin-authorized"));
    addSignOut(client);
  }

  function addSignOut(authClient) {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = "Sign out";
    button.className = "btn btn-secondary";
    button.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:20";
    button.addEventListener("click", async function () {
      await authClient.auth.signOut();
      window.location.replace("index.html");
    });
    document.body.appendChild(button);
  }

  function redirectToSignIn() {
    window.location.replace("index.html");
  }

  /**
   * Fallback gate shown only when Supabase itself is not configured,
   * so there is nothing to redirect to.
   */
  function showFallbackGate(message) {
    var firstContent = content[0];
    var gate = document.createElement("section");
    gate.style.cssText =
      "max-width:440px;margin:12vh auto;padding:32px;background:#fff;border:1px solid #e3ddce;border-radius:14px;font:16px Inter,sans-serif;color:#2a2a26;text-align:center";
    gate.innerHTML =
      '<h1 style="font-family:Crimson Text,serif;color:#2d5016;font-size:1.4rem">Configuration required</h1>' +
      '<p style="color:#6b6b6b">' + escapeHtml(message) + "</p>";
    document.body.insertBefore(gate, firstContent);
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
})();
