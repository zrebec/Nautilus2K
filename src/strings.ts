/**
 * strings.ts — all visible text in Nautilus2K, in one place.
 *
 * HOW TO LOCALISE
 * ───────────────
 * Change any string below and Vite hot-reloads the game instantly —
 * you immediately see whether the new text fits the fixed 256×192 layout.
 *
 * To ship a full locale: duplicate this file (e.g. strings.ru.ts),
 * translate every value, then re-export it as LANG from a thin
 * strings.ts barrel:
 *
 *   export { LANG } from './strings.ru.ts'
 *
 * PIXEL BUDGET GUIDE (ZX Spectrum 8×8 font, 256px wide canvas)
 * ──────────────────────────────────────────────────────────────
 * Full row (32 chars × 8 px):   256 px  — used by status line, bottom ticker
 * Periscope corner labels:      max ~10 chars per corner before overflow
 *
 * Section labels row (4 sections across 256 px):
 *   SONAR   starts at x=0,    fits ≤ 7 chars before BALLAST
 *   BALLAST starts at x=64,   fits ≤ 8 chars before MOTOR
 *   MOTOR   starts at x=128,  fits ≤ 9 chars before STATUS
 *   STATUS  starts at x=200,  fits ≤ 7 chars to right edge
 *
 * Ballast widget (2 columns, each 18 px wide):
 *   AIR / H2O labels: max 3 chars each
 *
 * Status bar labels (left of each bar):
 *   OXY / BAT / DMG: max 3 chars each
 *
 * Bottom ticker: heading degrees + M:X/Y + L:X share one 256-px row.
 *   M: prefix + 2+1+2 digits + space + L: prefix + 1 digit = ~10 chars right
 *
 * COMPASS NOTE
 * ────────────
 * drawCompassText() from zx-kit renders its own compass labels internally.
 * COMPASS_DIRS below is used only for the width-calculation helper in
 * render.ts (_compassWidthPx). To get fully custom compass labels you would
 * need to reimplement compass rendering — out of scope for now.
 * Cardinal directions (N / S / E / W) are internationally understood,
 * so leaving them in English is usually fine for any locale.
 */

// ── Engine mode labels (top-right, status line) ────────────────────────────
// Budget: ~10 chars max before right edge.
// Current longest: 'ENGINE OFF' = 10 chars × 8 px = 80 px. Fits flush.

export const ENGINE_LABELS: Record<'OFF' | 'DIESEL' | 'ELEC', string> = {
  OFF: 'ENGINE OFF',     // 10 chars
  DIESEL: 'PWR:DIESEL',  // 10 chars
  ELEC: 'PWR:ELEC',      //  8 chars — has breathing room
}

// ── Dive procedure phase labels (top-right, replaces engine label) ────────
// Shown while subMode === 'diving'. Replaces ENGINE_LABELS in the same slot.
// Budget: ≤ 12 chars to leave breathing room next to MINE AHEAD warning.

export const DIVE_PHASE_LABELS: Record<'klaxon' | 'shutdown' | 'engage' | 'flood', string> = {
  klaxon:   'DIVE: KLAXON',   // 12 chars
  shutdown: 'DIVE: SHTDWN',   // 12 chars (abbreviated)
  engage:   'DIVE: ELEC ON',  // 13 chars (slight overflow OK)
  flood:    'DIVE: FLOOD',    // 11 chars
}

// ── Surface procedure phase labels (top-right) ────────────────────────────
// Shown while subMode === 'surfacing'.

export const SURFACE_PHASE_LABELS: Record<'breach' | 'drain' | 'hatches', string> = {
  breach:  'SURF: BREACH',    // 12 chars
  drain:   'SURF: DRAIN',     // 11 chars
  hatches: 'SURF: HATCHES',   // 13 chars (slight overflow OK)
}

// ── Target depth readout (status widget, below D: and V:) ─────────────────
// Shown only while subMode === 'submerged'. Format mirrors STR_DEPTH.
// 'T:999M' = 6 chars. Fits the STATUS widget budget.

export const STR_TARGET_DEPTH = (m: number) => `T:${m}M`

// ── Heading-hold autopilot indicator (next to heading degrees, bottom) ────
// Short label that appears when headingHoldActive is true. Otherwise hidden.

export const STR_HEADING_HOLD = 'AUTO'

// ── Status line — mine-ahead warning (left side) ───────────────────────────
// Budget: leaves room for the engine label on the right.
// 'MINE AHEAD 220M' = 15 chars. Stays clear of a 10-char engine label.
// Template: receives rounded distance in metres.

export const STR_MINE_AHEAD = (distM: number) => `MINE AHEAD ${distM}M`

// ── Periscope — corner HUD labels ─────────────────────────────────────────

// Top-left: mission objective / target label.
// Budget: ≤ 10 chars before it risks overlapping CONTACTS (top-right).
// 'OBJ:GAIA'  = 8 chars. Change 'GAIA' to 'TARGET' for a generic sub.
export const STR_OBJECTIVE = 'OBJ:GAIA'

// Top-right: count of sonar contacts currently in range.
// Budget: label + number. 'CONTACTS:9' = 10 chars — right-aligned so fine.
// Template: receives contact count.
export const STR_CONTACTS = (n: number) => `CONTACTS:${n}`

// Bottom-left: relative bearing to nearest mine. '---' when none / surfaced.
// Budget: 'BRG:359' = 7 chars. Fits comfortably.
export const STR_BRG_NONE = 'BRG:---'
export const STR_BRG = (deg: string) => `BRG:${deg}`  // deg is zero-padded 3 digits

// Bottom-right: periscope magnification label.
// Budget: 'MAG:2X' = 6 chars. Right-aligned.
export const STR_MAG = 'MAG:2X'

// ── Dashboard — section labels ─────────────────────────────────────────────
// Fixed positions across the label row. See pixel budget guide above.
// Changing these labels does NOT move the widget below them — only the text
// label itself moves. Verify visually after changing.

export const STR_SECT_SONAR = 'SONAR'    // 5 chars, budget ≤ 7
export const STR_SECT_BALLAST = 'BALLAST'  // 7 chars, budget ≤ 8 — currently full
export const STR_SECT_MOTOR = 'MOTOR'    // 5 chars, budget ≤ 9
export const STR_SECT_STATUS = 'STATUS'   // 6 chars, budget ≤ 7

// ── Sonar widget ───────────────────────────────────────────────────────────
// Range label below the sonar disc. 'R:160M' = 6 chars. Fits.
export const STR_SONAR_RANGE = (rangeM: number) => `R:${rangeM}M`

// ── Ballast widget — tank labels and percentage display ────────────────────
// These sit under each ballast column. Budget: 3 chars each.
// 'AIR' = 3 chars (max). 'H2O' = 3 chars (max). Don't go longer.
export const STR_BALLAST_AIR = 'AIR'    // 3 chars max
export const STR_BALLAST_WATER = 'H2O'    // 3 chars max

// Percentage values below the labels. '100%' = 4 chars — can overflow by 1
// pixel at 100% (32 px wide, 4 × 8 px). Acceptable, renders to '100%'.
export const STR_PCT = (pct: number) => `${pct}%`

// ── Status bars — resource labels ─────────────────────────────────────────
// Left of each bar. Budget: 3 chars each (hard limit — the bar starts at +32 px).
// 'OXY' 'BAT' 'DMG' are all exactly 3 chars. Maximum.
export const STR_OXY = 'OXY'    // 3 chars — hard limit
export const STR_BAT = 'BAT'    // 3 chars — hard limit
export const STR_DMG = 'DMG'    // 3 chars — hard limit

// ── Status widget — live readouts ─────────────────────────────────────────
// Below the resource bars. Depth and speed.
// 'D:999M'  = 6 chars — fine for any depth up to 999 m.
// 'V:12KN'  = 6 chars — fine for any speed up to MAX_SPEED.
export const STR_DEPTH = (m: number) => `D:${m}M`
export const STR_SPEED = (kn: number) => `V:${kn}KN`

// ── Compass directions ─────────────────────────────────────────────────────
// Used in the width-calculation helper only (render.ts: _compassWidthPx).
// The actual rendered compass text comes from zx-kit's drawCompassText(),
// which has its own internal labels — see COMPASS NOTE at top of file.
// Keeping this in sync with zx-kit's internal dirs is important for the
// width calculation to be accurate.
export const COMPASS_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

// ── Bottom ticker — mine counter and lives ─────────────────────────────────
// Right-aligned at the end of the compass ticker row.
// 'M:10/20 L:3' = 11 chars. Right edge = (32 - 11) × 8 px = 168 px start.
// Template: receives mines found, total mines, and lives.
export const STR_MINES = (found: number, total: number) => `M:${found}/${total}`
export const STR_LIVES = (lives: number) => `L:${lives}`
