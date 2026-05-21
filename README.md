# Nautilus2K — ZX-Nautilus Minesweeper

A ZX Spectrum-style submarine simulator. You command the *ZX-Nautilus*, a deep-sea mine-clearing submarine sent to recover the lost Gaia Stone from a flooded minefield.

Built on [zx-kit](https://github.com/zrebec/zx-kit) — the same authentic 256×192 Spectrum palette, 8×8 attribute cells, and pixel-perfect rendering used in [Minefield](https://github.com/zrebec/minefield).

## Status

**Phase 3b — gameplay** (current). The submarine moves, the controls work, ten mines exist in the world, sonar tracks contacts in range, the periscope projects what's in front of you, resources drain.

Still hardcoded for Phase 3b: power source is always `ELEC`, no disarming mechanism, no win or lose condition, the Gaia Stone is a label without a location. **Phase 3c** will add disarming (`F` key over a mine), win condition (find the Gaia Stone), lose conditions (0 oxygen, 0 lives, hull failure), and a game-over screen.

## Controls

| Key | Action |
|-----|--------|
| `S`        | Cycle engine mode (see below) |
| `←` / `→`  | Swing rudder port / starboard (auto-centres when released) |
| `↑` / `↓`  | Throttle up / down (target speed 0–12 knots) |
| `A`        | Ascend (blow ballast — pump air in, push water out) |
| `D`        | Dive (flood ballast — pull water in, vent air out) |

## Engine modes

A real diesel-electric submarine carries two propulsion systems. The ZX-Nautilus models the basics of both:

| Mode | Where it works | Battery | What it sounds like |
|------|----------------|---------|---------------------|
| **OFF** | Anywhere | No change | Silent |
| **DIESEL** | Only at depth ≤ 5 m (auto-floods deeper) | **Charges** (the whole reason to surface) | Low, throaty rumble + sub-octave |
| **ELEC** | Any depth | Drains | High, clean whine |

`S` cycles `OFF → DIESEL → ELEC → OFF` at the surface. Underwater, `DIESEL` is skipped automatically (it'd auto-shut-off on the next frame anyway). The typical procedure:

1. Press `S` once on the surface → **DIESEL** drives you to a dive location and charges the battery.
2. Press `S` again → **ELEC** (prepare for dive — diesels can't run underwater).
3. Throttle up with `↑`, then hold `D` to flood ballast.
4. Sub descends. Periscope flips to submerged-reticle mode at 5 m.
5. To return: hold `A` to blow ballast, surface, press `S` to get back to DIESEL.

## Movement physics

- **Speed catches throttle smoothly** — engine inertia, not instant
- **Depth needs forward motion** — at zero speed the dive planes have no water flow to bite into. Ballast is set but nothing happens until you have RPMs
- **Rudder controls heading** — holding `←`/`→` swings the rudder, releasing lets it self-centre. Turn rate = rudder angle × speed × factor, so a stopped sub doesn't turn
- The periscope shows sky-and-sea above 5 m and an underwater reticle once submerged

## Audio

Click anywhere or press any key once to unlock the AudioContext (browsers require a user gesture). After that:

- **Engine drone** — AY channel A. Diesel adds a sub-octave on channel C for the throaty rumble; electric is a clean rising whine.
- **Sonar ping** — periodic beep when there's a contact in range. Faster pinging the closer the nearest mine gets (300 ms at point-blank, 2.5 s at the edge).
- **Ballast hiss** — AY noise channel B while you hold `A` or `D`. Higher pitch for blowing air, lower for flooding water.
- **Engine start / stop jingles** — three-note rising / falling sequences.
- **Diesel-flood warning** — distinctive warble when DIESEL auto-shuts down on dive.
- **Mine collision** — descending four-step thud.
- **Low-resource alarms** — periodic warning beeps when oxygen < 20 % (every 3 s, high pitch) or battery < 20 % while on ELEC (every 5 s, low pitch).

## Development

```bash
npm install
npm run dev      # http://localhost:5177/
npm run build    # → dist/
```

Requires Node 22+.

## Architecture

```
src/
├── main.ts         — canvas setup, init input + audio, RAF loop with dt
├── constants.ts    — SCALE/CELL re-exports, layout Y-coordinates
├── state.ts        — GameState + world (mines, ranges), initial state, math helpers
├── game.ts         — tickGame(dt): reads inputs, applies physics, checks collisions
├── audio.ts        — engine drone (AY), engine start/stop jingles, mine-hit SFX
└── render.ts       — pure rendering from state, surface vs submerged periscope modes
```

The layout fits the 256×192 native Spectrum resolution exactly:

| Row(s) | Section |
|--------|---------|
| 0      | Status (mine warning + power source) |
| 1–13   | Periscope view (104 px) — crosshair, range ticks, mock contacts |
| 14     | Section labels |
| 15–21  | Dashboard widgets (sonar, ballast, motor, status) |
| 22–23  | Bottom ticker — compass + heading degrees + counter |

## License

MIT.
