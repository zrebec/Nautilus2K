import { isHeld } from 'zx-kit'
import {
  type GameState, type Mine,
  WORLD_W, WORLD_H, MAX_SPEED, MINE_COLLISION_RADIUS, MINES,
  dist,
} from './state.ts'
import { playEngineStart, playEngineStop, playMineHit } from './audio.ts'

// ── Control rates ────────────────────────────────────────────────────────────

/** Heading rotation rate in degrees per second while holding Left/Right. */
const ROTATION_RATE_DEG_PER_SEC = 30

/** How fast `speed` chases the target (engine on → throttle, off → 0). */
const SPEED_CLOSE_PER_SEC = 0.5

/** Throttle change rate while ↑/↓ is held (knots / sec). */
const THROTTLE_RATE_PER_SEC = 4

/** Rate at which A/D shifts ballast (fraction per second while held).
 *  Slower than the original 0.25 — gives the player time to actually feel the
 *  dive happen and avoids snap-flooding from a quick keystroke. */
const BALLAST_RATE_PER_SEC = 0.08

/** Depth-change rate per unit of net buoyancy (m/sec at full diff). */
const DEPTH_RATE_PER_SEC = 8

// ── Resource drain rates ─────────────────────────────────────────────────────

/** Oxygen drain — fraction per second. 1/600 ≈ 10-minute supply. */
const O2_DRAIN_PER_SEC = 1 / 600

/** Battery baseline drain (engine running, idle). */
const BATTERY_BASE_DRAIN_PER_SEC = 1 / 900

/** Extra battery drain proportional to throttle, when engine running. */
const BATTERY_THROTTLE_DRAIN_PER_SEC = 1 / 240

// ── Collision ───────────────────────────────────────────────────────────────

const MINE_HIT_DAMAGE = 0.2
const DAMAGE_FLASH_DURATION_MS = 600

// ── Edge-detection state for one-shot keys ──────────────────────────────────

let _lastSPressed = false

// ─── Main tick ───────────────────────────────────────────────────────────────

export function tickGame(state: GameState, dtMs: number): void {
  const dt = dtMs / 1000

  applyInputs(state, dt)
  updateMotion(state, dt)
  updateDepth(state, dt)
  drainResources(state, dt)
  checkMineCollisions(state, MINES)

  if (state.damageFlashMs > 0) {
    state.damageFlashMs = Math.max(0, state.damageFlashMs - dtMs)
  }
}

// ── Input → controls ─────────────────────────────────────────────────────────

function applyInputs(state: GameState, dt: number): void {
  // ── S: Start / Stop engine (one-shot, edge-triggered) ─────────────────
  const sPressed = isHeld('s') || isHeld('S')
  if (sPressed && !_lastSPressed) {
    state.engineOn = !state.engineOn
    if (state.engineOn) playEngineStart()
    else                playEngineStop()
  }
  _lastSPressed = sPressed

  // ── ←/→ : heading rotation ───────────────────────────────────────────
  if (isHeld('ArrowLeft'))  state.heading -= ROTATION_RATE_DEG_PER_SEC * dt
  if (isHeld('ArrowRight')) state.heading += ROTATION_RATE_DEG_PER_SEC * dt
  state.heading = ((state.heading % 360) + 360) % 360

  // ── ↑/↓ : throttle (always settable — engine just won't translate it
  //         into motion until it's running) ────────────────────────────
  if (isHeld('ArrowUp'))   state.throttle = Math.min(MAX_SPEED, state.throttle + THROTTLE_RATE_PER_SEC * dt)
  if (isHeld('ArrowDown')) state.throttle = Math.max(0,         state.throttle - THROTTLE_RATE_PER_SEC * dt)

  // ── A: Ascend (blow ballast — push water out, fill with air) ────────
  // ── D: Dive   (flood ballast — pull water in, vent air) ─────────────
  if (isHeld('a') || isHeld('A')) {
    state.ballastAirPct   = Math.min(1, state.ballastAirPct   + BALLAST_RATE_PER_SEC * dt)
    state.ballastWaterPct = 1 - state.ballastAirPct
  }
  if (isHeld('d') || isHeld('D')) {
    state.ballastWaterPct = Math.min(1, state.ballastWaterPct + BALLAST_RATE_PER_SEC * dt)
    state.ballastAirPct   = 1 - state.ballastWaterPct
  }
}

// ── Physics: heading + speed → world position ────────────────────────────────

function updateMotion(state: GameState, dt: number): void {
  // Target speed depends on whether the engine is delivering power.
  // Engine off → glide to a stop (drag).
  const targetSpeed = state.engineOn ? state.throttle : 0
  const delta = targetSpeed - state.speed
  state.speed += delta * SPEED_CLOSE_PER_SEC * dt
  if (Math.abs(targetSpeed - state.speed) < 0.01) state.speed = targetSpeed

  // Heading 0 = north = -y on screen (world top).
  const rad = state.heading * Math.PI / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  state.x += dx * state.speed * dt
  state.y += dy * state.speed * dt

  // Toroidal world wrap (Phase 3c may replace with hard bounds).
  state.x = ((state.x % WORLD_W) + WORLD_W) % WORLD_W
  state.y = ((state.y % WORLD_H) + WORLD_H) % WORLD_H
}

// ── Physics: ballast → depth ────────────────────────────────────────────────

function updateDepth(state: GameState, dt: number): void {
  // Net buoyancy: positive (air-heavy) ascends, negative (water-heavy) descends.
  const buoyancy = state.ballastAirPct - state.ballastWaterPct
  state.depth -= buoyancy * DEPTH_RATE_PER_SEC * dt
  state.depth = Math.max(0, Math.min(999, state.depth))
}

// ── Resource drain ──────────────────────────────────────────────────────────

function drainResources(state: GameState, dt: number): void {
  // Oxygen always drains — crew breathes regardless of engine status.
  state.oxygenPct = Math.max(0, state.oxygenPct - O2_DRAIN_PER_SEC * dt)

  // Battery only drains while the engine is running.
  if (state.engineOn) {
    const throttleFraction = state.throttle / MAX_SPEED
    const batteryDrain =
      BATTERY_BASE_DRAIN_PER_SEC + throttleFraction * BATTERY_THROTTLE_DRAIN_PER_SEC
    state.batteryPct = Math.max(0, state.batteryPct - batteryDrain * dt)
  }
}

// ── Collision: mines ────────────────────────────────────────────────────────

function checkMineCollisions(state: GameState, mines: ReadonlyArray<Mine>): void {
  for (const mine of mines) {
    if (mine.disarmed) continue
    if (dist(state.x, state.y, mine.x, mine.y) > MINE_COLLISION_RADIUS) continue

    state.damagePct = Math.min(1, state.damagePct + MINE_HIT_DAMAGE)
    state.damageFlashMs = DAMAGE_FLASH_DURATION_MS
    playMineHit()
    return   // only one collision per frame
  }
}
