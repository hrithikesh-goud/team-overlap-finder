import test from "node:test";
import assert from "node:assert/strict";
import * as T from "../src/time.js";

const at = iso => new Date(iso);

test("resolveZone understands cities, aliases and full zone names", () => {
  assert.equal(T.resolveZone("Dublin"), "Europe/Dublin");
  assert.equal(T.resolveZone("  new york "), "America/New_York");
  assert.equal(T.resolveZone("Bengaluru"), "Asia/Kolkata");
  assert.equal(T.resolveZone("Europe/Paris"), "Europe/Paris");
  assert.equal(T.resolveZone("Dublin (Europe/Dublin)"), "Europe/Dublin");
  assert.equal(T.resolveZone("Atlantis"), null);
  assert.equal(T.resolveZone(""), null);
});

test("localTime handles half-hour offsets", () => {
  // India is UTC+5:30
  assert.deepEqual(T.localTime("Asia/Kolkata", at("2026-10-21T08:00:00Z")), { hour: 13, minute: 30 });
  assert.equal(T.formatTime({ hour: 7, minute: 5 }), "07:05");
});

test("isWorkingSlot only counts slots fully inside working hours", () => {
  const priya = { id: "p", zone: "Asia/Kolkata", start: 9, end: 17 };
  assert.equal(T.isWorkingSlot(priya, at("2026-10-21T03:00:00Z")), false); // 08:30 local
  assert.equal(T.isWorkingSlot(priya, at("2026-10-21T04:00:00Z")), true);  // 09:30
  assert.equal(T.isWorkingSlot(priya, at("2026-10-21T10:00:00Z")), true);  // 15:30-16:30
  assert.equal(T.isWorkingSlot(priya, at("2026-10-21T11:00:00Z")), false); // 16:30-17:30
});

test("isWorkingSlot supports overnight shifts", () => {
  const night = { id: "n", zone: "UTC", start: 22, end: 6 };
  assert.equal(T.isWorkingSlot(night, at("2026-10-21T23:00:00Z")), true);
  assert.equal(T.isWorkingSlot(night, at("2026-10-21T02:00:00Z")), true);
  assert.equal(T.isWorkingSlot(night, at("2026-10-21T12:00:00Z")), false);
});

// 24 one-hour slots starting at midnight UTC on 21 Oct 2026
const day = Array.from({ length: 24 }, (_, h) => at(`2026-10-21T${String(h).padStart(2, "0")}:00:00Z`));

test("bestOverlap finds the shared block for Dublin and India", () => {
  // Dublin is UTC+1 on 21 Oct (summer time ends 25 Oct)
  const team = [
    { id: "h", zone: "Europe/Dublin", start: 9, end: 17 },
    { id: "p", zone: "Asia/Kolkata", start: 9, end: 17 }
  ];
  const slots = T.buildSlots(team, day);
  // Dublin works 08-16 UTC, India 04-10 UTC (full slots) -> overlap 08, 09, 10
  assert.deepEqual(T.bestOverlap(slots, team.length), { start: 8, length: 3 });
});

test("no full overlap falls back to the slots with the most people", () => {
  const team = [
    { id: "h", zone: "Europe/Dublin", start: 9, end: 17 },
    { id: "p", zone: "Asia/Kolkata", start: 9, end: 17 },
    { id: "s", zone: "America/New_York", start: 9, end: 17 }
  ];
  const slots = T.buildSlots(team, day);
  assert.equal(T.bestOverlap(slots, team.length), null);
  const most = T.mostPeopleSlots(slots);
  assert.equal(most.count, 2);
  assert.ok(most.indexes.includes(8));  // Dublin + India
  assert.ok(most.indexes.includes(13)); // Dublin + New York
});

test("a shared team survives the round trip through a link", () => {
  const team = [
    { id: "a", name: "Hrithikesh", zone: "Europe/Dublin", start: 9, end: 17 },
    { id: "b", name: "Priya & co", zone: "Asia/Kolkata", start: 22, end: 6 }
  ];
  const back = T.decodeTeam(T.encodeTeam(team));
  assert.deepEqual(back, [
    { name: "Hrithikesh", zone: "Europe/Dublin", start: 9, end: 17 },
    { name: "Priya & co", zone: "Asia/Kolkata", start: 22, end: 6 }
  ]);
});

test("broken or tampered share links are rejected", () => {
  assert.equal(T.decodeTeam("not json"), null);
  assert.equal(T.decodeTeam(encodeURIComponent("[]")), null);
  assert.equal(T.decodeTeam(encodeURIComponent('[["Sam","Mars/Base",9,17]]')), null);
  assert.equal(T.decodeTeam(encodeURIComponent('[["Sam","UTC",9,9]]')), null);
  assert.equal(T.decodeTeam(encodeURIComponent('[["Sam","UTC",9,30]]')), null);
  assert.equal(T.decodeTeam(encodeURIComponent('[["","UTC",9,17]]')), null);
});

test("bestOverlap prefers the longest block, then the earliest", () => {
  const slots = [[1], [], [1], [1], [], [1], [1]].map(w => ({ working: w }));
  assert.deepEqual(T.bestOverlap(slots, 1), { start: 2, length: 2 });
  assert.equal(T.bestOverlap([], 0), null);
});
