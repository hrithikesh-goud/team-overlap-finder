const STORAGE_KEY = "team-overlap-finder.team";
const yourZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const EXAMPLE_TEAM = [
  { name: "Hrithikesh", zone: "Europe/Dublin", start: 9, end: 17 },
  { name: "Priya", zone: "Asia/Kolkata", start: 12, end: 20 },
  { name: "Sam", zone: "America/New_York", start: 7, end: 15 }
];

let team = [];
let mode = "saved"; // "saved", "example" or "shared" (opened from someone's link)
let dayOffset = 0; // 0 = today, 1 = tomorrow...

const els = {
  summary: document.getElementById("summary"),
  board: document.getElementById("board"),
  dayLabel: document.getElementById("day-label"),
  yourZone: document.getElementById("your-zone"),
  form: document.getElementById("add-form"),
  name: document.getElementById("name"),
  city: document.getElementById("city"),
  start: document.getElementById("start"),
  end: document.getElementById("end"),
  formError: document.getElementById("form-error"),
  zoneList: document.getElementById("zone-list"),
  note: document.getElementById("example-note"),
  noteText: document.getElementById("note-text"),
  noteAction: document.getElementById("note-action"),
  shareBtn: document.getElementById("share-btn"),
  shareResult: document.getElementById("share-result"),
  shareStatus: document.getElementById("share-status"),
  shareOutput: document.getElementById("share-output")
};

function newId() {
  return Math.random().toString(36).slice(2, 9);
}

/* ---------- saving ---------- */

function loadTeam() {
  // a share link wins over whatever is saved, but isn't saved until the user says so
  const shared = location.hash.match(/^#team=(.+)$/);
  if (shared) {
    const members = TimeMath.decodeTeam(shared[1]);
    if (members) {
      team = members.map(m => ({ ...m, id: newId() }));
      mode = "shared";
      return;
    }
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) {
      team = saved.filter(m => TimeMath.isValidZone(m.zone));
      return;
    }
  } catch {
    // storage blocked or corrupted - just start fresh
  }
  team = EXAMPLE_TEAM.map(m => ({ ...m, id: newId() }));
  mode = "example";
}

function saveTeam() {
  mode = "saved";
  els.shareResult.hidden = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
  } catch {
    // not critical, the team still works for this visit
  }
  // drop the old share link from the address bar once the team is the user's own
  if (location.hash) {
    try { history.replaceState(null, "", location.pathname + location.search); } catch { /* file:// in some browsers */ }
  }
}

/* ---------- copying ---------- */

// Clipboard can be blocked, so the caller always gets told whether it worked.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function shareLink() {
  const base = location.href.split("#")[0];
  return `${base}#team=${TimeMath.encodeTeam(team)}`;
}

async function onShare() {
  const link = shareLink();
  els.shareOutput.value = link;
  els.shareResult.hidden = false;
  const copied = await copyText(link);
  els.shareStatus.textContent = copied
    ? "Link copied. Anyone who opens it sees this team. Nothing is stored on a server."
    : "Copy this link and send it to your team:";
  if (!copied) els.shareOutput.select();
}

function inviteText(startDate, endDate) {
  const day = startDate.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const lines = team.map(m => {
    const from = TimeMath.formatTime(TimeMath.localTime(m.zone, startDate));
    const to = TimeMath.formatTime(TimeMath.localTime(m.zone, endDate));
    return `${m.name} (${TimeMath.cityFromZone(m.zone)}): ${from}–${to}`;
  });
  return [`Team meeting on ${day}`, ...lines].join("\n");
}

/* ---------- setup ---------- */

function fillSelects() {
  for (let h = 0; h <= 23; h++) {
    els.start.add(new Option(String(h).padStart(2, "0") + ":00", h, false, h === 9));
  }
  for (let h = 1; h <= 24; h++) {
    els.end.add(new Option(String(h).padStart(2, "0") + ":00", h, false, h === 17));
  }
}

function fillZoneSuggestions() {
  const frag = document.createDocumentFragment();
  TimeMath.allTimeZones().forEach(zone => {
    const opt = document.createElement("option");
    opt.value = `${TimeMath.cityFromZone(zone)} (${zone})`;
    frag.appendChild(opt);
  });
  els.zoneList.appendChild(frag);
}

/* ---------- slots for the chosen day, in your own time zone ---------- */

function slotDates() {
  const base = new Date();
  base.setDate(base.getDate() + dayOffset);
  const dates = [];
  for (let h = 0; h < 24; h++) {
    const d = new Date(base);
    d.setHours(h, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

function dayText() {
  if (dayOffset === 0) return "Today";
  if (dayOffset === 1) return "Tomorrow";
  if (dayOffset === -1) return "Yesterday";
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/* ---------- rendering ---------- */

function render() {
  els.dayLabel.textContent = dayText();
  els.yourZone.textContent = yourZone.replace(/_/g, " ");
  els.shareBtn.disabled = team.length === 0;
  renderNote();

  const dates = slotDates();
  const slots = TimeMath.buildSlots(team, dates);
  const best = TimeMath.bestOverlap(slots, team.length);

  renderSummary(dates, slots, best);
  renderBoard(dates, slots, best);
}

function renderNote() {
  if (mode === "example" && team.length) {
    els.noteText.textContent = "This is an example team so you can see how it works.";
    els.noteAction.textContent = "Clear and start my own";
    els.note.hidden = false;
  } else if (mode === "shared") {
    els.noteText.textContent = "You're looking at a team someone shared with you. It isn't saved yet.";
    els.noteAction.textContent = "Save as my team";
    els.note.hidden = false;
  } else {
    els.note.hidden = true;
  }
}

function renderSummary(dates, slots, best) {
  const s = els.summary;
  s.classList.remove("none");

  if (team.length === 0) {
    s.innerHTML = `<p class="label">No one here yet</p>
      <p class="big">Add your first teammate</p>
      <p class="sub">Put in their city and working hours below, and their day appears on the board.</p>`;
    return;
  }

  if (team.length === 1) {
    s.innerHTML = `<p class="label">One person on the team</p>
      <p class="big">Add someone else</p>
      <p class="sub">The overlap shows up once there are at least two people.</p>`;
    return;
  }

  if (best) {
    const startDate = dates[best.start];
    const endDate = new Date(startDate.getTime() + best.length * 3600 * 1000);
    const hoursWord = best.length === 1 ? "hour" : "hours";
    const locals = team.map(m =>
      `<li>${escapeHtml(m.name)}: <b>${TimeMath.formatTime(TimeMath.localTime(m.zone, startDate))}–${TimeMath.formatTime(TimeMath.localTime(m.zone, endDate))}</b></li>`
    ).join("");

    s.innerHTML = `<p class="label">Best time for everyone ${dayText().toLowerCase()}</p>
      <p class="big">${TimeMath.formatTime(TimeMath.localTime(yourZone, startDate))}–${TimeMath.formatTime(TimeMath.localTime(yourZone, endDate))}</p>
      <p class="sub">${best.length} ${hoursWord} when all ${team.length} of you are working. In each person's time:</p>
      <ul class="locals">${locals}</ul>
      <div class="invite-row">
        <button type="button" class="invite-btn" id="invite-btn">Copy meeting invite</button>
        <span id="invite-status" role="status"></span>
      </div>`;

    document.getElementById("invite-btn").addEventListener("click", async () => {
      const status = document.getElementById("invite-status");
      const copied = await copyText(inviteText(startDate, endDate));
      status.textContent = copied ? "Copied. Paste it into Slack, Discord or an email." : "Couldn't copy here. Try a different browser.";
    });
    return;
  }

  // nobody fully overlaps
  const most = TimeMath.mostPeopleSlots(slots);
  s.classList.add("none");
  if (most.count === 0) {
    s.innerHTML = `<p class="label">${dayText()}</p>
      <p class="big">Nobody is working</p>
      <p class="sub">Try another day with the arrows on the board.</p>`;
    return;
  }

  const first = dates[most.indexes[0]];
  const names = team.filter(m => slots[most.indexes[0]].working.includes(m.id)).map(m => escapeHtml(m.name));
  s.innerHTML = `<p class="label">No hour works for everyone ${dayText().toLowerCase()}</p>
    <p class="big">Closest: ${TimeMath.formatTime(TimeMath.localTime(yourZone, first))}</p>
    <p class="sub">${most.count} of ${team.length} people are working then (${names.join(", ")}). Someone would need to start early or stay late.</p>`;
}

function renderBoard(dates, slots, best) {
  const b = els.board;
  b.innerHTML = "";

  const nowHour = dayOffset === 0 ? new Date().getHours() : -1;

  // header row
  b.appendChild(div("hour-label", ""));
  dates.forEach((d, i) => {
    const label = div("hour-label" + (i === nowHour ? " now" : ""), String(d.getHours()).padStart(2, "0"));
    label.setAttribute("role", "columnheader");
    b.appendChild(label);
  });

  if (team.length === 0) {
    b.appendChild(div("empty", "Your team's working hours will show here."));
    return;
  }

  const inBest = i => best && i >= best.start && i < best.start + best.length;

  team.forEach(member => {
    const now = TimeMath.formatTime(TimeMath.localTime(member.zone, new Date()));
    const person = document.createElement("div");
    person.className = "person";
    person.setAttribute("role", "rowheader");
    person.innerHTML = `<span class="who">
        <span class="name">${escapeHtml(member.name)}</span>
        <span class="meta">${escapeHtml(TimeMath.cityFromZone(member.zone))} · <b>${now}</b> now</span>
      </span>`;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = "✕";
    remove.setAttribute("aria-label", `Remove ${member.name}`);
    remove.addEventListener("click", () => removeMember(member.id));
    person.appendChild(remove);
    b.appendChild(person);

    dates.forEach((d, i) => {
      const local = TimeMath.localTime(member.zone, d);
      const working = slots[i].working.includes(member.id);
      const night = local.hour >= 22 || local.hour < 6;

      let cls = "cell";
      if (working) cls += " work";
      else if (night) cls += " night";
      if (inBest(i)) cls += " overlap";
      if (i === nowHour) cls += " now";

      const cell = div(cls, "");
      cell.setAttribute("role", "cell");
      cell.title = `${member.name}: ${TimeMath.formatTime(local)} local${working ? ", working" : ""}`;
      b.appendChild(cell);
    });
  });
}

function div(className, text) {
  const el = document.createElement("div");
  el.className = className;
  el.textContent = text;
  return el;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- actions ---------- */

function removeMember(id) {
  team = team.filter(m => m.id !== id);
  saveTeam();
  render();
}

els.form.addEventListener("submit", e => {
  e.preventDefault();
  els.formError.textContent = "";

  const name = els.name.value.trim();
  const zone = TimeMath.resolveZone(els.city.value);
  const start = Number(els.start.value);
  const end = Number(els.end.value);

  if (!name) {
    els.formError.textContent = "Add a name so you know whose row is whose.";
    els.name.focus();
    return;
  }
  if (!zone) {
    els.formError.textContent = `"${els.city.value.trim() || "That"}" isn't a city we recognise. Pick one from the suggestions, or try the nearest big city.`;
    els.city.focus();
    return;
  }
  if (start === end) {
    els.formError.textContent = "Start and finish can't be the same hour.";
    return;
  }

  if (mode === "example") team = [];
  team.push({ id: newId(), name, zone, start, end });
  saveTeam();

  els.form.reset();
  els.start.value = "9";
  els.end.value = "17";
  els.name.focus();
  render();
});

document.getElementById("prev-day").addEventListener("click", () => { dayOffset--; render(); });
document.getElementById("next-day").addEventListener("click", () => { dayOffset++; render(); });

els.noteAction.addEventListener("click", () => {
  if (mode === "example") {
    team = [];
    els.name.focus();
  }
  saveTeam(); // for a shared team this keeps it as the user's own
  render();
});

els.shareBtn.addEventListener("click", onShare);

// keep the "now" line and local times fresh
setInterval(render, 60 * 1000);

// on small screens the board scrolls sideways, so start it near the current hour
function scrollToNow() {
  const scroller = document.querySelector(".board-scroll");
  const nowLabel = els.board.querySelector(".hour-label.now");
  if (!nowLabel || scroller.scrollWidth <= scroller.clientWidth) return;
  const personColumn = els.board.querySelector(".person");
  const offset = personColumn ? personColumn.offsetWidth : 0;
  scroller.scrollLeft = nowLabel.offsetLeft - offset - nowLabel.offsetWidth * 2;
}

fillSelects();
fillZoneSuggestions();
loadTeam();
render();
scrollToNow();
