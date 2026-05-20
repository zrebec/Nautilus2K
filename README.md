# Nautilus2K — ZX-Nautilus Minesweeper

A ZX Spectrum-style submarine simulator. You command the *ZX-Nautilus*, a deep-sea mine-clearing submarine sent to recover the lost Gaia Stone from a flooded minefield.

Built on [zx-kit](https://github.com/zrebec/zx-kit) — the same authentic 256×192 Spectrum palette, 8×8 attribute cells, and pixel-perfect rendering used in [Minefield](https://github.com/zrebec/minefield).

## Status

**Phase 2 — layout** (current). Dashboard is drawn, widgets read from a hardcoded state snapshot. No gameplay yet — the screen always shows the same readings.

Coming next: **Phase 3 — gameplay.** Ballast affects depth, motor draws battery, contacts move on the periscope, the Gaia Stone exists somewhere.

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
├── main.ts         — canvas setup + RAF loop
├── constants.ts    — SCALE/CELL re-exports, layout Y-coordinates
├── state.ts        — SubmarineState type + DEMO_STATE for Phase 2
└── render.ts       — all rendering: title, periscope, dashboard, ticker
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
