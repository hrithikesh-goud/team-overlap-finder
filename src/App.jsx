import { useEffect, useMemo, useState } from "react";
import { buildSlots, bestOverlap } from "./time.js";
import { loadInitialTeam, saveTeam, slotDates, newId } from "./team.js";
import Summary from "./components/Summary.jsx";
import Board from "./components/Board.jsx";
import AddForm from "./components/AddForm.jsx";
import Note from "./components/Note.jsx";

const yourZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export default function App() {
  // load once: a shared link, the saved team, or the example team
  const [initial] = useState(loadInitialTeam);
  const [team, setTeam] = useState(initial.team);
  const [mode, setMode] = useState(initial.mode); // "saved", "example" or "shared"
  const [dayOffset, setDayOffset] = useState(0);
  const [tick, setTick] = useState(0);

  // keep the "now" line and local times fresh
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // the team becomes the user's own as soon as they change it
  function updateTeam(next) {
    setTeam(next);
    setMode("saved");
    saveTeam(next);
  }

  function addMember(member) {
    const base = mode === "example" ? [] : team;
    updateTeam([...base, { ...member, id: newId() }]);
  }

  function removeMember(id) {
    updateTeam(team.filter(m => m.id !== id));
  }

  function onNoteAction() {
    updateTeam(mode === "example" ? [] : team);
  }

  // recalculated only when the team, day or minute changes
  const dates = useMemo(() => slotDates(dayOffset), [dayOffset, tick]);
  const slots = useMemo(() => buildSlots(team, dates), [team, dates]);
  const best = useMemo(() => bestOverlap(slots, team.length), [slots, team.length]);

  return (
    <main className="page">
      <header className="top">
        <h1>Team Overlap Finder</h1>
        <p className="tagline">Add where your teammates are. See the hours you can all meet.</p>
      </header>

      <Summary team={team} dates={dates} slots={slots} best={best} dayOffset={dayOffset} yourZone={yourZone} />

      <Board
        team={team}
        dates={dates}
        slots={slots}
        best={best}
        dayOffset={dayOffset}
        yourZone={yourZone}
        onPrevDay={() => setDayOffset(d => d - 1)}
        onNextDay={() => setDayOffset(d => d + 1)}
        onRemove={removeMember}
      />

      <AddForm onAdd={addMember} />

      <Note mode={mode} hasTeam={team.length > 0} onAction={onNoteAction} />

      <footer className="foot">Everything is saved in your browser. Nothing is sent anywhere.</footer>
    </main>
  );
}
