const STORAGE_KEY = "team-overlap-finder.team";
const yourZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const EXAMPLE_TEAM = [
  { name: "Hrithikesh", zone: "Europe/Dublin", start: 9, end: 17 },
  { name: "Priya", zone: "Asia/Kolkata", start: 12, end: 20 },
  { name: "Sam", zone: "America/New_York", start: 7, end: 15 }
];

let team = [];
let isExample = false;
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
  exampleNote: document.getElementById("example-note")
};

function newId() {
  return Math.random().toString(36).slice(2, 9);
}

/* ---------- saving ---------- */

function loadTeam() {
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
  isExample = true;
}

function saveTeam() {
  isExample = false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
  } catch {
    // not critical, the team still works for this visit
  }
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
  els.exampleNote.hidden = !isExample || team.length === 0;

  const dates = slotDates();
  const slots = TimeMath.buildSlots(team, dates);
  const best = TimeMath.bestOverlap(slots, team.length);

  renderSummary(dates, slots, best);
  renderBoard(dates, slots, best);
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
      <ul class="locals">${locals}</ul>`;
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

  if (isExample) team = [];
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

document.getElementById("clear-example").addEventListener("click", () => {
  team = [];
  saveTeam();
  render();
  els.name.focus();
});

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
