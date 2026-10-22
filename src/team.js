// Everything about loading, saving and sharing the team. No React in here.
import { decodeTeam, encodeTeam, isValidZone, cityFromZone, formatTime, localTime } from "./time.js";

const STORAGE_KEY = "team-overlap-finder.team";

export const EXAMPLE_TEAM = [
  { name: "Hrithikesh", zone: "Europe/Dublin", start: 9, end: 17 },
  { name: "Priya", zone: "Asia/Kolkata", start: 12, end: 20 },
  { name: "Sam", zone: "America/New_York", start: 7, end: 15 }
];

export function newId() {
  return Math.random().toString(36).slice(2, 9);
}

// A share link wins over whatever is saved. Returns { team, mode }.
export function loadInitialTeam() {
  const shared = window.location.hash.match(/^#team=(.+)$/);
  if (shared) {
    const members = decodeTeam(shared[1]);
    if (members) return { team: members.map(m => ({ ...m, id: newId() })), mode: "shared" };
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return { team: saved.filter(m => isValidZone(m.zone)), mode: "saved" };
  } catch {
    // storage blocked or corrupted - start with the example
  }
  return { team: EXAMPLE_TEAM.map(m => ({ ...m, id: newId() })), mode: "example" };
}

export function saveTeam(team) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
  } catch {
    // not critical, the team still works for this visit
  }
  if (window.location.hash) {
    try {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch {
      // some browsers block this on file://
    }
  }
}

export function shareLink(team) {
  const base = window.location.href.split("#")[0];
  return `${base}#team=${encodeTeam(team)}`;
}

// Clipboard can be blocked, so callers are always told whether it worked.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function inviteText(team, startDate, endDate) {
  const day = startDate.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const lines = team.map(m => {
    const from = formatTime(localTime(m.zone, startDate));
    const to = formatTime(localTime(m.zone, endDate));
    return `${m.name} (${cityFromZone(m.zone)}): ${from}–${to}`;
  });
  return [`Team meeting on ${day}`, ...lines].join("\n");
}

// 24 one-hour slots for the chosen day, in your own time zone.
export function slotDates(dayOffset) {
  const base = new Date();
  base.setDate(base.getDate() + dayOffset);
  return Array.from({ length: 24 }, (_, h) => {
    const d = new Date(base);
    d.setHours(h, 0, 0, 0);
    return d;
  });
}

export function dayText(dayOffset) {
  if (dayOffset === 0) return "Today";
  if (dayOffset === 1) return "Tomorrow";
  if (dayOffset === -1) return "Yesterday";
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
