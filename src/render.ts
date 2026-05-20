import {
  drawText, drawFrame,
  drawDottedGrid, drawSegmentedBar, drawDial, drawCompassText,
} from 'zx-kit'
import {
  C, CELL, COLS, CANVAS_W, CANVAS_H,
  STATUS_Y, PERISCOPE_Y, PERISCOPE_H,
  SECT_LABEL_Y, DASHBOARD_Y, DASHBOARD_H, BOTTOM_Y,
} from './constants.ts'
import type { SubmarineState } from './state.ts'

// ── Top status line (row 0) ──────────────────────────────────────────────────

function renderStatusLine(ctx: CanvasRenderingContext2D, state: SubmarineState): void {
  // Left: MINE AHEAD warning (only if mineAheadM > 0)
  if (state.mineAheadM > 0) {
    const txt = `MINE AHEAD ${state.mineAheadM}M`
    drawText(ctx, txt, 0, STATUS_Y, C.B_RED, C.BLACK)
  }
  // Right: POWER source indicator
  const pwr = `PWR:${state.power}`
  drawText(ctx, pwr, (COLS - pwr.length) * CELL, STATUS_Y, C.B_GREEN, C.BLACK)
}

// ── Periscope view (Fáza 2: reticle placeholder, no real game scene yet) ─────

/**
 * Periscope reticle view — what a submarine commander would see when looking
 * through the optical periscope. Renders the classic tactical reticle: cyan
 * frame, deep-blue water, centre crosshair with range tick marks along both
 * axes, plus a couple of mock mine silhouettes to indicate "forward contacts".
 *
 * Fáza 3 will replace the mock mines with real game-world objects projected
 * through a perspective transform; for now the contacts come from state but
 * are positioned hardcoded so the view always looks "alive".
 */
function renderPeriscope(ctx: CanvasRenderingContext2D, state: SubmarineState): void {
  // Outer frame
  drawFrame(ctx, {
    x: 0, y: PERISCOPE_Y, width: CANVAS_W, height: PERISCOPE_H,
    color: C.CYAN,
  })

  // Inner ocean (deep blue)
  ctx.fillStyle = C.BLUE
  ctx.fillRect(1, PERISCOPE_Y + 1, CANVAS_W - 2, PERISCOPE_H - 2)

  const cx = Math.floor(CANVAS_W / 2)
  const cy = Math.floor(PERISCOPE_Y + PERISCOPE_H / 2)

  // ── Crosshair: solid horizontal + vertical lines through centre ────────
  // Bright green so it reads against the deep blue water without color clash
  // (the lines are 1 px thick and align cleanly with the 8×8 attribute grid
  // because they're at the geometric centre of an even-sized frame).
  ctx.fillStyle = C.B_GREEN
  ctx.fillRect(2, cy, CANVAS_W - 4, 1)               // horizontal
  ctx.fillRect(cx, PERISCOPE_Y + 2, 1, PERISCOPE_H - 4) // vertical

  // Centre target marker (small filled square — bull's eye)
  ctx.fillRect(cx - 1, cy - 1, 3, 3)

  // ── Range tick marks ───────────────────────────────────────────────────
  // Cyan ticks along the horizontal crosshair every 16 px = 1 "range unit".
  // Each tick is a small vertical bar (3 px tall) so the eye reads distance
  // from centre at a glance.
  ctx.fillStyle = C.B_CYAN
  for (let i = -7; i <= 7; i++) {
    if (i === 0) continue   // centre already drawn
    const tx = cx + i * 16
    if (tx < 4 || tx > CANVAS_W - 4) continue
    ctx.fillRect(tx, cy - 1, 1, 3)
  }
  // Vertical depth ticks (every 16 px on the vertical crosshair)
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue
    const ty = cy + i * 16
    if (ty < PERISCOPE_Y + 4 || ty > PERISCOPE_Y + PERISCOPE_H - 4) continue
    ctx.fillRect(cx - 1, ty, 3, 1)
  }

  // ── Mock mine contacts (red squares) ───────────────────────────────────
  // In Fáza 3 these become real world objects projected through the periscope's
  // viewing frustum. For Fáza 2 we just show a few static contacts so the view
  // looks busy and the reticle's purpose is obvious.
  ctx.fillStyle = C.B_RED
  const mines: Array<{ dx: number; dy: number }> = [
    { dx: -40, dy: -16 },   // upper-left contact
    { dx:  32, dy:   8 },   // right of centre
    { dx:  -8, dy:  24 },   // lower-centre
  ]
  for (const m of mines) {
    const mx = cx + m.dx
    const my = cy + m.dy
    if (mx < 4 || mx > CANVAS_W - 8) continue
    if (my < PERISCOPE_Y + 4 || my > PERISCOPE_Y + PERISCOPE_H - 8) continue
    ctx.fillRect(mx - 2, my - 2, 4, 4)
  }

  // ── Corner labels (tactical HUD info, no duplicates with dashboard) ────
  // Top-left: current mission/objective — what the commander is hunting for.
  // Top-right: number of sonar contacts currently detected.
  drawText(ctx, 'OBJ:GAIA', 2, PERISCOPE_Y + 2, C.B_WHITE, C.BLUE)

  const contactLbl = `CONTACTS:${state.sonarHits.length}`
  drawText(ctx, contactLbl,
    CANVAS_W - contactLbl.length * CELL - 2,
    PERISCOPE_Y + 2,
    C.B_WHITE, C.BLUE,
  )

  // Bottom-left: relative bearing to the nearest detected contact (hard-coded
  // for Fáza 2; Fáza 3 derives it from the contact list + own heading).
  // Bottom-right: periscope magnification level.
  drawText(ctx, 'BRG:045',
    2,
    PERISCOPE_Y + PERISCOPE_H - 10,
    C.WHITE, C.BLUE,
  )
  const magLbl = 'MAG:2X'
  drawText(ctx, magLbl,
    CANVAS_W - magLbl.length * CELL - 2,
    PERISCOPE_Y + PERISCOPE_H - 10,
    C.WHITE, C.BLUE,
  )
}

// ── Dashboard section labels (1 row, just above the widgets) ─────────────────

function renderSectionLabels(ctx: CanvasRenderingContext2D): void {
  drawText(ctx, 'SONAR',   2,            SECT_LABEL_Y, C.B_GREEN,  C.BLACK)
  drawText(ctx, 'BALLAST', 8  * CELL,    SECT_LABEL_Y, C.B_CYAN,   C.BLACK)
  drawText(ctx, 'MOTOR',   16 * CELL,    SECT_LABEL_Y, C.B_RED,    C.BLACK)
  drawText(ctx, 'STATUS',  25 * CELL,    SECT_LABEL_Y, C.B_YELLOW, C.BLACK)
}

// ── Dashboard widgets ────────────────────────────────────────────────────────

function renderSonar(ctx: CanvasRenderingContext2D, state: SubmarineState): void {
  // Section spans cols 0-7 → x=0..63 (64 px wide), height = 56 px
  const x = 2, y = DASHBOARD_Y
  const w = 60, h = DASHBOARD_H - CELL

  // Dotted grid as the radar surface
  drawDottedGrid(ctx, {
    x, y, width: w, height: h,
    spacing: 4,
    color: C.GREEN,
    paper: C.BLACK,
  })

  // Centre crosshair
  const ccx = x + Math.floor(w / 2)
  const ccy = y + Math.floor(h / 2)
  ctx.fillStyle = C.B_GREEN
  ctx.fillRect(ccx - 2, ccy, 5, 1)
  ctx.fillRect(ccx, ccy - 2, 1, 5)

  // Sonar hit blips
  ctx.fillStyle = C.B_RED
  for (const hit of state.sonarHits) {
    const hx = x + Math.min(w - 2, Math.max(0, hit.x))
    const hy = y + Math.min(h - 2, Math.max(0, hit.y))
    ctx.fillRect(hx, hy, 2, 2)
  }

  // Range label at bottom
  drawText(ctx, `R:${100}M`, x, y + h + 1, C.WHITE, C.BLACK)
}

function renderBallast(ctx: CanvasRenderingContext2D, state: SubmarineState): void {
  // Section spans cols 8-15 → x=64..127 (64 px wide)
  const baseX = 8 * CELL
  const y = DASHBOARD_Y

  // Two vertical segmented bars side by side (same visual language as OXY/BAT
  // bars on the right — clearer "discrete level indicator" feel than a pill tank).
  // 8 segments × (4 + 1 gap) = ~40 px tall, 14 px wide.
  const SEGS = 8
  const airFilled = Math.round(state.ballastAirPct   * SEGS)
  const waterFilled = Math.round(state.ballastWaterPct * SEGS)

  drawSegmentedBar(ctx, {
    x: baseX + 4, y, segments: SEGS,
    value: airFilled, max: SEGS,
    segmentWidth: 14, segmentHeight: 4, gap: 1,
    orientation: 'vertical',
    color: C.B_CYAN,
    paper: C.BLUE,
  })
  drawSegmentedBar(ctx, {
    x: baseX + 30, y, segments: SEGS,
    value: waterFilled, max: SEGS,
    segmentWidth: 14, segmentHeight: 4, gap: 1,
    orientation: 'vertical',
    color: C.B_CYAN,
    paper: C.BLUE,
  })

  // Labels under each bar
  drawText(ctx, 'AIR', baseX + 0,  y + 42, C.B_CYAN, C.BLACK)
  drawText(ctx, 'H2O', baseX + 26, y + 42, C.B_CYAN, C.BLACK)
  // Percentages
  drawText(ctx, `${Math.round(state.ballastAirPct   * 100)}%`, baseX + 0,  y + 50, C.WHITE, C.BLACK)
  drawText(ctx, `${Math.round(state.ballastWaterPct * 100)}%`, baseX + 26, y + 50, C.WHITE, C.BLACK)
}

function renderMotor(ctx: CanvasRenderingContext2D, state: SubmarineState): void {
  // Section spans cols 16-23 → x=128..191 (64 px wide).
  // The "MOTOR" section label above starts at x=128, is 5 chars (40 px) wide,
  // and is centred at x=148. We align the dial and value readout to the same
  // axis so the whole MOTOR column reads as one vertical stack.
  const baseX = 16 * CELL
  const y = DASHBOARD_Y
  const cx = baseX + 20       // 148 — centred under the "MOTOR" label
  const cy = y + 18           // 138
  const radius = 18

  drawDial(ctx, {
    cx, cy, radius,
    value: state.motorRPM, min: 0, max: 3000,
    needleColor: C.B_RED,
    rimColor: C.WHITE,
    tickColor: C.WHITE,
    ticks: 7,
  })

  // Two-line readout, each line centred on the same axis as the dial.
  // Splitting "1500" and "RPM" lets us hold the column to ~32 px wide instead
  // of the 64 px that a single "1500 RPM" line would need.
  const val = String(state.motorRPM)
  drawText(ctx, val, cx - (val.length * CELL) / 2, y + 40, C.B_RED, C.BLACK)
  drawText(ctx, 'RPM', cx - (3 * CELL) / 2,        y + 48, C.B_RED, C.BLACK)
}

function renderStatusBars(ctx: CanvasRenderingContext2D, state: SubmarineState): void {
  // Section spans cols 24-31 → x=192..255 (64 px wide)
  const baseX = 24 * CELL
  const y = DASHBOARD_Y

  // OXYGEN — threshold gradient (red → yellow → green)
  drawText(ctx, 'OXY', baseX, y, C.WHITE, C.BLACK)
  drawSegmentedBar(ctx, {
    x: baseX + 32, y, segments: 4, value: Math.round(state.oxygenPct * 4), max: 4,
    segmentWidth: 6, segmentHeight: 6, gap: 1,
    colors: [C.B_RED, C.B_YELLOW, C.B_GREEN],
    paper: C.BLACK,
  })

  // BATTERY
  drawText(ctx, 'BAT', baseX, y + 10, C.WHITE, C.BLACK)
  drawSegmentedBar(ctx, {
    x: baseX + 32, y: y + 10, segments: 4, value: Math.round(state.batteryPct * 4), max: 4,
    segmentWidth: 6, segmentHeight: 6, gap: 1,
    colors: [C.B_RED, C.B_YELLOW, C.B_GREEN],
    paper: C.BLACK,
  })

  // DAMAGE — single colour (red); shows damage taken, not health remaining
  drawText(ctx, 'DMG', baseX, y + 20, C.WHITE, C.BLACK)
  drawSegmentedBar(ctx, {
    x: baseX + 32, y: y + 20, segments: 4, value: Math.round(state.damagePct * 4), max: 4,
    segmentWidth: 6, segmentHeight: 6, gap: 1,
    color: C.B_RED,
    paper: C.BLACK,
  })

  // DEPTH / SPEED numeric readouts
  drawText(ctx, `D:${state.depth}M`,  baseX, y + 32, C.B_CYAN,   C.BLACK)
  drawText(ctx, `V:${state.speed}KN`, baseX, y + 40, C.B_GREEN,  C.BLACK)
}

// ── Bottom ticker ────────────────────────────────────────────────────────────

const _COMPASS_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

/**
 * Mirrors zx-kit `drawCompassText` layout to compute the rendered width in
 * pixels for a given heading. Lets us place the HDG numeric readout flush
 * against the right edge of the compass without overlap.
 */
function _compassWidthPx(heading: number): number {
  const c = Math.round((((heading % 360) + 360) % 360) / 45) % 8
  const idxs = [(c + 6) % 8, (c + 7) % 8, c, (c + 1) % 8, (c + 2) % 8]
  let cells = 0
  for (let i = 0; i < 5; i++) {
    const label = _COMPASS_DIRS[idxs[i]]
    const shown = (i === 1 || i === 3) ? `[${label}]` : label
    cells += shown.length + 1   // label + trailing space (zx-kit always adds one)
  }
  return cells * CELL
}

function renderBottomTicker(ctx: CanvasRenderingContext2D, state: SubmarineState): void {
  // Divider line
  ctx.fillStyle = C.CYAN
  ctx.fillRect(0, BOTTOM_Y - 1, CANVAS_W, 1)

  // Left: cardinal compass (quadrant orientation)
  drawCompassText(ctx, {
    x: 0, y: BOTTOM_Y,
    heading: state.heading,
    color: C.WHITE,
    highlightColor: C.B_YELLOW,
    paper: C.BLACK,
  })

  // Right after the compass: precise heading in degrees.
  // Compass = qualitative (which way roughly), HDG = quantitative (exact).
  const deg = Math.round(((state.heading % 360) + 360) % 360)
  const hdgStr = String(deg).padStart(3, '0')
  drawText(ctx, hdgStr, _compassWidthPx(state.heading), BOTTOM_Y, C.B_WHITE, C.BLACK)

  // Right edge: mine progress + lives
  const mc = `M:${state.mineCounter.current}/${state.mineCounter.total}`
  const lv = `L:${state.lives}`
  const right = `${mc} ${lv}`
  drawText(ctx, right, (COLS - right.length) * CELL, BOTTOM_Y, C.B_WHITE, C.BLACK)
}

// ── Top-level render ────────────────────────────────────────────────────────

export function render(ctx: CanvasRenderingContext2D, state: SubmarineState): void {
  // Clear the entire frame each tick (cheap at 256×192).
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  renderStatusLine(ctx, state)
  renderPeriscope(ctx, state)
  renderSectionLabels(ctx)

  renderSonar(ctx, state)
  renderBallast(ctx, state)
  renderMotor(ctx, state)
  renderStatusBars(ctx, state)

  renderBottomTicker(ctx, state)
}
