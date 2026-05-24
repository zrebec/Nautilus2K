import { isHeld } from 'zx-kit'
import {
  type GameState, type Mine, type DivePhase, type SurfacePhase,
  WORLD_W, WORLD_H, MAX_SPEED,
  MINES,
  dist,
} from './state.ts'
import {
  playEngineStart, playEngineStop, playMineHit,
  playCrashDiveKlaxon, playSurfaceBreach,
} from './audio.ts'
import {
  RUDDER_RATE_DEG_PER_SEC, RUDDER_AMIDSHIPS_RATE_DEG_PER_SEC, MAX_RUDDER_ANGLE,
  TURN_PER_KNOT_PER_DEG, SPEED_CLOSE_PER_SEC, THROTTLE_RATE_PER_SEC,
  BALLAST_RATE_PER_SEC, DEPTH_RATE_PER_SEC, MIN_SPEED_FOR_DEPTH, MAX_DEPTH_M,
  O2_DRAIN_PER_SEC, BATTERY_BASE_DRAIN_PER_SEC,
  BATTERY_THROTTLE_DRAIN_PER_SEC, BATTERY_CHARGE_PER_SEC,
  MINE_COLLISION_RADIUS, MINE_COLLISION_DEPTH, DIESEL_SAFE_DEPTH,
  MINE_HIT_DAMAGE, DAMAGE_FLASH_DURATION_MS,
  DIVE_PHASE_KLAXON_MS, DIVE_PHASE_SHUTDOWN_MS,
  DIVE_PHASE_ENGAGE_MS, DIVE_PHASE_FLOOD_MS,
  SURFACE_PHASE_BREACH_MS, SURFACE_PHASE_DRAIN_MS, SURFACE_PHASE_HATCHES_MS,
  HEADING_HOLD_MAX_RUDDER_DEG, HEADING_HOLD_KP,
  DEPTH_TARGET_STEP_M,
  ORDERED_DEPTH_BALLAST_RATE_PER_SEC, ORDERED_DEPTH_TOLERANCE_M,
} from './config.ts'

// ── Edge-detection state for one-shot keys ─────────────────────────────────

let _lastSPressed = false
let _lastSpacePressed = false
let _lastHPressed = false
let _lastQPressed = false
let _lastEPressed = false

// ─── Main tick ───────────────────────────────────────────────────────────────

export function tickGame(state: GameState, dtMs: number): void {
  const dt = dtMs / 1000

  applyInputs(state, dt)
  advanceDiveProcedure(state, dtMs)
  advanceSurfaceProcedure(state, dtMs)
  applyHeadingHold(state)
  applyOrderedDepth(state, dt)
  updateRudderAndHeading(state, dt)
  updateMotion(state, dt)
  updateDepth(state, dt)
  checkSubModeTransitions(state)
  drainResources(state, dt)
  checkMineCollisions(state, MINES)

  if (state.damageFlashMs > 0) {
    state.damageFlashMs = Math.max(0, state.damageFlashMs - dtMs)
  }
}

// ── Input → controls ─────────────────────────────────────────────────────────

function applyInputs(state: GameState, dt: number): void {
  const inProcedure = state.subMode === 'diving' || state.subMode === 'surfacing'

  // ── S: cycle engine mode (locked during dive/surface procedures) ─────
  const sPressed = isHeld('s') || isHeld('S')
  if (sPressed && !_lastSPressed && !inProcedure) {
    cycleEngineMode(state)
  }
  _lastSPressed = sPressed

  // ── Space: crash dive (surface only) ─────────────────────────────────
  const spacePressed = isHeld(' ') || isHeld('Space')
  if (spacePressed && !_lastSpacePressed && state.subMode === 'surface') {
    initiateCrashDive(state)
  }
  _lastSpacePressed = spacePressed

  // ── H: toggle heading hold ───────────────────────────────────────────
  const hPressed = isHeld('h') || isHeld('H')
  if (hPressed && !_lastHPressed) {
    state.headingHoldActive = !state.headingHoldActive
    if (state.headingHoldActive) state.headingTarget = state.heading
  }
  _lastHPressed = hPressed

  // ── Q/E: ordered depth ±step (submerged only) ────────────────────────
  const qPressed = isHeld('q') || isHeld('Q')
  if (qPressed && !_lastQPressed && state.subMode === 'submerged') {
    state.depthTarget = Math.max(0, state.depthTarget - DEPTH_TARGET_STEP_M)
  }
  _lastQPressed = qPressed
  const ePressed = isHeld('e') || isHeld('E')
  if (ePressed && !_lastEPressed && state.subMode === 'submerged') {
    state.depthTarget = Math.min(MAX_DEPTH_M, state.depthTarget + DEPTH_TARGET_STEP_M)
  }
  _lastEPressed = ePressed

  // ── ←/→ : rudder swing (always — no self-center) ─────────────────────
  // Holding the key swings the rudder; releasing LEAVES it where it is.
  // To return to centre, press X (rudder amidships). Real-sub behaviour.
  const leftHeld  = isHeld('ArrowLeft')
  const rightHeld = isHeld('ArrowRight')
  const xPressed  = isHeld('x') || isHeld('X')
  if (leftHeld && !rightHeld) {
    state.rudderAngle = Math.max(-MAX_RUDDER_ANGLE, state.rudderAngle - RUDDER_RATE_DEG_PER_SEC * dt)
  } else if (rightHeld && !leftHeld) {
    state.rudderAngle = Math.min( MAX_RUDDER_ANGLE, state.rudderAngle + RUDDER_RATE_DEG_PER_SEC * dt)
  } else if (xPressed) {
    // X held — drive rudder back to centre at a controlled rate.
    const sign = Math.sign(state.rudderAngle)
    const decay = RUDDER_AMIDSHIPS_RATE_DEG_PER_SEC * dt
    if (Math.abs(state.rudderAngle) < decay) state.rudderAngle = 0
    else state.rudderAngle -= sign * decay
  }

  // ── ↑/↓ : throttle (always settable; ineffective with engine off) ───
  if (isHeld('ArrowUp'))   state.throttle = Math.min(MAX_SPEED, state.throttle + THROTTLE_RATE_PER_SEC * dt)
  if (isHeld('ArrowDown')) state.throttle = Math.max(0,         state.throttle - THROTTLE_RATE_PER_SEC * dt)

  // ── A/D: manual ballast (override target-depth auto-trim) ────────────
  // Disabled during the dive procedure — the procedure controls ballast itself.
  // Allowed during surfacing so the player can hasten the ascent if they
  // want, but the procedure timer is what gates the final surface state.
  if (!inProcedure || state.subMode === 'surfacing') {
    if (isHeld('a') || isHeld('A')) {
      state.ballastAirPct   = Math.min(1, state.ballastAirPct   + BALLAST_RATE_PER_SEC * dt)
      state.ballastWaterPct = 1 - state.ballastAirPct
    }
    if (isHeld('d') || isHeld('D')) {
      state.ballastWaterPct = Math.min(1, state.ballastWaterPct + BALLAST_RATE_PER_SEC * dt)
      state.ballastAirPct   = 1 - state.ballastWaterPct
    }
  }
}

// ── Engine mode cycling — now mode-aware ─────────────────────────────────────

function cycleEngineMode(state: GameState): void {
  const previous = state.engineMode
  let next: GameState['engineMode']

  if (state.subMode === 'submerged') {
    // Underwater: toggle OFF ↔ ELEC. DIESEL would flood the intake.
    next = state.engineMode === 'ELEC' ? 'OFF' : 'ELEC'
  } else if (state.subMode === 'surface') {
    // Surface: toggle OFF ↔ DIESEL. ELEC is not reachable directly —
    // the player must initiate a dive (Space) to engage the electric
    // motor as part of the dive procedure.
    next = state.engineMode === 'DIESEL' ? 'OFF' : 'DIESEL'
  } else {
    return // diving / surfacing: S is disabled (caller already checked)
  }

  state.engineMode = next

  if (previous === 'OFF' && next !== 'OFF') playEngineStart()
  if (previous !== 'OFF' && next === 'OFF') playEngineStop()
}

// ── Crash dive: kick off the dive procedure ─────────────────────────────────

function initiateCrashDive(state: GameState): void {
  state.subMode = 'diving'
  state.divePhase = 'klaxon'
  state.procedureTimer = 0
  playCrashDiveKlaxon()
}

// ── Dive procedure: state machine across the 4 phases ───────────────────────

function advanceDiveProcedure(state: GameState, dtMs: number): void {
  if (state.subMode !== 'diving' || state.divePhase === null) return
  state.procedureTimer += dtMs

  const phaseDuration = divePhaseDuration(state.divePhase)
  if (state.procedureTimer < phaseDuration) {
    // Apply per-phase effects on every frame within the phase.
    switch (state.divePhase) {
      case 'shutdown':
        // Diesel winds down — force engineMode to OFF if not already there.
        if (state.engineMode === 'DIESEL') state.engineMode = 'OFF'
        break
      case 'flood':
        // Ballast tanks fill at a fixed pace across the flood phase, regardless
        // of player input. Reaches 100% water by the end of the phase.
        {
          const progress = state.procedureTimer / phaseDuration
          state.ballastWaterPct = Math.min(1, progress)
          state.ballastAirPct   = 1 - state.ballastWaterPct
        }
        break
    }
    return
  }

  // Phase complete — advance to the next.
  state.procedureTimer = 0
  state.divePhase = nextDivePhase(state.divePhase)
  if (state.divePhase === 'engage') {
    // Entering engage: motor spin-up SFX (re-use the engine-start jingle).
    playEngineStart()
  } else if (state.divePhase === 'flood') {
    // Engage phase completed → ELEC engaged for the rest of the dive.
    state.engineMode = 'ELEC'
  } else if (state.divePhase === null) {
    // Procedure finished — full flood applied, ELEC running. The boat is
    // probably still on the surface; physics will drag it down from here.
    // subMode stays 'diving' until depth crosses the safe threshold —
    // see checkSubModeTransitions().
  }
}

function divePhaseDuration(p: DivePhase): number {
  switch (p) {
    case 'klaxon':   return DIVE_PHASE_KLAXON_MS
    case 'shutdown': return DIVE_PHASE_SHUTDOWN_MS
    case 'engage':   return DIVE_PHASE_ENGAGE_MS
    case 'flood':    return DIVE_PHASE_FLOOD_MS
  }
}

function nextDivePhase(p: DivePhase): DivePhase | null {
  switch (p) {
    case 'klaxon':   return 'shutdown'
    case 'shutdown': return 'engage'
    case 'engage':   return 'flood'
    case 'flood':    return null   // procedure complete
  }
}

// ── Surface procedure: state machine across the 3 phases ────────────────────

function advanceSurfaceProcedure(state: GameState, dtMs: number): void {
  if (state.subMode !== 'surfacing' || state.surfacePhase === null) return
  state.procedureTimer += dtMs

  const phaseDuration = surfacePhaseDuration(state.surfacePhase)
  if (state.procedureTimer < phaseDuration) return

  state.procedureTimer = 0
  state.surfacePhase = nextSurfacePhase(state.surfacePhase)
  if (state.surfacePhase === null) {
    // Surface procedure complete. Switch to surface mode, kill ELEC — the
    // player must press S to start DIESEL.
    state.subMode = 'surface'
    state.engineMode = 'OFF'
    state.depthTarget = 0
    playEngineStop()
  }
}

function surfacePhaseDuration(p: SurfacePhase): number {
  switch (p) {
    case 'breach':  return SURFACE_PHASE_BREACH_MS
    case 'drain':   return SURFACE_PHASE_DRAIN_MS
    case 'hatches': return SURFACE_PHASE_HATCHES_MS
  }
}

function nextSurfacePhase(p: SurfacePhase): SurfacePhase | null {
  switch (p) {
    case 'breach':  return 'drain'
    case 'drain':   return 'hatches'
    case 'hatches': return null
  }
}

// ── Sub mode transitions driven by depth ────────────────────────────────────

function checkSubModeTransitions(state: GameState): void {
  // Diving → submerged: triggered when (a) the dive procedure has completed
  // (divePhase === null) AND (b) the sub has descended past the safe-depth
  // threshold. Until then we're still "in transit".
  if (state.subMode === 'diving' && state.divePhase === null && state.depth > DIESEL_SAFE_DEPTH) {
    state.subMode = 'submerged'
    state.depthTarget = state.depth   // hold whatever depth we reached on auto-pilot
  }

  // Submerged → surfacing: triggered when the player has blown the ballast
  // and the boat has actually surfaced (depth back to 0). The surface
  // procedure then runs through breach → drain → hatches.
  if (state.subMode === 'submerged' && state.depth <= 0) {
    state.subMode = 'surfacing'
    state.surfacePhase = 'breach'
    state.procedureTimer = 0
    playSurfaceBreach()
  }
}

// ── Heading hold (autopilot) — P controller, runs only when active ──────────

function applyHeadingHold(state: GameState): void {
  if (!state.headingHoldActive) return
  // Error = target − current, normalised to [-180, +180] so we always turn the short way.
  let error = state.headingTarget - state.heading
  while (error >  180) error -= 360
  while (error < -180) error += 360

  // Proportional correction, clamped to a sane rudder range.
  let correction = error * HEADING_HOLD_KP
  if (correction >  HEADING_HOLD_MAX_RUDDER_DEG) correction =  HEADING_HOLD_MAX_RUDDER_DEG
  if (correction < -HEADING_HOLD_MAX_RUDDER_DEG) correction = -HEADING_HOLD_MAX_RUDDER_DEG

  // Autopilot owns the rudder while active. Player ←/→ are still processed
  // in applyInputs above and will fight the autopilot — that's intentional,
  // so the player can override and the autopilot picks up after release.
  state.rudderAngle = correction
}

// ── Ordered depth (planesmen) — auto-trim ballast toward depthTarget ────────

function applyOrderedDepth(state: GameState, dt: number): void {
  // Only the planesmen drive ballast — never during the dive procedure
  // (which owns the ballast directly) and only while submerged.
  if (state.subMode !== 'submerged') return

  // Player manual ballast (A/D) overrides — detect by checking if input is
  // being applied. We don't gate against it; we just won't fight at the same
  // frame because both ran in the same tick. Player input takes precedence
  // because it runs AFTER this function in tickGame's order... wait, no, it
  // runs BEFORE. So we need to be careful — let the auto-trim only nudge.
  // The simplest correct rule: skip auto-trim when A or D is currently held.
  if (isHeld('a') || isHeld('A') || isHeld('d') || isHeld('D')) return

  const depthError = state.depthTarget - state.depth   // + = need to go deeper
  if (Math.abs(depthError) <= ORDERED_DEPTH_TOLERANCE_M) {
    // Within tolerance — settle ballast at neutral (50/50) to hold depth.
    const drift = state.ballastWaterPct - 0.5
    const settle = Math.min(Math.abs(drift), ORDERED_DEPTH_BALLAST_RATE_PER_SEC * dt)
    state.ballastWaterPct -= Math.sign(drift) * settle
    state.ballastAirPct = 1 - state.ballastWaterPct
    return
  }

  // Outside tolerance — drive ballast toward whichever side we need.
  const direction = depthError > 0 ? +1 : -1   // +1 = flood, -1 = blow
  state.ballastWaterPct = Math.max(0, Math.min(1,
    state.ballastWaterPct + direction * ORDERED_DEPTH_BALLAST_RATE_PER_SEC * dt))
  state.ballastAirPct = 1 - state.ballastWaterPct
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

// ── Physics: ballast → depth (gated by speed) ──────────────────────────────

function updateDepth(state: GameState, dt: number): void {
  // No engine power → no plane control → no depth change.
  // This matches the real-world rule: you can't dive without forward motion
  // because the dive planes need water flowing across them to work.
  if (state.engineMode === 'OFF' || state.speed < MIN_SPEED_FOR_DEPTH) return

  const buoyancy   = state.ballastAirPct - state.ballastWaterPct       // -1..+1
  const speedFrac  = state.speed / MAX_SPEED                            // 0..1
  state.depth -= buoyancy * DEPTH_RATE_PER_SEC * speedFrac * dt
  state.depth = Math.max(0, Math.min(MAX_DEPTH_M, state.depth))
}

// ── Resource drain ──────────────────────────────────────────────────────────

function drainResources(state: GameState, dt: number): void {
  // Crew breathes regardless of engine status.
  state.oxygenPct = Math.max(0, state.oxygenPct - O2_DRAIN_PER_SEC * dt)

  if (state.engineMode === 'DIESEL') {
    state.batteryPct = Math.min(1, state.batteryPct + BATTERY_CHARGE_PER_SEC * dt)
  } else if (state.engineMode === 'ELEC') {
    const throttleFraction = state.throttle / MAX_SPEED
    const drain = BATTERY_BASE_DRAIN_PER_SEC + throttleFraction * BATTERY_THROTTLE_DRAIN_PER_SEC
    state.batteryPct = Math.max(0, state.batteryPct - drain * dt)
  }
}

// ── Collision: mines (now depth-sensitive) ──────────────────────────────────

function checkMineCollisions(state: GameState, mines: ReadonlyArray<Mine>): void {
  for (const mine of mines) {
    if (mine.disarmed) continue
    if (dist(state.x, state.y, mine.x, mine.y) > MINE_COLLISION_RADIUS) continue
    if (Math.abs(state.depth - mine.depth) > MINE_COLLISION_DEPTH) continue

    state.damagePct = Math.min(1, state.damagePct + MINE_HIT_DAMAGE)
    state.damageFlashMs = DAMAGE_FLASH_DURATION_MS
    playMineHit()
    return
  }
}
