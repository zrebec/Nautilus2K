import {
  drawText, drawFrame, drawBitmap,
  drawDottedGrid, drawSegmentedBar, drawDial, drawCompassText,
} from 'zx-kit'
import { MINE_BITMAP_16, MINE_BITMAP_8 } from './sprites.ts'
import {
  C, CELL, COLS, CANVAS_W, CANVAS_H,
  STATUS_Y, PERISCOPE_Y, PERISCOPE_H,
  SECT_LABEL_Y, DASHBOARD_Y, DASHBOARD_H, BOTTOM_Y,
} from './constants.ts'
import {
  type GameState, type Mine,
  MINES, MAX_SPEED, SONAR_RANGE, PERISCOPE_FOV_DEG, PERISCOPE_RANGE,
  PERISCOPE_DEPTH_RANGE,
  dist, bearingTo, relativeBearing,
} from './state.ts'
import {
  MINE_AHEAD_BEARING_DEG, PERISCOPE_SURFACE_THRESHOLD_M, MAX_RUDDER_ANGLE,
  RPM_DIAL_MAX, BALLAST_BAR_SEGMENTS, RESOURCE_BAR_SEGMENTS,
  ENGINE_MODE_COLORS, MINE_COLORS,
  SONAR_GRID_COLOR, SONAR_PAPER,
  BALLAST_COLOR, BALLAST_PAPER,
  MOTOR_NEEDLE_COLOR, MOTOR_RIM_COLOR,
  RUDDER_NEUTRAL_COLOR, RUDDER_MARKER_COLOR,
  RESOURCE_COLORS, DAMAGE_COLOR,
  PERISCOPE_FRAME_COLOR, PERISCOPE_CROSSHAIR_COLOR,
  PERISCOPE_SKY_COLOR, PERISCOPE_SEA_COLOR,
  PERISCOPE_LABEL_INK, PERISCOPE_LABEL_PAPER,
  TICKER_SEPARATOR_COLOR, COMPASS_COLOR, COMPASS_HIGHLIGHT_COLOR,
  SECT_SONAR_COLOR, SECT_BALLAST_COLOR, SECT_MOTOR_COLOR, SECT_STATUS_COLOR,
  DEPTH_READOUT_COLOR, SPEED_READOUT_COLOR,
} from './config.ts'
import { L } from './lang.ts'

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
  const ahead = nearbyMines(state, PERISCOPE_RANGE).find(c => Math.abs(c.relBearing) <= MINE_AHEAD_BEARING_DEG)
  if (ahead) {
    drawText(ctx, L.STR_MINE_AHEAD(Math.round(ahead.distance)), 0, STATUS_Y, ENGINE_MODE_COLORS.OFF, C.BLACK)
  }

  const modeLbl    = L.ENGINE_LABELS[state.engineMode]
  const modeColour = ENGINE_MODE_COLORS[state.engineMode]
  drawText(ctx, modeLbl, (COLS - modeLbl.length) * CELL, STATUS_Y, modeColour, C.BLACK)
}

// ── Periscope view ──────────────────────────────────────────────────────────

function renderPeriscope(ctx: CanvasRenderingContext2D, state: GameState): void {
  drawFrame(ctx, {
    x: 0, y: PERISCOPE_Y, width: CANVAS_W, height: PERISCOPE_H,
    color: PERISCOPE_FRAME_COLOR,
  })

  // Branch on depth: surface view shows sky + sea horizon, submerged view
  // shows the underwater reticle with crosshair and contact blips.
  if (state.depth < PERISCOPE_SURFACE_THRESHOLD_M) {
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
  ctx.fillStyle = PERISCOPE_SKY_COLOR
  ctx.fillRect(1, innerY, CANVAS_W - 2, horizonY - innerY)

  ctx.fillStyle = PERISCOPE_SEA_COLOR
  ctx.fillRect(1, horizonY, CANVAS_W - 2, innerY + innerH - horizonY)

  ctx.fillStyle = C.B_WHITE
  ctx.fillRect(1, horizonY, CANVAS_W - 2, 1)
}

function renderPeriscopeSubmerged(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = PERISCOPE_SEA_COLOR
  ctx.fillRect(1, PERISCOPE_Y + 1, CANVAS_W - 2, PERISCOPE_H - 2)

  const cx = Math.floor(CANVAS_W / 2)
  const cy = Math.floor(PERISCOPE_Y + PERISCOPE_H / 2)

  ctx.fillStyle = PERISCOPE_CROSSHAIR_COLOR
  ctx.fillRect(2, cy, CANVAS_W - 4, 1)
  ctx.fillRect(cx, PERISCOPE_Y + 2, 1, PERISCOPE_H - 4)
  ctx.fillRect(cx - 1, cy - 1, 3, 3)

  ctx.fillStyle = PERISCOPE_FRAME_COLOR
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

  // Project mines onto the forward viewing arc.
  // X axis = relative bearing (where the mine is left/right of the nose).
  // Y axis = depth offset (mine.depth − sub.depth). On the horizon means
  //          "matched depth, you can hit it"; above the horizon = mine
  //          shallower than you (ascend); below = deeper (dive).
  // Mines outside the depth viewing range are clipped — they exist in the
  // sonar but aren't optically visible from this depth.
  //
  // Each mine renders as a 16×16 spike-mine bitmap, ink coloured by class
  // (standard/magnetic/cluster), paper matching the sea background so the
  // crosshair "breaks" inside the mine — authentic ZX color clash.
  const fwd = nearbyMines(state, PERISCOPE_RANGE)
                .filter(c => Math.abs(c.relBearing) <= PERISCOPE_FOV_DEG)
  const halfWidth  = (CANVAS_W - 8) / 2
  const halfHeight = (PERISCOPE_H - 24) / 2
  for (const c of fwd) {
    const depthDiff = c.mine.depth - state.depth   // + = mine deeper, − = mine shallower
    if (Math.abs(depthDiff) > PERISCOPE_DEPTH_RANGE) continue   // off-screen vertically

    const xOff = (c.relBearing / PERISCOPE_FOV_DEG) * halfWidth
    const yOff = (depthDiff / PERISCOPE_DEPTH_RANGE) * halfHeight
    const mx = Math.round(cx + xOff)
    const my = Math.round(cy + yOff)
    drawBitmap(ctx, MINE_BITMAP_16, mx - 8, my - 8, MINE_COLORS[c.mine.color], PERISCOPE_SEA_COLOR)
  }
}

function renderPeriscopeLabels(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Pick paper that contrasts with whatever's behind: BLUE works for both
  // submerged blue and the sea half; sky cells need the same treatment so
  // labels read consistently. Using BLUE everywhere is a small color-clash
  // compromise that keeps the labels readable in both modes.
  drawText(ctx, L.STR_OBJECTIVE, 2, PERISCOPE_Y + 2, PERISCOPE_LABEL_INK, PERISCOPE_LABEL_PAPER)

  const contactLbl = L.STR_CONTACTS(nearbyMines(state, SONAR_RANGE).length)
  drawText(ctx, contactLbl,
    CANVAS_W - contactLbl.length * CELL - 2,
    PERISCOPE_Y + 2,
    PERISCOPE_LABEL_INK, PERISCOPE_LABEL_PAPER,
  )

  let bearingLbl: string
  if (state.depth < PERISCOPE_SURFACE_THRESHOLD_M) {
    bearingLbl = L.STR_BRG_NONE
  } else {
    const nearest = nearbyMines(state, PERISCOPE_RANGE)[0]
    bearingLbl = nearest
      ? L.STR_BRG(String(Math.round((nearest.relBearing + 360) % 360)).padStart(3, '0'))
      : L.STR_BRG_NONE
  }
  drawText(ctx, bearingLbl, 2, PERISCOPE_Y + PERISCOPE_H - 10, COMPASS_COLOR, PERISCOPE_LABEL_PAPER)

  const magLbl = L.STR_MAG
  drawText(ctx, magLbl,
    CANVAS_W - magLbl.length * CELL - 2,
    PERISCOPE_Y + PERISCOPE_H - 10,
    COMPASS_COLOR, PERISCOPE_LABEL_PAPER,
  )
}

// ── Dashboard section labels ────────────────────────────────────────────────

function renderSectionLabels(ctx: CanvasRenderingContext2D): void {
  drawText(ctx, L.STR_SECT_SONAR,   2,         SECT_LABEL_Y, SECT_SONAR_COLOR,   C.BLACK)
  drawText(ctx, L.STR_SECT_BALLAST, 8  * CELL, SECT_LABEL_Y, SECT_BALLAST_COLOR, C.BLACK)
  drawText(ctx, L.STR_SECT_MOTOR,   16 * CELL, SECT_LABEL_Y, SECT_MOTOR_COLOR,   C.BLACK)
  drawText(ctx, L.STR_SECT_STATUS,  25 * CELL, SECT_LABEL_Y, SECT_STATUS_COLOR,  C.BLACK)
}

// ── Dashboard widgets ───────────────────────────────────────────────────────

function renderSonar(ctx: CanvasRenderingContext2D, state: GameState): void {
  const x = 2, y = DASHBOARD_Y
  const w = 60, h = DASHBOARD_H - CELL

  drawDottedGrid(ctx, {
    x, y, width: w, height: h,
    spacing: 4,
    color: SONAR_GRID_COLOR,
    paper: SONAR_PAPER,
  })

  const ccx = x + Math.floor(w / 2)
  const ccy = y + Math.floor(h / 2)
  ctx.fillStyle = SONAR_GRID_COLOR
  ctx.fillRect(ccx - 2, ccy, 5, 1)
  ctx.fillRect(ccx, ccy - 2, 1, 5)

  // Each mine renders as the 8×8 mini-mine bitmap, ink coloured by class —
  // same silhouette as the periscope 16×16 sprite so the player learns one
  // shape and recognises it in both views.
  const halfW = w / 2
  const halfH = h / 2
  for (const c of nearbyMines(state, SONAR_RANGE)) {
    const dx = c.mine.x - state.x
    const dy = c.mine.y - state.y
    const sx = ccx + (dx / SONAR_RANGE) * halfW
    const sy = ccy + (dy / SONAR_RANGE) * halfH
    drawBitmap(ctx, MINE_BITMAP_8, Math.round(sx) - 4, Math.round(sy) - 4, MINE_COLORS[c.mine.color], SONAR_PAPER)
  }

  // Range readout
  drawText(ctx, L.STR_SONAR_RANGE(SONAR_RANGE), x, y + h + 1, C.WHITE, C.BLACK)
}

function renderBallast(ctx: CanvasRenderingContext2D, state: GameState): void {
  const baseX = 8 * CELL
  const y = DASHBOARD_Y

  const airFilled   = Math.round(state.ballastAirPct   * BALLAST_BAR_SEGMENTS)
  const waterFilled = Math.round(state.ballastWaterPct * BALLAST_BAR_SEGMENTS)

  drawSegmentedBar(ctx, {
    x: baseX + 4, y, segments: BALLAST_BAR_SEGMENTS,
    value: airFilled, max: BALLAST_BAR_SEGMENTS,
    segmentWidth: 14, segmentHeight: 4, gap: 1,
    orientation: 'vertical',
    color: BALLAST_COLOR,
    paper: BALLAST_PAPER,
  })
  drawSegmentedBar(ctx, {
    x: baseX + 30, y, segments: BALLAST_BAR_SEGMENTS,
    value: waterFilled, max: BALLAST_BAR_SEGMENTS,
    segmentWidth: 14, segmentHeight: 4, gap: 1,
    orientation: 'vertical',
    color: BALLAST_COLOR,
    paper: BALLAST_PAPER,
  })

  drawText(ctx, L.STR_BALLAST_AIR,   baseX + 0,  y + 42, BALLAST_COLOR, C.BLACK)
  drawText(ctx, L.STR_BALLAST_WATER,  baseX + 26, y + 42, BALLAST_COLOR, C.BLACK)
  drawText(ctx, L.STR_PCT(Math.round(state.ballastAirPct   * 100)), baseX + 0,  y + 50, C.WHITE, C.BLACK)
  drawText(ctx, L.STR_PCT(Math.round(state.ballastWaterPct * 100)), baseX + 26, y + 50, C.WHITE, C.BLACK)
}

function renderMotor(ctx: CanvasRenderingContext2D, state: GameState): void {
  const baseX = 16 * CELL
  const y = DASHBOARD_Y
  const cx = baseX + 20
  const cy = y + 18
  const radius = 18

  // RPM tracks ACTUAL speed (not throttle target) so the dial reflects what
  // the engine is delivering right now — matches the engine drone pitch.
  const rpm = Math.round((state.speed / MAX_SPEED) * RPM_DIAL_MAX)

  drawDial(ctx, {
    cx, cy, radius,
    value: rpm, min: 0, max: RPM_DIAL_MAX,
    needleColor: MOTOR_NEEDLE_COLOR,
    rimColor: MOTOR_RIM_COLOR,
    tickColor: MOTOR_RIM_COLOR,
    ticks: 7,
  })

  const val = String(rpm)
  drawText(ctx, val, cx - (val.length * CELL) / 2, y + 40, MOTOR_NEEDLE_COLOR, C.BLACK)

  const rudderY = y + 50
  const rudderW = 32
  const rudderX = cx - rudderW / 2
  ctx.fillStyle = RUDDER_NEUTRAL_COLOR
  ctx.fillRect(rudderX, rudderY + 2, rudderW, 1)
  ctx.fillRect(rudderX + rudderW / 2, rudderY, 1, 5)
  const markerFrac = state.rudderAngle / MAX_RUDDER_ANGLE
  const markerX = Math.round(rudderX + rudderW / 2 + markerFrac * (rudderW / 2 - 1))
  ctx.fillStyle = RUDDER_MARKER_COLOR
  ctx.fillRect(markerX - 1, rudderY, 3, 5)
}

function renderStatusBars(ctx: CanvasRenderingContext2D, state: GameState): void {
  const baseX = 24 * CELL
  const y = DASHBOARD_Y

  drawText(ctx, L.STR_OXY, baseX, y, C.WHITE, C.BLACK)
  drawSegmentedBar(ctx, {
    x: baseX + 32, y,
    segments: RESOURCE_BAR_SEGMENTS, value: Math.round(state.oxygenPct  * RESOURCE_BAR_SEGMENTS), max: RESOURCE_BAR_SEGMENTS,
    segmentWidth: 6, segmentHeight: 6, gap: 1,
    colors: [...RESOURCE_COLORS],
    paper: C.BLACK,
  })

  drawText(ctx, L.STR_BAT, baseX, y + 10, C.WHITE, C.BLACK)
  drawSegmentedBar(ctx, {
    x: baseX + 32, y: y + 10,
    segments: RESOURCE_BAR_SEGMENTS, value: Math.round(state.batteryPct * RESOURCE_BAR_SEGMENTS), max: RESOURCE_BAR_SEGMENTS,
    segmentWidth: 6, segmentHeight: 6, gap: 1,
    colors: [...RESOURCE_COLORS],
    paper: C.BLACK,
  })

  drawText(ctx, L.STR_DMG, baseX, y + 20, C.WHITE, C.BLACK)
  drawSegmentedBar(ctx, {
    x: baseX + 32, y: y + 20,
    segments: RESOURCE_BAR_SEGMENTS, value: Math.round(state.damagePct  * RESOURCE_BAR_SEGMENTS), max: RESOURCE_BAR_SEGMENTS,
    segmentWidth: 6, segmentHeight: 6, gap: 1,
    color: DAMAGE_COLOR,
    paper: C.BLACK,
  })

  // Live depth + speed readouts — driven by physics, not by the player.
  drawText(ctx, L.STR_DEPTH(Math.round(state.depth)), baseX, y + 32, DEPTH_READOUT_COLOR, C.BLACK)
  drawText(ctx, L.STR_SPEED(Math.round(state.speed)), baseX, y + 40, SPEED_READOUT_COLOR, C.BLACK)
}

// ── Bottom ticker ───────────────────────────────────────────────────────────

function _compassWidthPx(heading: number): number {
  const c = Math.round((((heading % 360) + 360) % 360) / 45) % 8
  const idxs = [(c + 6) % 8, (c + 7) % 8, c, (c + 1) % 8, (c + 2) % 8]
  let cells = 0
  for (let i = 0; i < 5; i++) {
    const label = L.COMPASS_DIRS[idxs[i]]
    const shown = (i === 1 || i === 3) ? `[${label}]` : label
    cells += shown.length + 1
  }
  return cells * CELL
}

function renderBottomTicker(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = TICKER_SEPARATOR_COLOR
  ctx.fillRect(0, BOTTOM_Y - 1, CANVAS_W, 1)

  drawCompassText(ctx, {
    x: 0, y: BOTTOM_Y,
    heading: state.heading,
    color: COMPASS_COLOR,
    highlightColor: COMPASS_HIGHLIGHT_COLOR,
    paper: C.BLACK,
  })

  const deg = Math.round(((state.heading % 360) + 360) % 360)
  const hdgStr = String(deg).padStart(3, '0')
  drawText(ctx, hdgStr, _compassWidthPx(state.heading), BOTTOM_Y, C.B_WHITE, C.BLACK)

  // Right edge: mine progress + lives. minesFound advances in Phase 3c when
  // disarming arrives; for 3b it stays at 0 — the counter still shows "out of
  // total in the world" which is informative.
  const right = `${L.STR_MINES(state.minesFound, MINES.filter(m => !m.disarmed).length)} ${L.STR_LIVES(state.lives)}`
  drawText(ctx, right, (COLS - right.length) * CELL, BOTTOM_Y, C.B_WHITE, C.BLACK)
}

// ── Damage flash overlay ────────────────────────────────────────────────────

function renderDamageFlash(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.damageFlashMs <= 0) return
  ctx.fillStyle = ENGINE_MODE_COLORS.OFF
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
