/**
 * World / submarine state for Phase 3b.
 *
 * Single source of truth: `tickGame()` mutates this each frame based on inputs
 * and physics, `render()` reads it. Nothing else holds gameplay state.
 */

// ── World geometry ────────────────────────────────────────────────────────────

/** World extent in abstract units. The sub starts roughly in the middle. */
export const WORLD_W = 1024
export const WORLD_H = 1024

/** Submarine maximum speed in knots. Maps 1:1 to world units per second. */
export const MAX_SPEED = 12

/** Sonar detection range in world units. Mines outside this radius don't appear. */
export const SONAR_RANGE = 160

/** Half-angle of the periscope forward viewing cone, in degrees. */
export const PERISCOPE_FOV_DEG = 50

/** Maximum range a mine can be displayed in the periscope, in world units. */
export const PERISCOPE_RANGE = 220

/** 2D collision radius (must overlap horizontally in world units). */
export const MINE_COLLISION_RADIUS = 10

/** Vertical collision tolerance — the sub must be within ±this many metres
 * of the mine's depth to actually touch it. Forces the player to match
 * depth, not just sail over the mine's surface position. */
export const MINE_COLLISION_DEPTH = 5

/** Maximum |mine.depth − sub.depth| visible in the periscope, in metres.
 * A mine at exactly this depth difference is drawn at the very top or
 * bottom of the periscope view; beyond this it's out of frame vertically. */
export const PERISCOPE_DEPTH_RANGE = 100

/** Depth at which diesel intake/exhaust floods (auto-shutdown threshold). */
export const DIESEL_SAFE_DEPTH = 5

// ── Mine layout ───────────────────────────────────────────────────────────────

export interface Mine {
  /** World x */
  readonly x: number
  /** World y (y=0 is north / top of world) */
  readonly y: number
  /** Mine depth in metres. The sub must match this depth (±MINE_COLLISION_DEPTH)
   * to actually touch the mine — sailing across its surface position isn't
   * enough if you're too shallow or too deep. */
  readonly depth: number
  /** Disarming gameplay arrives in Phase 3c. For 3b mines are permanent. */
  disarmed: boolean
}

/**
 * Hand-placed mine layout. Ten mines spread across the world at varied depths
 * (20–120 m) so the player has to manage ballast as well as 2D navigation.
 * None inside the start zone — a quick straight dash gets you nowhere
 * dangerous; you have to deliberately seek contacts out.
 */
export const MINES: Mine[] = [
  { x: 220, y: 180, depth:  30, disarmed: false },
  { x: 720, y: 260, depth:  80, disarmed: false },
  { x: 820, y: 540, depth:  50, disarmed: false },
  { x: 680, y: 820, depth: 110, disarmed: false },
  { x: 320, y: 780, depth:  40, disarmed: false },
  { x: 160, y: 560, depth:  90, disarmed: false },
  { x: 480, y: 120, depth:  60, disarmed: false },
  { x: 540, y: 880, depth: 120, disarmed: false },
  { x: 900, y: 760, depth:  25, disarmed: false },
  { x: 100, y: 320, depth: 100, disarmed: false },
]

// ── Submarine state ───────────────────────────────────────────────────────────

export interface GameState {
  // ── Position & motion ────────────────────────────────────────────────
  /** Submarine x in world units. */
  x: number
  /** Submarine y in world units. */
  y: number
  /** Heading in degrees `0..360`. `0`/`360` = north (up). */
  heading: number
  /** Current rudder deflection in degrees, `-35..+35` (port negative,
   * starboard positive). Set by the ←/→ keys, self-centres slowly when
   * released. Turning rate of the sub = `rudderAngle × speed × factor`,
   * so a zero-speed sub doesn't turn no matter how the rudder is set. */
  rudderAngle: number
  /** Current speed in knots. Smoothly interpolates toward `throttle`. */
  speed: number
  /** Player-requested speed in knots (`0..MAX_SPEED`). Throttle the engine. */
  throttle: number
  /** Current depth in metres. Driven by net buoyancy × current speed. */
  depth: number

  // ── Ballast (controls depth) ─────────────────────────────────────────
  /** Air fraction in the ballast tanks `0..1`. `airPct + waterPct === 1`. */
  ballastAirPct: number
  /** Water fraction in the ballast tanks `0..1`. */
  ballastWaterPct: number

  // ── Resources ────────────────────────────────────────────────────────
  /** Oxygen remaining `0..1`. Drains slowly with time. */
  oxygenPct: number
  /** Battery charge `0..1`. Drains faster at higher throttle. */
  batteryPct: number
  /** Hull damage taken `0..1` (1 = destroyed). Goes up when colliding with mines. */
  damagePct: number

  // ── Engine + mission counters ────────────────────────────────────────
  /** Active propulsion mode:
   * - `'OFF'`   — no engine, no throttle effect, ballast doesn't change depth
   *               (no forward motion = no plane control)
   * - `'DIESEL'`— surface-only combustion engine; CHARGES battery, auto-shuts
   *               down if you go deeper than `DIESEL_SAFE_DEPTH` (intake floods)
   * - `'ELEC'`  — battery-driven motor; works at any depth, drains battery
   *
   * S key cycles `OFF → DIESEL → ELEC → OFF`. */
  engineMode: 'OFF' | 'DIESEL' | 'ELEC'
  /** Mines marked / disarmed so far (Phase 3c gameplay). */
  minesFound: number
  /** Remaining lives. */
  lives: number

  // ── Transient effects (driven by tickGame, read by render) ───────────
  /** Milliseconds of damage flash remaining (red border + screen wobble). */
  damageFlashMs: number
}

/** Build a fresh state — sub starts AT THE SURFACE, engine off, full resources. */
export function createInitialState(): GameState {
  return {
    x: WORLD_W / 2,
    y: WORLD_H / 2,
    heading: 0,
    rudderAngle: 0,
    speed: 0,
    throttle: 0,
    depth: 0,                 // at the surface

    ballastAirPct: 1.0,       // full air = max buoyancy = floats at the surface
    ballastWaterPct: 0.0,

    oxygenPct: 1.0,
    batteryPct: 1.0,
    damagePct: 0.0,

    engineMode: 'OFF',        // player presses S to cycle modes
    minesFound: 0,
    lives: 3,

    damageFlashMs: 0,
  }
}

// ── Derived data helpers (computed each frame from state + world) ────────────

/** Euclidean distance in world units. */
export function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Bearing from `(fromX, fromY)` to `(toX, toY)` in degrees, world-frame
 * (0 = north, 90 = east, 180 = south, 270 = west).
 */
export function bearingTo(fromX: number, fromY: number, toX: number, toY: number): number {
  // atan2 with y-up convention: angle from +Y axis, clockwise
  const dx = toX - fromX
  const dy = toY - fromY
  const ang = Math.atan2(dx, -dy) * 180 / Math.PI
  return (ang + 360) % 360
}

/** Relative bearing (-180..180): how far off the sub's nose the target is. */
export function relativeBearing(subHeading: number, absoluteBearing: number): number {
  let rel = absoluteBearing - subHeading
  while (rel >  180) rel -= 360
  while (rel < -180) rel += 360
  return rel
}
