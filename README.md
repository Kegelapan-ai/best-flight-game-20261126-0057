# Langit Nusantara

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Kegelapan-ai/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Kegelapan-ai/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**Langit Nusantara** is an original island-hopping courier flight game: fly a
small turboprop at dawn over an Indonesian archipelago, thread eight glowing
target rings, watch your fuel, and put the aircraft down on the runway of
Pulau Bintang. Chase view, lit instruments, and a HUD with altitude, speed
and heading — all drawn in code, all sounds synthesised, no assets borrowed
from anywhere.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no
network request: the game is plain static files under `game/`.

## Controls

- **Arrow Up / Down** — pitch up and down
- **Arrow Left / Right** (or A / D) — bank and turn
- **W / S** (or Shift / Ctrl) — throttle up and down
- **Mouse** — gentle steering by pointer position
- **1 / 2 / 3** — pick a mission on the title screen
- **Enter** — start · **P** — pause · **R** — fly again · **M** — mute

## Missions

1. **Latihan Ring** — fly the eight golden rings over the sea.
2. **Antar Paket Pulau** — rings, then land on Pulau Bintang's runway.
3. **Badai Sore** — the same flight in gusting wind with 70% fuel.

A ring scores 100 points plus a speed bonus. A clean landing scores 500
plus a fuel bonus. Touch the sea, or slam onto the runway too fast, and the
flight is over. The best score is kept on your machine.

## Files

- `main.ts` — the entry program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with the vendored make.fun
  library.
- `game/index.html` — the playable game, opened in a desktop browser.
- `game/src/config.js` — tunables: speeds, fuel, rings, missions.
- `game/src/random.js` — seeded random generator for the course.
- `game/src/world.js` — islands, rings, runway, clouds and boats.
- `game/src/flight.js` — the flight model: throttle, bank, pitch, stall.
- `game/src/render.js` — chase view, aircraft, HUD and lit instruments.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — synthesised engine, wind and ring chimes.
- `game/src/shots.js` — staged scenes for the entry screenshots.
- `game/src/main.js` — the game loop, states and scoring.
- `screenshots/` — real renders of the game's own code.

## Screenshots

1. `1-start.jpg` — rolling for take-off, runway ahead.
2. `2-play.jpg` — mid-flight, the third ring glowing ahead.
3. `3-ring.jpg` — a heartbeat from the fourth ring.
4. `4-land.jpg` — final approach to Pulau Bintang.

---

<sub>Entered on [make.fun](https://make.fun/?ref=okok&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
