# Nautilus2K — ZX-Nautilus Minesweeper

A ZX Spectrum-style submarine simulator. You command the *ZX-Nautilus*, a deep-sea mine-clearing submarine sent to recover the lost Gaia Stone from a flooded minefield.

Built on [zx-kit](https://github.com/zrebec/zx-kit) — the same authentic 256×192 Spectrum palette, 8×8 attribute cells, and pixel-perfect rendering used in [Minefield](https://github.com/zrebec/minefield).

## Status

**Phase 3b — gameplay** (current). The submarine moves, the controls work, ten mines exist in the world, sonar tracks contacts in range, the periscope projects what's in front of you, resources drain.

Still hardcoded for Phase 3b: power source is always `ELEC`, no disarming mechanism, no win or lose condition, the Gaia Stone is a label without a location. **Phase 3c** will add disarming (`F` key over a mine), win condition (find the Gaia Stone), lose conditions (0 oxygen, 0 lives, hull failure), and a game-over screen.

## Controls

| Key | Action |
|-----|--------|
| `←` / `→`  | Rotate heading (30°/sec while held) |
| `↑` / `↓`  | Throttle up / down (target speed 0–12 knots) |
| `W` / `S`  | Blow / flood ballast (depth control) |

Speed smoothly chases throttle — the engine isn't instantaneous. Heading rolls at a constant rate so precise navigation takes a moment. Ballast at 50/50 is neutral buoyancy; air-heavy ascends, water-heavy descends.

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
├── main.ts         — canvas setup, init input, RAF loop with dt
├── constants.ts    — SCALE/CELL re-exports, layout Y-coordinates
├── state.ts        — GameState + world (mines, ranges), initial state, math helpers
├── game.ts         — tickGame(dt): reads inputs, applies physics, checks collisions
└── render.ts       — pure rendering from state, derives sonar/periscope contacts inline
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
