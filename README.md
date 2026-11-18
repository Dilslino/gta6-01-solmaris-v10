# SOLMARIS — Sunset City

[![Bounty gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?ref=5548afh3)
[![Rank](https://make.fun/badge/gta6-01/Dilslino/gta6-01-solmaris-v10/rank.svg)](https://make.fun/bounty/gta6-01?ref=5548afh3)
[![Reward](https://make.fun/badge/gta6-01/Dilslino/gta6-01-solmaris-v10/reward.svg)](https://make.fun/bounty/gta6-01?ref=5548afh3)

A 3D open-world driving game set in **Solmaris**, a procedural coastal city at
sunset. Walk the streets on foot, hop in your car, run delivery missions,
collect coins and crates, and beat the clock — all rendered in three.js with
every asset generated procedurally at runtime. No external assets, no network
requests while playing.

## Play

Open `game/index.html` in a desktop browser (serve the `game/` folder with any
static server, e.g. `node serve.ts` is not included — use
`python3 -m http.server` inside `game/`), or run the entry with
`MAKEFUN_OUTPUT_DIR=out node main.ts` and open the copied game.

## Controls

| Key | Action |
| --- | --- |
| W A S D / Arrow keys | Walk / drive |
| Shift | Run (on foot) |
| E | Get in / out of the car (also the on-screen mode button) |
| Mouse drag | Orbit camera |
| Mouse wheel | Zoom camera |
| Enter | Start from the title screen |

## Gameplay

- **Deliveries:** drive or walk to the glowing beacon marker before the timer
  runs out. Each completed delivery pays **$120**.
- **Coins:** golden coins scattered around the city, **$10** each.
- **Crates:** supply crates worth **$25** each.
- **Coin Rush:** collect 5 coins within 60 seconds for a **$100** bonus.
- You start with **$250**. The HUD shows your cash, current objective,
  mission timer, speed, and a live top-down minimap.

## Tech

- three.js (vendored under `game/vendor/`, loaded from the local import map —
  the game works fully offline)
- Procedural city: seeded building generation, canvas-textured roads and
  facades, palm trees, beach, animated sea, pier, distant mountains, fog
- Single deterministic seed, so the city is identical on every load
- `main.ts` (Node 22, standard library only) copies `game/` and
  `screenshots/` into `$MAKEFUN_OUTPUT_DIR` and writes `dossier.json`
