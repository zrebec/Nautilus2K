import {
  initAudio, createAY, beep, playPattern, getAudioContext,
  type AYChip,
} from 'zx-kit'
import { type GameState } from './state.ts'
import {
  MAX_SPEED,
  DIESEL_FREQ_MIN_HZ, DIESEL_FREQ_MAX_HZ, DIESEL_SUBOCTAVE_VOL_OFFSET,
  ELEC_FREQ_MIN_HZ, ELEC_FREQ_MAX_HZ, ENGINE_VOL_MIN, ENGINE_VOL_MAX,
  BALLAST_BLOW_NOISE_PERIOD, BALLAST_FLOOD_NOISE_PERIOD,
  SONAR_PING_FAR_MS, SONAR_PING_NEAR_MS,
  SONAR_PING_FAR_FREQ_HZ, SONAR_PING_NEAR_FREQ_HZ, SONAR_PING_DURATION_MS,
  O2_ALARM_THRESHOLD, BATTERY_ALARM_THRESHOLD,
  O2_ALARM_INTERVAL_MS, BATTERY_ALARM_INTERVAL_MS,
  O2_ALARM_FREQ_HZ, BATTERY_ALARM_FREQ_HZ, ALARM_BEEP_DURATION_MS,
  ENGINE_START_NOTES_HZ, ENGINE_STOP_NOTES_HZ, DIESEL_FLOOD_PATTERN,
  MINE_HIT_START_HZ, MINE_HIT_STEP_HZ, MINE_HIT_NOTES,
  MINE_HIT_SPACING_S, MINE_HIT_DUR_MS,
  MASTER_VOLUME,
  ENGINE_START_DURATIONS_MS, ENGINE_STOP_DURATIONS_MS, ENGINE_JINGLE_NOTE_SPACING_S,
  O2_ALARM_DOUBLE_BEEP_GAP_S,
} from './config.ts'

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
  initAudio(MASTER_VOLUME)
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
    const baseFreq = DIESEL_FREQ_MIN_HZ + fraction * (DIESEL_FREQ_MAX_HZ - DIESEL_FREQ_MIN_HZ)
    const vol = Math.round(ENGINE_VOL_MIN + fraction * (ENGINE_VOL_MAX - ENGINE_VOL_MIN))
    ay.tone('A', baseFreq, vol)
    ay.tone('C', baseFreq / 2, Math.max(2, vol - DIESEL_SUBOCTAVE_VOL_OFFSET))
  } else {
    const freq = ELEC_FREQ_MIN_HZ + fraction * (ELEC_FREQ_MAX_HZ - ELEC_FREQ_MIN_HZ)
    const vol = Math.round(ENGINE_VOL_MIN + fraction * (ENGINE_VOL_MAX - ENGINE_VOL_MIN))
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
    ay.enableNoise('B', blowing ? BALLAST_BLOW_NOISE_PERIOD : BALLAST_FLOOD_NOISE_PERIOD)
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
  const fraction = Math.max(0, Math.min(1, nearestRangeM / sonarRange))
  const interval = SONAR_PING_NEAR_MS + fraction * (SONAR_PING_FAR_MS - SONAR_PING_NEAR_MS)
  _sonarPingTimer -= dtMs
  if (_sonarPingTimer <= 0) {
    _sonarPingTimer = interval
    const ctx = getAudioContext()
    if (ctx) {
      const freq = SONAR_PING_FAR_FREQ_HZ + (1 - fraction) * (SONAR_PING_NEAR_FREQ_HZ - SONAR_PING_FAR_FREQ_HZ)
      beep(freq, SONAR_PING_DURATION_MS, ctx.currentTime)
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

  if (state.oxygenPct < O2_ALARM_THRESHOLD) {
    _o2AlarmTimer -= dtMs
    if (_o2AlarmTimer <= 0) {
      _o2AlarmTimer = O2_ALARM_INTERVAL_MS
      beep(O2_ALARM_FREQ_HZ, ALARM_BEEP_DURATION_MS, ctx.currentTime)
      beep(O2_ALARM_FREQ_HZ, ALARM_BEEP_DURATION_MS, ctx.currentTime + O2_ALARM_DOUBLE_BEEP_GAP_S)
    }
  } else {
    _o2AlarmTimer = 0
  }

  if (state.batteryPct < BATTERY_ALARM_THRESHOLD && state.engineMode === 'ELEC') {
    _batAlarmTimer -= dtMs
    if (_batAlarmTimer <= 0) {
      _batAlarmTimer = BATTERY_ALARM_INTERVAL_MS
      beep(BATTERY_ALARM_FREQ_HZ, ALARM_BEEP_DURATION_MS, ctx.currentTime)
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
  ENGINE_START_NOTES_HZ.forEach((freq, i) =>
    beep(freq, ENGINE_START_DURATIONS_MS[i], t + i * ENGINE_JINGLE_NOTE_SPACING_S))
}

/** "Wind-down" falling sequence when the engine shuts off. */
export function playEngineStop(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  const t = ctx.currentTime
  ENGINE_STOP_NOTES_HZ.forEach((freq, i) =>
    beep(freq, ENGINE_STOP_DURATIONS_MS[i], t + i * ENGINE_JINGLE_NOTE_SPACING_S))
}

/** Diesel intake floods (auto-shutdown when diving below safe depth). */
export function playDieselFlood(): void {
  playPattern([...DIESEL_FLOOD_PATTERN])
}

/** Descending thud when the hull hits a mine. */
export function playMineHit(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  const t = ctx.currentTime
  for (let i = 0; i < MINE_HIT_NOTES; i++) {
    beep(MINE_HIT_START_HZ - i * MINE_HIT_STEP_HZ, MINE_HIT_DUR_MS, t + i * MINE_HIT_SPACING_S)
  }
}
