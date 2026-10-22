import { useState } from "react";
import { formatTime, localTime, mostPeopleSlots } from "../time.js";
import { copyText, inviteText, dayText } from "../team.js";

export default function Summary({ team, dates, slots, best, dayOffset, yourZone }) {
  const day = dayText(dayOffset);

  if (team.length === 0) {
    return (
      <section className="summary" aria-live="polite">
        <p className="label">No one here yet</p>
        <p className="big">Add your first teammate</p>
        <p className="sub">Put in their city and working hours below, and their day appears on the board.</p>
      </section>
    );
  }

  if (team.length === 1) {
    return (
      <section className="summary" aria-live="polite">
        <p className="label">One person on the team</p>
        <p className="big">Add someone else</p>
        <p className="sub">The overlap shows up once there are at least two people.</p>
      </section>
    );
  }

  if (best) {
    const startDate = dates[best.start];
    const endDate = new Date(startDate.getTime() + best.length * 3600 * 1000);
    return (
      <section className="summary" aria-live="polite">
        <p className="label">Best time for everyone {day.toLowerCase()}</p>
        <p className="big">
          {formatTime(localTime(yourZone, startDate))}–{formatTime(localTime(yourZone, endDate))}
        </p>
        <p className="sub">
          {best.length} {best.length === 1 ? "hour" : "hours"} when all {team.length} of you are working. In each person's time:
        </p>
        <ul className="locals">
          {team.map(m => (
            <li key={m.id}>
              {m.name}: <b>{formatTime(localTime(m.zone, startDate))}–{formatTime(localTime(m.zone, endDate))}</b>
            </li>
          ))}
        </ul>
        <InviteButton text={inviteText(team, startDate, endDate)} />
      </section>
    );
  }

  // nobody fully overlaps
  const most = mostPeopleSlots(slots);
  if (most.count === 0) {
    return (
      <section className="summary none" aria-live="polite">
        <p className="label">{day}</p>
        <p className="big">Nobody is working</p>
        <p className="sub">Try another day with the arrows on the board.</p>
      </section>
    );
  }

  const firstIndex = most.indexes[0];
  const names = team.filter(m => slots[firstIndex].working.includes(m.id)).map(m => m.name);
  return (
    <section className="summary none" aria-live="polite">
      <p className="label">No hour works for everyone {day.toLowerCase()}</p>
      <p className="big">Closest: {formatTime(localTime(yourZone, dates[firstIndex]))}</p>
      <p className="sub">
        {most.count} of {team.length} people are working then ({names.join(", ")}). Someone would need to start early or stay late.
      </p>
    </section>
  );
}

function InviteButton({ text }) {
  const [status, setStatus] = useState("");

  async function onCopy() {
    const copied = await copyText(text);
    setStatus(copied ? "Copied. Paste it into Slack, Discord or an email." : "Couldn't copy here. Try a different browser.");
  }

  return (
    <div className="invite-row">
      <button type="button" className="invite-btn" onClick={onCopy}>Copy meeting invite</button>
      <span role="status">{status}</span>
    </div>
  );
}
