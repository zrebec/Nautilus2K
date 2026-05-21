import {
  initAudio, createAY, beep, playPattern, getAudioContext,
  type AYChip,
} from 'zx-kit'
import { type GameState, MAX_SPEED } from './state.ts'

// ── Lifecycle ────────────────────────────────────────────────────────────────

let ay: AYChip | null = null
let initialized = false

/**
 * Initialises the shared zx-kit AudioContext and an AY chip instance.
 * Must be called from inside a user-gesture handler (keydown/click).
 * Idempotent — safe to call from multiple gesture handlers.
 */
export function initSubAudio(): void {
  if (initialized) return
  initialized = true
  initAudio(0.5)
  ay = createAY()
  // Channels: A = engine drone, B = ballast pump noise, C = reserved
  ay.tone('A', 60, 0)
  ay.disableNoise('B')
  ay.tone('B', 0, 0)
}

export function isAudioInitialized(): boolean { return initialized }

// ── Continuous: engine drone (DIESEL vs ELEC sound very different) ───────────

/**
 * Drives the continuous engine drone on AY channel A. Diesel = lower, throaty,
 * with added noise channel C for that combustion rumble; Electric = higher,
 * pure tone, no noise — the clean whine of a battery motor.
 */
export function updateEngineSound(state: GameState): void {
  if (!ay) return

  if (state.engineMode === 'OFF' || state.speed < 0.1) {
    ay.tone('A', 0)
    ay.tone('C', 0)
    return
  }

  const fraction = state.speed / MAX_SPEED   // 0..1

  if (state.engineMode === 'DIESEL') {
    // Throaty diesel rumble: 40–110 Hz on channel A, plus a quieter low
    // tone on channel C an octave below to thicken the texture.
    const baseFreq = 40 + fraction * 70
    const vol = Math.round(4 + fraction * 6)
    ay.tone('A', baseFreq, vol)
    ay.tone('C', baseFreq / 2, Math.max(2, vol - 3))
  } else {
    // ELEC: clean rising whine, 80–220 Hz on A only.
    const freq = 80 + fraction * 140
    const vol = Math.round(3 + fraction * 5)
    ay.tone('A', freq, vol)
    ay.tone('C', 0)
  }
}

// ── Continuous: ballast pump hiss while A/D is held ──────────────────────────

/**
 * Pumps a noise channel while the player is holding A (blow) or D (flood).
 * Gives the "tssss" hiss of high-pressure air or water pumps without using
 * up an oscillator channel that the engine might need.
 */
export function updateBallastSound(blowing: boolean, flooding: boolean): void {
  if (!ay) return
  if (blowing || flooding) {
    // High-frequency noise period for a tighter "hiss"; lower period = darker.
    // Blow uses higher pitch (air rushing out), flood uses lower (water in).
    ay.enableNoise('B', blowing ? 4 : 12)
  } else {
    ay.disableNoise('B')
  }
}

// ── Periodic: sonar ping when contacts are in range ──────────────────────────

let _sonarPingTimer = 0

/**
 * Plays a sonar ping at a rate that scales with how close the nearest contact
 * is — far contacts give a slow regular pulse, close contacts hammer at you.
 * Pass `null` for `nearestRangeM` when there are no contacts.
 */
export function updateSonarPing(nearestRangeM: number | null, dtMs: number, sonarRange: number): void {
  if (nearestRangeM === null) {
    _sonarPingTimer = 0
    return
  }
  // Interval: 2500 ms at max range, down to 300 ms at point-blank.
  const fraction = Math.max(0, Math.min(1, nearestRangeM / sonarRange))
  const interval = 300 + fraction * 2200
  _sonarPingTimer -= dtMs
  if (_sonarPingTimer <= 0) {
    _sonarPingTimer = interval
    const ctx = getAudioContext()
    if (ctx) {
      // Higher pitch when closer for an "urgent" feel.
      const freq = 600 + (1 - fraction) * 800   // 600..1400 Hz
      beep(freq, 60, ctx.currentTime)
    }
  }
}

// ── Periodic: resource low-warning alarms ────────────────────────────────────

let _o2AlarmTimer  = 0
let _batAlarmTimer = 0

/**
 * Beep-beep-beep alarms when oxygen or battery drop below 20 %. Distinct
 * pitches so the player can tell at a glance which resource is critical.
 */
export function updateLowResourceAlarms(state: GameState, dtMs: number): void {
  const ctx = getAudioContext()
  if (!ctx) return

  // Oxygen alarm — every 3 seconds when below 20 %. Higher pitch, urgent.
  if (state.oxygenPct < 0.2) {
    _o2AlarmTimer -= dtMs
    if (_o2AlarmTimer <= 0) {
      _o2AlarmTimer = 3000
      beep(1200, 80, ctx.currentTime)
      beep(1200, 80, ctx.currentTime + 0.12)
    }
  } else {
    _o2AlarmTimer = 0
  }

  // Battery alarm — every 5 seconds when below 20 %. Lower pitch.
  if (state.batteryPct < 0.2 && state.engineMode === 'ELEC') {
    _batAlarmTimer -= dtMs
    if (_batAlarmTimer <= 0) {
      _batAlarmTimer = 5000
      beep(400, 100, ctx.currentTime)
    }
  } else {
    _batAlarmTimer = 0
  }
}

// ── One-shot SFX ──────────────────────────────────────────────────────────────

/** "Cranking" rising sequence when the engine kicks on. */
export function playEngineStart(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  const t = ctx.currentTime
  beep( 80,  60, t)
  beep(140,  80, t + 0.08)
  beep(200, 100, t + 0.18)
}

/** "Wind-down" falling sequence when the engine shuts off. */
export function playEngineStop(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  const t = ctx.currentTime
  beep(200,  60, t)
  beep(140,  80, t + 0.08)
  beep( 80, 120, t + 0.18)
}

/** Diesel intake floods (auto-shutdown when diving below safe depth) —
 *  warbling 4-note alarm that's clearly different from regular engine stop. */
export function playDieselFlood(): void {
  playPattern([
    { freq: 880, dur: 100 },
    { freq: 440, dur: 100 },
    { freq: 880, dur: 100 },
    { freq: 220, dur: 200 },
  ])
}

/** Descending thud when the hull hits a mine. */
export function playMineHit(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  const t = ctx.currentTime
  for (let i = 0; i < 4; i++) {
    beep(150 - i * 30, 50, t + i * 0.04)
  }
}
