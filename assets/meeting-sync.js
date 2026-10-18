(function () {
  "use strict";

  var client;
  var blockerTable = "daa_meeting_settings";
  var bookingsTable = "daa_meeting_bookings";

  function isConfigured() {
    var config = window.DAA_SUPABASE_CONFIG;
    return !!(
      config &&
      config.url &&
      config.anonKey &&
      config.url.indexOf("YOUR_") === -1 &&
      config.anonKey.indexOf("YOUR_") === -1
    );
  }

  function getClient() {
    if (!isConfigured()) {
      throw new Error("Supabase is not configured. Add the project URL and anon key in assets/supabase-config.js.");
    }
    if (!window.supabase) {
      throw new Error("The Supabase client library did not load.");
    }
    if (!client) {
      client = window.supabase.createClient(
        window.DAA_SUPABASE_CONFIG.url,
        window.DAA_SUPABASE_CONFIG.anonKey,
      );
    }
    return client;
  }

  async function loadBlockerData() {
    var result = await getClient().from(blockerTable).select("data").eq("id", 1).maybeSingle();
    if (result.error) throw result.error;
    return result.data ? result.data.data : null;
  }

  function normalizeBlockerData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Meeting availability data must be an object.");
    }

    var normalized = Object.assign({}, data);
    ["blockedDates", "blockedSlots"].forEach(function (key) {
      var entries = data[key];
      if (entries === undefined || entries === null) {
        normalized[key] = [];
      } else if (!Array.isArray(entries)) {
        throw new Error("Meeting availability data has an invalid " + key + " list.");
      } else {
        normalized[key] = entries;
      }
    });
    return normalized;
  }

  async function saveBlockerData(data) {
    var result = await getClient()
      .from(blockerTable)
      .upsert({ id: 1, data: data }, { onConflict: "id" });
    if (result.error) throw result.error;
  }

  async function loadBookings() {
    var result = await getClient()
      .from(bookingsTable)
      .select("id,scheduled_date,scheduled_time,duration,full_name,email,phone,topic,notes,schedule_timezone,local_date,local_time,visitor_timezone,start_at,status,created_at")
      .order("scheduled_date", { ascending: true });
    if (result.error) throw result.error;
    return result.data.map(function (booking) {
      return {
        id: booking.id,
        date: booking.scheduled_date,
        time: booking.scheduled_time.slice(0, 5),
        duration: booking.duration,
        fullName: booking.full_name,
        email: booking.email,
        phone: booking.phone || "",
        topic: booking.topic,
        notes: booking.notes || "",
        timeZone: booking.schedule_timezone,
        localDate: booking.local_date,
        localTime: booking.local_time,
        visitorTimeZone: booking.visitor_timezone,
        startAt: booking.start_at,
        status: booking.status,
        createdAt: booking.created_at,
      };
    });
  }

  async function loadBookedSlots(fromDate, toDate) {
    var result = await getClient().rpc("get_daa_booked_slots", {
      p_from: fromDate,
      p_to: toDate,
    });
    if (result.error) throw result.error;
    return result.data.map(function (slot) {
      return {
        id: slot.id,
        date: slot.scheduled_date,
        time: slot.scheduled_time.slice(0, 5),
        duration: slot.duration,
        status: "confirmed",
      };
    });
  }

  async function createBooking(booking) {
    var result = await getClient().rpc("create_daa_booking", {
      p_booking: {
        id: booking.id,
        date: booking.date,
        time: booking.time,
        duration: booking.duration,
        full_name: booking.fullName,
        email: booking.email,
        phone: booking.phone,
        topic: booking.topic,
        notes: booking.notes,
        schedule_timezone: booking.timeZone,
        local_date: booking.localDate,
        local_time: booking.localTime,
        visitor_timezone: booking.visitorTimeZone,
        start_at: booking.startAt,
      },
    });
    if (result.error) throw result.error;
    return result.data[0];
  }

  async function updateBookingStatus(id, status) {
    var result = await getClient()
      .from(bookingsTable)
      .update({ status: status })
      .eq("id", id);
    if (result.error) throw result.error;
  }

  async function saveBookings(bookings) {
    if (!bookings.length) return;
    var rows = bookings.map(function (booking) {
      return {
        id: booking.id,
        scheduled_date: booking.date,
        scheduled_time: booking.time,
        duration: booking.duration || 45,
        full_name: booking.fullName || "",
        email: booking.email || "",
        phone: booking.phone || "",
        topic: booking.topic || "",
        notes: booking.notes || "",
        schedule_timezone: booking.timeZone || null,
        local_date: booking.localDate || null,
        local_time: booking.localTime || null,
        visitor_timezone: booking.visitorTimeZone || null,
        start_at: booking.startAt || null,
        status: booking.status || "confirmed",
        created_at: booking.createdAt || new Date().toISOString(),
      };
    });
    var result = await getClient().from(bookingsTable).upsert(rows, { onConflict: "id" });
    if (result.error) throw result.error;
  }

  async function replaceBookings(bookings) {
    var db = getClient();
    var existing = await db.from(bookingsTable).select("id");
    if (existing.error) throw existing.error;
    await saveBookings(bookings);
    var retainedIds = bookings.map(function (booking) {
      return booking.id;
    });
    var removedIds = existing.data
      .map(function (booking) {
        return booking.id;
      })
      .filter(function (id) {
        return retainedIds.indexOf(id) === -1;
      });
    if (removedIds.length) {
      var result = await db
        .from(bookingsTable)
        .update({ status: "cancelled" })
        .in("id", removedIds);
      if (result.error) throw result.error;
    }
  }

  window.DAAMeetingSync = {
    isConfigured: isConfigured,
    getClient: getClient,
    loadBlockerData: loadBlockerData,
    normalizeBlockerData: normalizeBlockerData,
    saveBlockerData: saveBlockerData,
    loadBookings: loadBookings,
    loadBookedSlots: loadBookedSlots,
    createBooking: createBooking,
    updateBookingStatus: updateBookingStatus,
    saveBookings: saveBookings,
    replaceBookings: replaceBookings,
  };
})();
