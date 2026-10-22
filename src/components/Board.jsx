import { Fragment, useEffect, useRef, useState } from "react";
import { cityFromZone, formatTime, localTime } from "../time.js";
import { copyText, shareLink, dayText } from "../team.js";

export default function Board({ team, dates, slots, best, dayOffset, yourZone, onPrevDay, onNextDay, onRemove }) {
  const scrollRef = useRef(null);
  const [share, setShare] = useState(null); // { link, copied } after "Copy share link"
  const nowHour = dayOffset === 0 ? new Date().getHours() : -1;
  const inBest = i => best && i >= best.start && i < best.start + best.length;

  // on small screens the board scrolls sideways, so start it near the current hour
  useEffect(() => {
    const scroller = scrollRef.current;
    const nowLabel = scroller?.querySelector(".hour-label.now");
    if (!nowLabel || scroller.scrollWidth <= scroller.clientWidth) return;
    const person = scroller.querySelector(".person");
    const offset = person ? person.offsetWidth : 0;
    scroller.scrollLeft = nowLabel.offsetLeft - offset - nowLabel.offsetWidth * 2;
  }, []);

  return (
    <section className="board-section">
      <div className="board-head">
        <div className="day-nav" role="group" aria-label="Choose day">
          <button type="button" onClick={onPrevDay} aria-label="Previous day">‹</button>
          <span>{dayText(dayOffset)}</span>
          <button type="button" onClick={onNextDay} aria-label="Next day">›</button>
        </div>
        <p className="your-zone">Times across the top are in <strong>{yourZone.replace(/_/g, " ")}</strong></p>
        <button type="button" className="share-btn" disabled={team.length === 0}
          onClick={async () => { const link = shareLink(team); setShare({ link, copied: await copyText(link) }); }}>
          Copy share link
        </button>
      </div>
      {share && <ShareResult share={share} />}

      <div className="board-scroll" ref={scrollRef}>
        <div className="board" role="table" aria-label="Working hours for each teammate">
          <div className="hour-label" />
          {dates.map((d, i) => (
            <div key={i} role="columnheader" className={"hour-label" + (i === nowHour ? " now" : "")}>
              {String(d.getHours()).padStart(2, "0")}
            </div>
          ))}

          {team.length === 0 && <div className="empty">Your team's working hours will show here.</div>}

          {team.map(member => (
            <Fragment key={member.id}>
              <div className="person" role="rowheader">
                <span className="who">
                  <span className="name">{member.name}</span>
                  <span className="meta">
                    {cityFromZone(member.zone)} · <b>{formatTime(localTime(member.zone, new Date()))}</b> now
                  </span>
                </span>
                <button type="button" className="remove" aria-label={`Remove ${member.name}`} onClick={() => onRemove(member.id)}>
                  ✕
                </button>
              </div>

              {dates.map((d, i) => {
                const local = localTime(member.zone, d);
                const working = slots[i].working.includes(member.id);
                const night = local.hour >= 22 || local.hour < 6;
                let cls = "cell";
                if (working) cls += " work";
                else if (night) cls += " night";
                if (inBest(i)) cls += " overlap";
                if (i === nowHour) cls += " now";
                return (
                  <div
                    key={i}
                    role="cell"
                    className={cls}
                    title={`${member.name}: ${formatTime(local)} local${working ? ", working" : ""}`}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <ul className="legend">
        <li><span className="swatch work"></span>Working</li>
        <li><span className="swatch night"></span>Night (22:00–06:00 local)</li>
        <li><span className="swatch overlap"></span>Everyone working</li>
      </ul>
    </section>
  );
}

// Shows the link, and selects it for manual copying if the clipboard was blocked.
function ShareResult({ share }) {
  const inputRef = useRef(null);
  useEffect(() => {
    if (!share.copied) inputRef.current?.select();
  }, [share]);

  return (
    <div className="share-result">
      <p role="status">
        {share.copied
          ? "Link copied. Anyone who opens it sees this team. Nothing is stored on a server."
          : "Copy this link and send it to your team:"}
      </p>
      <input ref={inputRef} type="text" readOnly value={share.link} aria-label="Share link" />
    </div>
  );
}
