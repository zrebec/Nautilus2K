import { CELL as _CELL } from 'zx-kit'
export { CELL, C, type SpectrumColor } from 'zx-kit'

export const COLS = 32       // 256 / 8
export const ROWS = 24       // 192 / 8
export const CANVAS_W = 256  // game pixels
export const CANVAS_H = 192

// ── Vertical layout sections ─────────────────────────────────────────────────
// Whole screen is 24 rows. Each "row" is 8 game pixels = 32 CSS pixels @ SCALE=4.
//
//   0       STATUS LINE         (1 row, 8 px)  — MINE AHEAD / PWR
//   1-13    PERISCOPE VIEW      (13 rows, 104 px)
//   14      SECTION LABELS      (1 row, 8 px)  — SONAR / BALLAST / MOTOR / STATUS
//   15-21   DASHBOARD WIDGETS   (7 rows, 56 px)
//   22-23   BOTTOM TICKER       (2 rows, 16 px — 1 separator + 1 text row)
//
export const STATUS_Y = 0
export const PERISCOPE_Y = _CELL                 //  8
export const PERISCOPE_H = _CELL * 13             // 104
export const SECT_LABEL_Y = _CELL * 14             // 112
export const DASHBOARD_Y = _CELL * 15             // 120
export const DASHBOARD_H = _CELL * 7              // 56
export const BOTTOM_Y = _CELL * 23             // 184
