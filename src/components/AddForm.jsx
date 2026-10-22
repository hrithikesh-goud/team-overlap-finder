import { useMemo, useRef, useState } from "react";
import { allTimeZones, cityFromZone, resolveZone } from "../time.js";

const HOURS_START = Array.from({ length: 24 }, (_, h) => h);       // 0..23
const HOURS_END = Array.from({ length: 24 }, (_, h) => h + 1);     // 1..24
const label = h => String(h).padStart(2, "0") + ":00";

export default function AddForm({ onAdd }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [start, setStart] = useState(9);
  const [end, setEnd] = useState(17);
  const [error, setError] = useState("");
  const nameRef = useRef(null);
  const cityRef = useRef(null);

  // the suggestion list only needs building once
  const zoneOptions = useMemo(() => allTimeZones().map(z => `${cityFromZone(z)} (${z})`), []);

  function onSubmit(e) {
    e.preventDefault();
    setError("");

    const zone = resolveZone(city);
    if (!name.trim()) {
      setError("Add a name so you know whose row is whose.");
      nameRef.current.focus();
      return;
    }
    if (!zone) {
      setError(`"${city.trim() || "That"}" isn't a city we recognise. Pick one from the suggestions, or try the nearest big city.`);
      cityRef.current.focus();
      return;
    }
    if (start === end) {
      setError("Start and finish can't be the same hour.");
      return;
    }

    onAdd({ name: name.trim(), zone, start, end });
    setName("");
    setCity("");
    setStart(9);
    setEnd(17);
    nameRef.current.focus();
  }

  return (
    <section className="add">
      <h2>Add a teammate</h2>
      <form id="add-form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" ref={nameRef} type="text" maxLength={30} placeholder="Priya"
            value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="city">City or time zone</label>
          <input id="city" ref={cityRef} type="text" list="zone-list" placeholder="Bengaluru"
            value={city} onChange={e => setCity(e.target.value)} />
          <datalist id="zone-list">
            {zoneOptions.map(opt => <option key={opt} value={opt} />)}
          </datalist>
        </div>
        <div className="field small">
          <label htmlFor="start">Starts</label>
          <select id="start" value={start} onChange={e => setStart(Number(e.target.value))}>
            {HOURS_START.map(h => <option key={h} value={h}>{label(h)}</option>)}
          </select>
        </div>
        <div className="field small">
          <label htmlFor="end">Finishes</label>
          <select id="end" value={end} onChange={e => setEnd(Number(e.target.value))}>
            {HOURS_END.map(h => <option key={h} value={h}>{label(h)}</option>)}
          </select>
        </div>
        <button type="submit" className="primary">Add</button>
      </form>
      <p className="form-error" role="alert">{error}</p>
    </section>
  );
}
