(function () {
  "use strict";

  var content = document.querySelectorAll("[data-admin-content]");
  if (!content.length) return;
  var firstContent = content[0];

  var gate = document.createElement("section");
  gate.style.cssText =
    "max-width:440px;margin:12vh auto;padding:32px;background:#fff;border:1px solid #e3ddce;border-radius:14px;font:16px Inter,sans-serif;color:#2a2a26";
  gate.innerHTML =
    '<h1 style="font-family:Crimson Text,serif;color:#2d5016">Admin sign in</h1>' +
    '<p>Sign in with an account that has been granted Deutsch am Abend admin access.</p>' +
    '<form id="admin-login-form"><label style="display:block;margin:12px 0 4px" for="admin-email">Email</label><input id="admin-email" type="email" autocomplete="username" required style="width:100%;padding:10px;border:1px solid #e3ddce;border-radius:6px"><label style="display:block;margin:12px 0 4px" for="admin-password">Password</label><input id="admin-password" type="password" autocomplete="current-password" required style="width:100%;padding:10px;border:1px solid #e3ddce;border-radius:6px"><button type="submit" style="margin-top:18px;padding:11px 16px;background:#2d5016;color:white;border:0;border-radius:6px;cursor:pointer">Sign in</button></form>' +
    '<p id="admin-login-status" role="status" style="color:#a33"></p>';
  document.body.insertBefore(gate, firstContent);

  var sync = window.DAAMeetingSync;
  var form = gate.querySelector("#admin-login-form");
  var status = gate.querySelector("#admin-login-status");
  if (!sync || !sync.isConfigured()) {
    status.textContent = "Supabase is not configured. Add the project URL and anon key in assets/supabase-config.js.";
    form.hidden = true;
    return;
  }

  var client;
  try {
    client = sync.getClient();
  } catch (error) {
    status.textContent = error.message;
    form.hidden = true;
    return;
  }

  client.auth.onAuthStateChange(function (event) {
    if (event === "SIGNED_OUT" && window.DAA_ADMIN_AUTHORIZED) {
      window.location.reload();
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var button = form.querySelector("button");
    button.disabled = true;
    status.textContent = "Signing in…";
    try {
      var result = await client.auth.signInWithPassword({
        email: form.querySelector("#admin-email").value,
        password: form.querySelector("#admin-password").value,
      });
      if (result.error) throw result.error;
      await verifyAdmin(result.data.user);
    } catch (error) {
      status.textContent = error.message || "Sign-in failed.";
    } finally {
      button.disabled = false;
    }
  });

  client.auth.getSession().then(async function (result) {
    if (result.error) {
      status.textContent = result.error.message;
      return;
    }
    if (result.data.session) {
      try {
        await verifyAdmin(result.data.session.user);
      } catch (error) {
        status.textContent = error.message || "This account is not an admin.";
      }
    }
  });

  async function verifyAdmin(user) {
    var result = await client
      .from("daa_admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) {
      await client.auth.signOut();
      throw new Error("This account is not authorized to access the admin dashboard.");
    }
    gate.remove();
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
      var result = await authClient.auth.signOut();
      if (result.error) {
        status.textContent = result.error.message;
        document.body.insertBefore(gate, firstContent);
        return;
      }
      window.location.reload();
    });
    document.body.appendChild(button);
  }
})();
