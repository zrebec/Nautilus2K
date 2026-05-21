import {
  drawText, drawFrame,
  drawDottedGrid, drawSegmentedBar, drawDial, drawCompassText,
} from 'zx-kit'
import {
  C, CELL, COLS, CANVAS_W, CANVAS_H,
  STATUS_Y, PERISCOPE_Y, PERISCOPE_H,
  SECT_LABEL_Y, DASHBOARD_Y, DASHBOARD_H, BOTTOM_Y,
} from './constants.ts'
import {
  type GameState, type Mine,
  MINES, MAX_SPEED, SONAR_RANGE, PERISCOPE_FOV_DEG, PERISCOPE_RANGE,
  dist, bearingTo, relativeBearing,
} from './state.ts'

// ── Derived data (computed each frame from state + world) ───────────────────

interface NearbyMine {
  mine: Mine
  /** World-frame distance, world units. */
  distance: number
  /** Absolute bearing 0..360 (north-up). */
  absBearing: number
  /** Relative bearing -180..180 (where it is off the sub's nose). */
  relBearing: number
}

/** All mines within `maxRange`, sorted by ascending distance. */
function nearbyMines(state: GameState, maxRange: number): NearbyMine[] {
  const out: NearbyMine[] = []
  for (const mine of MINES) {
    if (mine.disarmed) continue
    const d = dist(state.x, state.y, mine.x, mine.y)
    if (d > maxRange) continue
    const ab = bearingTo(state.x, state.y, mine.x, mine.y)
    out.push({
      mine, distance: d,
      absBearing: ab,
      relBearing: relativeBearing(state.heading, ab),
    })
  }
  out.sort((a, b) => a.distance - b.distance)
  return out
}

// ── Top status line (row 0) ──────────────────────────────────────────────────

function renderStatusLine(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Find the nearest mine that's roughly ahead (relBearing within ±20°) and
  // show its distance as the MINE AHEAD warning. This is what a periscope
  // operator's most-important "watch out!" indicator should reflect.
  const ahead = nearbyMines(state, PERISCOPE_RANGE).find(c => Math.abs(c.relBearing) <= 20)
  if (ahead) {
    const txt = `MINE AHEAD ${Math.round(ahead.distance)}M`
    drawText(ctx, txt, 0, STATUS_Y, C.B_RED, C.BLACK)
  }

  // Power source label. When the engine is off we make this loud and red so
  // the player notices the sub isn't going to move no matter how much they
  // mash the throttle — the cause of confusion is obvious at a glance.
  const pwr = state.engineOn ? `PWR:${state.power}` : 'ENGINE OFF'
  const ink = state.engineOn ? C.B_GREEN : C.B_RED
  drawText(ctx, pwr, (COLS - pwr.length) * CELL, STATUS_Y, ink, C.BLACK)
}

// ── Periscope view ──────────────────────────────────────────────────────────

/** Depth below which the sub is considered submerged enough to switch the
 *  periscope view from "above water" to underwater reticle mode. */
const SURFACE_DEPTH_THRESHOLD_M = 5

function renderPeriscope(ctx: CanvasRenderingContext2D, state: GameState): void {
  drawFrame(ctx, {
    x: 0, y: PERISCOPE_Y, width: CANVAS_W, height: PERISCOPE_H,
    color: C.CYAN,
  })

  // Branch on depth: surface view shows sky + sea horizon, submerged view
  // shows the underwater reticle with crosshair and contact blips.
  if (state.depth < SURFACE_DEPTH_THRESHOLD_M) {
    renderPeriscopeSurface(ctx)
  } else {
    renderPeriscopeSubmerged(ctx, state)
  }

  // Corner HUD labels — drawn on top of either mode.
  renderPeriscopeLabels(ctx, state)
}

function renderPeriscopeSurface(ctx: CanvasRenderingContext2D): void {
  const innerY = PERISCOPE_Y + 1
  const innerH = PERISCOPE_H - 2
  const horizonY = Math.floor(PERISCOPE_Y + PERISCOPE_H / 2)

  // Sky (upper half) — bright cyan, like a clear daylight sky on Spectrum.
  ctx.fillStyle = C.B_CYAN
  ctx.fillRect(1, innerY, CANVAS_W - 2, horizonY - innerY)

  // Sea (lower half) — deep blue, matching the underwater mode for continuity.
  ctx.fillStyle = C.BLUE
  ctx.fillRect(1, horizonY, CANVAS_W - 2, innerY + innerH - horizonY)

  // Horizon line — single bright pixel row to anchor the eye.
  ctx.fillStyle = C.B_WHITE
  ctx.fillRect(1, horizonY, CANVAS_W - 2, 1)
}

function renderPeriscopeSubmerged(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = C.BLUE
  ctx.fillRect(1, PERISCOPE_Y + 1, CANVAS_W - 2, PERISCOPE_H - 2)

  const cx = Math.floor(CANVAS_W / 2)
  const cy = Math.floor(PERISCOPE_Y + PERISCOPE_H / 2)

  // Crosshair
  ctx.fillStyle = C.B_GREEN
  ctx.fillRect(2, cy, CANVAS_W - 4, 1)
  ctx.fillRect(cx, PERISCOPE_Y + 2, 1, PERISCOPE_H - 4)
  ctx.fillRect(cx - 1, cy - 1, 3, 3)

  // Range ticks along the horizontal crosshair
  ctx.fillStyle = C.B_CYAN
  for (let i = -7; i <= 7; i++) {
    if (i === 0) continue
    const tx = cx + i * 16
    if (tx < 4 || tx > CANVAS_W - 4) continue
    ctx.fillRect(tx, cy - 1, 1, 3)
  }
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue
    const ty = cy + i * 16
    if (ty < PERISCOPE_Y + 4 || ty > PERISCOPE_Y + PERISCOPE_H - 4) continue
    ctx.fillRect(cx - 1, ty, 3, 1)
  }

  // Project mines onto the forward viewing arc (only visible underwater).
  const fwd = nearbyMines(state, PERISCOPE_RANGE)
                .filter(c => Math.abs(c.relBearing) <= PERISCOPE_FOV_DEG)
  ctx.fillStyle = C.B_RED
  const halfWidth  = (CANVAS_W - 8) / 2
  const halfHeight = (PERISCOPE_H - 24) / 2
  for (const c of fwd) {
    const xOff = (c.relBearing / PERISCOPE_FOV_DEG) * halfWidth
    const yOff = halfHeight - (c.distance / PERISCOPE_RANGE) * halfHeight
    const mx = Math.round(cx + xOff)
    const my = Math.round(cy + yOff)
    const size = Math.max(2, Math.round(6 * (1 - c.distance / PERISCOPE_RANGE)))
    ctx.fillRect(mx - Math.floor(size / 2), my - Math.floor(size / 2), size, size)
  }
}

function renderPeriscopeLabels(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Pick paper that contrasts with whatever's behind: BLUE works for both
  // submerged blue and the sea half; sky cells need the same treatment so
  // labels read consistently. Using BLUE everywhere is a small color-clash
  // compromise that keeps the labels readable in both modes.
  drawText(ctx, 'OBJ:GAIA', 2, PERISCOPE_Y + 2, C.B_WHITE, C.BLUE)

  const contactCount = nearbyMines(state, SONAR_RANGE).length
  const contactLbl = `CONTACTS:${contactCount}`
  drawText(ctx, contactLbl,
    CANVAS_W - contactLbl.length * CELL - 2,
    PERISCOPE_Y + 2,
    C.B_WHITE, C.BLUE,
  )

  // At surface, BRG is undefined (no underwater target). Show "---".
  let bearingLbl: string
  if (state.depth < SURFACE_DEPTH_THRESHOLD_M) {
    bearingLbl = 'BRG:---'
  } else {
    const nearest = nearbyMines(state, PERISCOPE_RANGE)[0]
    bearingLbl = nearest
      ? `BRG:${String(Math.round((nearest.relBearing + 360) % 360)).padStart(3, '0')}`
      : 'BRG:---'
  }
  drawText(ctx, bearingLbl, 2, PERISCOPE_Y + PERISCOPE_H - 10, C.WHITE, C.BLUE)

  const magLbl = 'MAG:2X'
  drawText(ctx, magLbl,
    CANVAS_W - magLbl.length * CELL - 2,
    PERISCOPE_Y + PERISCOPE_H - 10,
    C.WHITE, C.BLUE,
  )
}

// ── Dashboard section labels ────────────────────────────────────────────────

function renderSectionLabels(ctx: CanvasRenderingContext2D): void {
  drawText(ctx, 'SONAR',   2,            SECT_LABEL_Y, C.B_GREEN,  C.BLACK)
  drawText(ctx, 'BALLAST', 8  * CELL,    SECT_LABEL_Y, C.B_CYAN,   C.BLACK)
  drawText(ctx, 'MOTOR',   16 * CELL,    SECT_LABEL_Y, C.B_RED,    C.BLACK)
  drawText(ctx, 'STATUS',  25 * CELL,    SECT_LABEL_Y, C.B_YELLOW, C.BLACK)
}

// ── Dashboard widgets ───────────────────────────────────────────────────────

function renderSonar(ctx: CanvasRenderingContext2D, state: GameState): void {
  const x = 2, y = DASHBOARD_Y
  const w = 60, h = DASHBOARD_H - CELL

  drawDottedGrid(ctx, {
    x, y, width: w, height: h,
    spacing: 4,
    color: C.GREEN,
    paper: C.BLACK,
  })

  // Sub in centre (always)
  const ccx = x + Math.floor(w / 2)
  const ccy = y + Math.floor(h / 2)
  ctx.fillStyle = C.B_GREEN
  ctx.fillRect(ccx - 2, ccy, 5, 1)
  ctx.fillRect(ccx, ccy - 2, 1, 5)

  // Project nearby mines onto the sonar disc. North-up sonar — heading does
  // not rotate the view, so a mine to the world-north of the sub appears
  // above the centre regardless of which way the sub is pointing.
  ctx.fillStyle = C.B_RED
  const halfW = w / 2
  const halfH = h / 2
  for (const c of nearbyMines(state, SONAR_RANGE)) {
    const dx = c.mine.x - state.x
    const dy = c.mine.y - state.y
    const sx = ccx + (dx / SONAR_RANGE) * halfW
    const sy = ccy + (dy / SONAR_RANGE) * halfH
    ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 2, 2)
  }

  // Range readout
  drawText(ctx, `R:${SONAR_RANGE}M`, x, y + h + 1, C.WHITE, C.BLACK)
}

function renderBallast(ctx: CanvasRenderingContext2D, state: GameState): void {
  const baseX = 8 * CELL
  const y = DASHBOARD_Y

  const SEGS = 8
  const airFilled   = Math.round(state.ballastAirPct   * SEGS)
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

  drawText(ctx, 'AIR', baseX + 0,  y + 42, C.B_CYAN, C.BLACK)
  drawText(ctx, 'H2O', baseX + 26, y + 42, C.B_CYAN, C.BLACK)
  drawText(ctx, `${Math.round(state.ballastAirPct   * 100)}%`, baseX + 0,  y + 50, C.WHITE, C.BLACK)
  drawText(ctx, `${Math.round(state.ballastWaterPct * 100)}%`, baseX + 26, y + 50, C.WHITE, C.BLACK)
}

function renderMotor(ctx: CanvasRenderingContext2D, state: GameState): void {
  const baseX = 16 * CELL
  const y = DASHBOARD_Y
  const cx = baseX + 20
  const cy = y + 18
  const radius = 18

  // RPM tracks throttle. Full throttle = 3000 RPM. Maps 1:1 to MAX_SPEED.
  const rpm = Math.round((state.throttle / MAX_SPEED) * 3000)

  drawDial(ctx, {
    cx, cy, radius,
    value: rpm, min: 0, max: 3000,
    needleColor: C.B_RED,
    rimColor: C.WHITE,
    tickColor: C.WHITE,
    ticks: 7,
  })

  const val = String(rpm)
  drawText(ctx, val, cx - (val.length * CELL) / 2, y + 40, C.B_RED, C.BLACK)
  drawText(ctx, 'RPM', cx - (3 * CELL) / 2,        y + 48, C.B_RED, C.BLACK)
}

function renderStatusBars(ctx: CanvasRenderingContext2D, state: GameState): void {
  const baseX = 24 * CELL
  const y = DASHBOARD_Y

  drawText(ctx, 'OXY', baseX, y, C.WHITE, C.BLACK)
  drawSegmentedBar(ctx, {
    x: baseX + 32, y, segments: 4, value: Math.round(state.oxygenPct * 4), max: 4,
    segmentWidth: 6, segmentHeight: 6, gap: 1,
    colors: [C.B_RED, C.B_YELLOW, C.B_GREEN],
    paper: C.BLACK,
  })

  drawText(ctx, 'BAT', baseX, y + 10, C.WHITE, C.BLACK)
  drawSegmentedBar(ctx, {
    x: baseX + 32, y: y + 10, segments: 4, value: Math.round(state.batteryPct * 4), max: 4,
    segmentWidth: 6, segmentHeight: 6, gap: 1,
    colors: [C.B_RED, C.B_YELLOW, C.B_GREEN],
    paper: C.BLACK,
  })

  drawText(ctx, 'DMG', baseX, y + 20, C.WHITE, C.BLACK)
  drawSegmentedBar(ctx, {
    x: baseX + 32, y: y + 20, segments: 4, value: Math.round(state.damagePct * 4), max: 4,
    segmentWidth: 6, segmentHeight: 6, gap: 1,
    color: C.B_RED,
    paper: C.BLACK,
  })

  // Live depth + speed readouts — driven by physics, not by the player.
  drawText(ctx, `D:${Math.round(state.depth)}M`,    baseX, y + 32, C.B_CYAN,  C.BLACK)
  drawText(ctx, `V:${Math.round(state.speed)}KN`,   baseX, y + 40, C.B_GREEN, C.BLACK)
}

// ── Bottom ticker ───────────────────────────────────────────────────────────

const _COMPASS_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

function _compassWidthPx(heading: number): number {
  const c = Math.round((((heading % 360) + 360) % 360) / 45) % 8
  const idxs = [(c + 6) % 8, (c + 7) % 8, c, (c + 1) % 8, (c + 2) % 8]
  let cells = 0
  for (let i = 0; i < 5; i++) {
    const label = _COMPASS_DIRS[idxs[i]]
    const shown = (i === 1 || i === 3) ? `[${label}]` : label
    cells += shown.length + 1
  }
  return cells * CELL
}

function renderBottomTicker(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = C.CYAN
  ctx.fillRect(0, BOTTOM_Y - 1, CANVAS_W, 1)

  drawCompassText(ctx, {
    x: 0, y: BOTTOM_Y,
    heading: state.heading,
    color: C.WHITE,
    highlightColor: C.B_YELLOW,
    paper: C.BLACK,
  })

  const deg = Math.round(((state.heading % 360) + 360) % 360)
  const hdgStr = String(deg).padStart(3, '0')
  drawText(ctx, hdgStr, _compassWidthPx(state.heading), BOTTOM_Y, C.B_WHITE, C.BLACK)

  // Right edge: mine progress + lives. minesFound advances in Phase 3c when
  // disarming arrives; for 3b it stays at 0 — the counter still shows "out of
  // total in the world" which is informative.
  const mc = `M:${state.minesFound}/${MINES.filter(m => !m.disarmed).length}`
  const lv = `L:${state.lives}`
  const right = `${mc} ${lv}`
  drawText(ctx, right, (COLS - right.length) * CELL, BOTTOM_Y, C.B_WHITE, C.BLACK)
}

// ── Damage flash overlay ────────────────────────────────────────────────────

function renderDamageFlash(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.damageFlashMs <= 0) return
  // Pulsing red frame around the whole screen
  ctx.fillStyle = C.B_RED
  ctx.fillRect(0, 0, CANVAS_W, 2)
  ctx.fillRect(0, CANVAS_H - 2, CANVAS_W, 2)
  ctx.fillRect(0, 0, 2, CANVAS_H)
  ctx.fillRect(CANVAS_W - 2, 0, 2, CANVAS_H)
}

// ── Top-level render ────────────────────────────────────────────────────────

export function render(ctx: CanvasRenderingContext2D, state: GameState): void {
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
  renderDamageFlash(ctx, state)
}
