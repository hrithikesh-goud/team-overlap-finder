# Team Overlap Finder

When your team is spread across Dublin, Bengaluru and New York, finding a meeting time means doing time-zone maths in your head. This app does it for you.

Add each teammate's city and working hours. You'll see everyone's day on one board, in your own time zone, with the hours when everyone is working highlighted and the best meeting time at the top.

## Features

- Add teammates by city (e.g. "Dublin", "Bengaluru") or by time zone name (e.g. "Europe/Paris")
- Set each person's working hours, including overnight shifts like 22:00–06:00
- 24-hour board in your local time, showing working hours, night hours and a line for the current hour
- Best meeting time, shown in your time and in each teammate's local time
- If no hour works for everyone, it shows the hour that suits the most people
- **Copy share link**: the team is stored in the link itself, so teammates open the same board with no sign-up and no server
- **Copy meeting invite**: a ready-to-paste message with the meeting time in everyone's local time
- Move between days, which matters around daylight saving changes
- Your team is saved in the browser (`localStorage`), so it's still there next time
- Works on phones; the board scrolls sideways and opens at the current hour

## How the overlap is worked out

The board has 24 one-hour slots for the chosen day in your time zone. For each slot, the app converts the start time into each teammate's local time with `Intl.DateTimeFormat`. A slot only counts as working if the **whole hour** fits inside that person's hours. This matters for half-hour time zones like India (UTC+5:30), where 16:30–17:30 doesn't count for someone who finishes at 17:00.

The best meeting time is the longest unbroken run of slots where everyone is working. If two runs are the same length, the earlier one wins.

All of this lives in `js/time.js`, which has no DOM code so it can be tested on its own.

## How share links work

The team is turned into a small JSON list of `[name, zone, start, end]` and put in the URL after `#team=`. Anything after `#` never reaches the server, so the link carries the whole team without needing a database. When someone opens a link, every entry is checked (valid time zone, hours between 0 and 24, a name), and a broken or edited link is ignored. A shared team isn't saved over your own until you click **Save as my team**.

## Run it

Open `index.html` in a browser. There's no build step and nothing to install.

## Tests

The time-zone logic has tests using Node's built-in test runner (Node 18 or newer):

```bash
npm test
```

GitHub Actions runs the same tests on every push (`.github/workflows/test.yml`).

## Project structure

```
index.html            page layout
css/styles.css        styles, light and dark themes
js/time.js            time-zone and overlap logic (tested)
js/app.js             form, board and saving
tests/time.test.js    tests for js/time.js
```

## Tech

HTML, CSS and JavaScript with no frameworks or libraries. Time zones come from the browser's built-in `Intl` API, so there's no external API or key.

## Ideas for next

- Let each person set different hours per day
- Mark public holidays per country
