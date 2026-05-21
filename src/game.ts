import { isHeld } from 'zx-kit'
import {
  type GameState, type Mine,
  WORLD_W, WORLD_H, MAX_SPEED, MINE_COLLISION_RADIUS, MINES,
  dist,
} from './state.ts'

// ── Control rates ────────────────────────────────────────────────────────────

/** Heading rotation rate in degrees per second while holding Left/Right. */
const ROTATION_RATE_DEG_PER_SEC = 30

/** How fast `speed` chases `throttle` (closing-rate per second). */
const SPEED_CLOSE_PER_SEC = 0.5

/** How fast a throttle key press changes target speed (knots / sec while held). */
const THROTTLE_RATE_PER_SEC = 4

/** Rate at which W/S shifts ballast (fraction per second while held). */
const BALLAST_RATE_PER_SEC = 0.25

/** How fast depth changes per unit of net buoyancy (metres / sec at full diff). */
const DEPTH_RATE_PER_SEC = 8

// ── Resource drain rates ─────────────────────────────────────────────────────

/** Oxygen drain (fraction per second). 1/600 ≈ 10 minute supply. */
const O2_DRAIN_PER_SEC = 1 / 600

/** Battery baseline drain (always running, fraction per second). */
const BATTERY_BASE_DRAIN_PER_SEC = 1 / 900

/** Extra battery drain proportional to throttle (full throttle adds this much). */
const BATTERY_THROTTLE_DRAIN_PER_SEC = 1 / 240

// ── Collision / damage ──────────────────────────────────────────────────────

/** Damage taken per mine hit (fraction). */
const MINE_HIT_DAMAGE = 0.2

/** Duration of the red border flash after a mine hit (milliseconds). */
const DAMAGE_FLASH_DURATION_MS = 600

// ─── Main tick ───────────────────────────────────────────────────────────────

/**
 * Advances the game state by `dtMs` milliseconds. Reads inputs via zx-kit's
 * `isHeld()`, applies them to controls, integrates physics, drains resources,
 * checks mine collisions. Pure state mutation — does not draw anything.
 */
export function tickGame(state: GameState, dtMs: number): void {
  const dt = dtMs / 1000   // convert to seconds for rate maths

  applyInputs(state, dt)
  updateMotion(state, dt)
  updateDepth(state, dt)
  drainResources(state, dt)
  checkMineCollisions(state, MINES)

  // Damage flash ticks down regardless of further collisions
  if (state.damageFlashMs > 0) {
    state.damageFlashMs = Math.max(0, state.damageFlashMs - dtMs)
  }
}

// ── Input → controls ─────────────────────────────────────────────────────────

function applyInputs(state: GameState, dt: number): void {
  // Heading: arrows ← → rotate the sub
  if (isHeld('ArrowLeft'))  state.heading -= ROTATION_RATE_DEG_PER_SEC * dt
  if (isHeld('ArrowRight')) state.heading += ROTATION_RATE_DEG_PER_SEC * dt
  state.heading = ((state.heading % 360) + 360) % 360

  // Throttle: arrows ↑ ↓ change target speed
  if (isHeld('ArrowUp'))   state.throttle = Math.min(MAX_SPEED, state.throttle + THROTTLE_RATE_PER_SEC * dt)
  if (isHeld('ArrowDown')) state.throttle = Math.max(0,         state.throttle - THROTTLE_RATE_PER_SEC * dt)

  // Ballast: W blows air (ascend), S floods water (descend)
  if (isHeld('w') || isHeld('W')) {
    state.ballastAirPct   = Math.min(1, state.ballastAirPct   + BALLAST_RATE_PER_SEC * dt)
    state.ballastWaterPct = 1 - state.ballastAirPct
  }
  if (isHeld('s') || isHeld('S')) {
    state.ballastWaterPct = Math.min(1, state.ballastWaterPct + BALLAST_RATE_PER_SEC * dt)
    state.ballastAirPct   = 1 - state.ballastWaterPct
  }
}

// ── Physics: heading + speed → world position ────────────────────────────────

function updateMotion(state: GameState, dt: number): void {
  // Speed smoothly chases throttle (the engine isn't instantaneous)
  const delta = state.throttle - state.speed
  state.speed += delta * SPEED_CLOSE_PER_SEC * dt
  // Snap when very close to avoid endless asymptote
  if (Math.abs(state.throttle - state.speed) < 0.01) state.speed = state.throttle

  // Translate heading + speed into world delta. Heading 0 = north = -y.
  const rad = state.heading * Math.PI / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  state.x += dx * state.speed * dt
  state.y += dy * state.speed * dt

  // Wrap-around world (toroidal). Keeps the sub on screen forever; Phase 3c
  // may replace this with hard boundaries or a larger world.
  state.x = ((state.x % WORLD_W) + WORLD_W) % WORLD_W
  state.y = ((state.y % WORLD_H) + WORLD_H) % WORLD_H
}

// ── Physics: ballast → depth ────────────────────────────────────────────────

function updateDepth(state: GameState, dt: number): void {
  // Net buoyancy. air > water → positive (lighter, ascending = depth decreasing).
  const buoyancy = state.ballastAirPct - state.ballastWaterPct   // -1..+1
  state.depth -= buoyancy * DEPTH_RATE_PER_SEC * dt
  state.depth = Math.max(0, Math.min(999, state.depth))
}

// ── Resource drain ──────────────────────────────────────────────────────────

function drainResources(state: GameState, dt: number): void {
  state.oxygenPct = Math.max(0, state.oxygenPct - O2_DRAIN_PER_SEC * dt)

  const throttleFraction = state.throttle / MAX_SPEED
  const batteryDrain =
    BATTERY_BASE_DRAIN_PER_SEC + throttleFraction * BATTERY_THROTTLE_DRAIN_PER_SEC
  state.batteryPct = Math.max(0, state.batteryPct - batteryDrain * dt)
}

// ── Collision: mines ────────────────────────────────────────────────────────

function checkMineCollisions(state: GameState, mines: ReadonlyArray<Mine>): void {
  for (const mine of mines) {
    if (mine.disarmed) continue
    if (dist(state.x, state.y, mine.x, mine.y) > MINE_COLLISION_RADIUS) continue

    // Hit! Apply damage, kick off the flash. We don't disarm in 3b — the mine
    // stays as a permanent obstacle (you can drift back into it). This makes
    // misses meaningful even before the disarm mechanic lands in 3c.
    state.damagePct = Math.min(1, state.damagePct + MINE_HIT_DAMAGE)
    state.damageFlashMs = DAMAGE_FLASH_DURATION_MS

    // Only one collision per frame — drift through the mine's centre on the
    // next frame won't double-tap damage if we already triggered.
    return
  }
}
