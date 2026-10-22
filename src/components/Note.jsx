export default function Note({ mode, hasTeam, onAction }) {
  if (mode === "example" && hasTeam) {
    return (
      <div className="example-note">
        <p>This is an example team so you can see how it works.</p>
        <button type="button" onClick={onAction}>Clear and start my own</button>
      </div>
    );
  }
  if (mode === "shared") {
    return (
      <div className="example-note">
        <p>You're looking at a team someone shared with you. It isn't saved yet.</p>
        <button type="button" onClick={onAction}>Save as my team</button>
      </div>
    );
  }
  return null;
}
