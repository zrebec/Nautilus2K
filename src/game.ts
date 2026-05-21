import { isHeld } from 'zx-kit'
import {
  type GameState, type Mine,
  WORLD_W, WORLD_H, MAX_SPEED,
  MINE_COLLISION_RADIUS, MINE_COLLISION_DEPTH, MINES,
  DIESEL_SAFE_DEPTH,
  dist,
} from './state.ts'
import {
  playEngineStart, playEngineStop, playMineHit, playDieselFlood,
} from './audio.ts'

// ── Control rates ────────────────────────────────────────────────────────────

/** Rudder swing rate while ←/→ is held (degrees of rudder per second). */
const RUDDER_RATE_DEG_PER_SEC = 25
/** Rate at which the rudder self-centres when no input is held. */
const RUDDER_RETURN_DEG_PER_SEC = 10
/** Hard rudder limit. Real subs are typically ±35°. */
const MAX_RUDDER_ANGLE = 35
/** How sharply the sub turns: heading delta per second = rudder × speed × this. */
const TURN_PER_KNOT_PER_DEG = 0.05

/** Speed catch-up rate (closing fraction per second). */
const SPEED_CLOSE_PER_SEC = 0.5
/** Throttle change rate while ↑/↓ is held (knots / sec). */
const THROTTLE_RATE_PER_SEC = 4

/** Ballast change rate while A/D is held (fraction per second). */
const BALLAST_RATE_PER_SEC = 0.08

/** Depth-change rate per unit of net buoyancy at full speed (m/sec). */
const DEPTH_RATE_PER_SEC = 8

// ── Resource rates ──────────────────────────────────────────────────────────

const O2_DRAIN_PER_SEC                = 1 / 600
const BATTERY_BASE_DRAIN_PER_SEC      = 1 / 900
const BATTERY_THROTTLE_DRAIN_PER_SEC  = 1 / 240
/** Battery charge rate while DIESEL is running on the surface (fraction / sec). */
const BATTERY_CHARGE_PER_SEC          = 1 / 200

// ── Collision / damage ─────────────────────────────────────────────────────

const MINE_HIT_DAMAGE = 0.2
const DAMAGE_FLASH_DURATION_MS = 600

// ── Edge-detection state for one-shot keys ─────────────────────────────────

let _lastSPressed = false

// ─── Main tick ───────────────────────────────────────────────────────────────

export function tickGame(state: GameState, dtMs: number): void {
  const dt = dtMs / 1000

  applyInputs(state, dt)
  enforceEngineConstraints(state)
  updateRudderAndHeading(state, dt)
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
  // ── S: cycle engine mode OFF → DIESEL → ELEC → OFF ───────────────────
  const sPressed = isHeld('s') || isHeld('S')
  if (sPressed && !_lastSPressed) {
    cycleEngineMode(state)
  }
  _lastSPressed = sPressed

  // ── ←/→ : rudder swing ──────────────────────────────────────────────
  const leftHeld  = isHeld('ArrowLeft')
  const rightHeld = isHeld('ArrowRight')
  if (leftHeld && !rightHeld) {
    state.rudderAngle = Math.max(-MAX_RUDDER_ANGLE, state.rudderAngle - RUDDER_RATE_DEG_PER_SEC * dt)
  } else if (rightHeld && !leftHeld) {
    state.rudderAngle = Math.min( MAX_RUDDER_ANGLE, state.rudderAngle + RUDDER_RATE_DEG_PER_SEC * dt)
  } else {
    // No left/right input → rudder slowly self-centres
    const sign = Math.sign(state.rudderAngle)
    const decay = RUDDER_RETURN_DEG_PER_SEC * dt
    if (Math.abs(state.rudderAngle) < decay) state.rudderAngle = 0
    else state.rudderAngle -= sign * decay
  }

  // ── ↑/↓ : throttle (always settable; ineffective with engine off) ───
  if (isHeld('ArrowUp'))   state.throttle = Math.min(MAX_SPEED, state.throttle + THROTTLE_RATE_PER_SEC * dt)
  if (isHeld('ArrowDown')) state.throttle = Math.max(0,         state.throttle - THROTTLE_RATE_PER_SEC * dt)

  // ── A: Ascend (blow ballast), D: Dive (flood ballast) ───────────────
  if (isHeld('a') || isHeld('A')) {
    state.ballastAirPct   = Math.min(1, state.ballastAirPct   + BALLAST_RATE_PER_SEC * dt)
    state.ballastWaterPct = 1 - state.ballastAirPct
  }
  if (isHeld('d') || isHeld('D')) {
    state.ballastWaterPct = Math.min(1, state.ballastWaterPct + BALLAST_RATE_PER_SEC * dt)
    state.ballastAirPct   = 1 - state.ballastWaterPct
  }
}

function cycleEngineMode(state: GameState): void {
  const previous = state.engineMode
  let next: GameState['engineMode']

  if (state.depth > DIESEL_SAFE_DEPTH) {
    // Underwater: skip DIESEL (it'd auto-flood on the next frame anyway).
    // Toggle directly between OFF and ELEC so the player can actually reach
    // the electric mode they need to be in down here.
    next = state.engineMode === 'ELEC' ? 'OFF' : 'ELEC'
  } else {
    // Surface: cycle through all three options.
    const order: Array<GameState['engineMode']> = ['OFF', 'DIESEL', 'ELEC']
    next = order[(order.indexOf(state.engineMode) + 1) % order.length]
  }

  state.engineMode = next

  if (previous === 'OFF' && next !== 'OFF') playEngineStart()
  if (previous !== 'OFF' && next === 'OFF') playEngineStop()
}

function enforceEngineConstraints(state: GameState): void {
  // DIESEL drowns if you go below the safe-depth threshold. Auto-revert to
  // OFF and play the "flood" warning — the player has to manually switch to
  // ELEC after this.
  if (state.engineMode === 'DIESEL' && state.depth > DIESEL_SAFE_DEPTH) {
    state.engineMode = 'OFF'
    playDieselFlood()
  }
}

// ── Rudder + heading ────────────────────────────────────────────────────────

function updateRudderAndHeading(state: GameState, dt: number): void {
  // Heading rotation rate proportional to (rudder × speed). Zero speed →
  // no rotation regardless of rudder — you have to be moving for the
  // current to act on the rudder blade. Matches real ship feel.
  const turnRate = state.rudderAngle * state.speed * TURN_PER_KNOT_PER_DEG
  state.heading += turnRate * dt
  state.heading = ((state.heading % 360) + 360) % 360
}

// ── Physics: heading + speed → world position ────────────────────────────────

function updateMotion(state: GameState, dt: number): void {
  // Speed target depends on whether the engine is delivering power.
  const targetSpeed = state.engineMode === 'OFF' ? 0 : state.throttle
  const delta = targetSpeed - state.speed
  state.speed += delta * SPEED_CLOSE_PER_SEC * dt
  if (Math.abs(targetSpeed - state.speed) < 0.01) state.speed = targetSpeed

  // Heading 0 = north = -y on screen.
  const rad = state.heading * Math.PI / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  state.x += dx * state.speed * dt
  state.y += dy * state.speed * dt

  // Toroidal world wrap (Phase 3c may replace with hard bounds).
  state.x = ((state.x % WORLD_W) + WORLD_W) % WORLD_W
  state.y = ((state.y % WORLD_H) + WORLD_H) % WORLD_H
}

// ── Physics: ballast → depth (now gated by speed) ──────────────────────────

function updateDepth(state: GameState, dt: number): void {
  // No engine power → no plane control → no depth change.
  // This matches the real-world rule: you can't dive without forward motion
  // because the dive planes need water flowing across them to work.
  if (state.engineMode === 'OFF' || state.speed < 0.5) return

  const buoyancy   = state.ballastAirPct - state.ballastWaterPct       // -1..+1
  const speedFrac  = state.speed / MAX_SPEED                            // 0..1
  state.depth -= buoyancy * DEPTH_RATE_PER_SEC * speedFrac * dt
  state.depth = Math.max(0, Math.min(999, state.depth))
}

// ── Resource drain ──────────────────────────────────────────────────────────

function drainResources(state: GameState, dt: number): void {
  // Crew breathes regardless of engine status.
  state.oxygenPct = Math.max(0, state.oxygenPct - O2_DRAIN_PER_SEC * dt)

  if (state.engineMode === 'DIESEL') {
    // Diesel on the surface CHARGES the battery (this is the whole reason
    // surfacing exists). Faster than the small constant base drain, so net
    // positive while running.
    state.batteryPct = Math.min(1, state.batteryPct + BATTERY_CHARGE_PER_SEC * dt)
  } else if (state.engineMode === 'ELEC') {
    // Electric drains from the battery — base + throttle-proportional load.
    const throttleFraction = state.throttle / MAX_SPEED
    const drain = BATTERY_BASE_DRAIN_PER_SEC + throttleFraction * BATTERY_THROTTLE_DRAIN_PER_SEC
    state.batteryPct = Math.max(0, state.batteryPct - drain * dt)
  }
  // OFF: no battery delta
}

// ── Collision: mines (now depth-sensitive) ──────────────────────────────────

function checkMineCollisions(state: GameState, mines: ReadonlyArray<Mine>): void {
  for (const mine of mines) {
    if (mine.disarmed) continue
    if (dist(state.x, state.y, mine.x, mine.y) > MINE_COLLISION_RADIUS) continue
    // Must also be at matching depth — sailing across the surface position
    // of a mine 80 m below is harmless until you actually descend to it.
    if (Math.abs(state.depth - mine.depth) > MINE_COLLISION_DEPTH) continue

    state.damagePct = Math.min(1, state.damagePct + MINE_HIT_DAMAGE)
    state.damageFlashMs = DAMAGE_FLASH_DURATION_MS
    playMineHit()
    return
  }
}
