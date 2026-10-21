// Pure time-zone helpers. No DOM in here so it can be tested with Node.

const CITY_ALIASES = {
  "bengaluru": "Asia/Kolkata",
  "bangalore": "Asia/Kolkata",
  "mumbai": "Asia/Kolkata",
  "delhi": "Asia/Kolkata",
  "new delhi": "Asia/Kolkata",
  "hyderabad": "Asia/Kolkata",
  "chennai": "Asia/Kolkata",
  "pune": "Asia/Kolkata",
  "san francisco": "America/Los_Angeles",
  "seattle": "America/Los_Angeles",
  "boston": "America/New_York",
  "washington": "America/New_York",
  "beijing": "Asia/Shanghai",
  "cork": "Europe/Dublin",
  "galway": "Europe/Dublin",
  "manchester": "Europe/London",
  "edinburgh": "Europe/London",
  "munich": "Europe/Berlin",
  "barcelona": "Europe/Madrid",
  "milan": "Europe/Rome",
  "abu dhabi": "Asia/Dubai"
};

function allTimeZones() {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }
  // very old browsers: fall back to a short list
  return ["Europe/Dublin", "Europe/London", "Asia/Kolkata", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "Australia/Sydney", "UTC"];
}

function cityFromZone(zone) {
  const last = zone.split("/").pop();
  return last.replace(/_/g, " ");
}

function isValidZone(zone) {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

// Turn what the user typed ("Dublin", "Bengaluru", "Europe/Paris") into an IANA zone.
function resolveZone(text, zones = allTimeZones()) {
  const q = text.trim().toLowerCase();
  if (!q) return null;
  if (CITY_ALIASES[q]) return CITY_ALIASES[q];

  const exact = zones.find(z => z.toLowerCase() === q);
  if (exact) return exact;

  const byCity = zones.find(z => cityFromZone(z).toLowerCase() === q);
  if (byCity) return byCity;

  // "Europe/Dublin (Dublin)" style labels from the suggestion list
  const inLabel = text.match(/\(([^)]+)\)/);
  if (inLabel) {
    const zone = zones.find(z => z.toLowerCase() === inLabel[1].trim().toLowerCase());
    if (zone) return zone;
  }

  return null;
}

// Local wall-clock time for a zone at a given instant, as { hour, minute }.
function localTime(zone, date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const get = type => Number(parts.find(p => p.type === type).value);
  return { hour: get("hour"), minute: get("minute") };
}

function formatTime({ hour, minute }) {
  return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}

// Is the whole one-hour slot starting at `date` inside this person's working hours?
// Works for overnight shifts too (e.g. 22 -> 6).
function isWorkingSlot(member, date) {
  const t = localTime(member.zone, date);
  const slotStart = t.hour + t.minute / 60;
  const slotEnd = slotStart + 1;
  const { start, end } = member;

  if (start < end) {
    return slotStart >= start && slotEnd <= end;
  }
  // overnight shift
  return slotStart >= start || slotEnd <= end;
}

// For each slot, which members are working. Returns [{ date, working: [ids...] }]
function buildSlots(members, slotDates) {
  return slotDates.map(date => ({
    date,
    working: members.filter(m => isWorkingSlot(m, date)).map(m => m.id)
  }));
}

// Longest run of slots where everyone is working. Earliest run wins a tie.
// Returns { start, length } as slot indexes, or null if there's no overlap at all.
function bestOverlap(slots, memberCount) {
  if (memberCount === 0) return null;
  let best = null;
  let runStart = -1;

  slots.forEach((slot, i) => {
    const everyone = slot.working.length === memberCount;
    if (everyone && runStart === -1) runStart = i;

    const runEnds = !everyone || i === slots.length - 1;
    if (runStart !== -1 && runEnds) {
      const endIdx = everyone ? i : i - 1;
      const length = endIdx - runStart + 1;
      if (!best || length > best.length) best = { start: runStart, length };
      runStart = -1;
    }
  });

  return best;
}

// When nobody overlaps fully, find the slots where the most people are free to meet.
function mostPeopleSlots(slots) {
  const max = Math.max(0, ...slots.map(s => s.working.length));
  if (max === 0) return { count: 0, indexes: [] };
  const indexes = slots.map((s, i) => (s.working.length === max ? i : -1)).filter(i => i !== -1);
  return { count: max, indexes };
}

const TimeMath = {
  allTimeZones, cityFromZone, isValidZone, resolveZone, localTime, formatTime,
  isWorkingSlot, buildSlots, bestOverlap, mostPeopleSlots
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = TimeMath;
}
