# Nautilus2K — ZX-Nautilus Minesweeper

A ZX Spectrum-style submarine simulator. You command the *ZX-Nautilus*, a deep-sea mine-clearing submarine sent to recover the lost Gaia Stone from a flooded minefield.

Built on [zx-kit](https://github.com/zrebec/zx-kit) — the same authentic 256×192 Spectrum palette, 8×8 attribute cells, and pixel-perfect rendering used in [Minefield](https://github.com/zrebec/minefield).

## Status

**Phase 3b — gameplay** (current). The submarine moves, the controls work, ten mines exist in the world, sonar tracks contacts in range, the periscope projects what's in front of you, resources drain.

Still hardcoded for Phase 3b: power source is always `ELEC`, no disarming mechanism, no win or lose condition, the Gaia Stone is a label without a location. **Phase 3c** will add disarming (`F` key over a mine), win condition (find the Gaia Stone), lose conditions (0 oxygen, 0 lives, hull failure), and a game-over screen.

## Controls

| Key | Action |
|-----|--------|
| `S`        | Start / stop the engine — throttle does nothing while the engine is off |
| `←` / `→`  | Rotate heading (30°/sec while held) |
| `↑` / `↓`  | Throttle up / down (target speed 0–12 knots) |
| `A`        | Ascend (blow ballast — pump air in, push water out) |
| `D`        | Dive (flood ballast — pull water in, vent air out) |

You start **at the surface, engine off, ballast full of air**. Press `S` to crank the engine, then `↑` to set a throttle. Hold `D` for several seconds to flood the ballast tanks — the sub will start sinking once it gets water-heavy. Hold `A` to surface.

Speed smoothly chases throttle (the engine isn't instantaneous). Ballast fills slowly enough that you can actually feel the depth change. The periscope shows sky-and-sea above 5 m and an underwater reticle once you're properly submerged.

## Audio

Click anywhere or press any key once to unlock the AudioContext (browsers require a user gesture). After that:
- Engine drone on AY channel A — pitch and volume scale with current speed
- "Cranking" and "wind-down" jingles when you toggle the engine
- Quick descending thud when the hull touches a mine

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
