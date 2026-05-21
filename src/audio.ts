import { initAudio, createAY, beep, getAudioContext, type AYChip } from 'zx-kit'
import { type GameState, MAX_SPEED } from './state.ts'

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
  initAudio(0.4)
  ay = createAY()
  // Channel A is reserved for the engine drone — start silent until S is pressed.
  ay.tone('A', 60, 0)
}

export function isAudioInitialized(): boolean {
  return initialized
}

/**
 * Drives the continuous engine drone on AY channel A. Pitch and volume both
 * scale with current speed (not throttle — gives the engine an "audible spool-up
 * to target" character that matches the visual RPM dial's smooth chase).
 *
 * Engine off, or sub coasting near zero speed → silence the channel.
 */
export function updateEngineSound(state: GameState): void {
  if (!ay) return
  if (!state.engineOn || state.speed < 0.1) {
    ay.tone('A', 0)
    return
  }
  const fraction = state.speed / MAX_SPEED      // 0..1
  const freq = 60 + fraction * 120              // 60 Hz idle → 180 Hz wide-open
  const vol = Math.round(3 + fraction * 5)      // 3..8
  ay.tone('A', freq, vol)
}

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

/** Descending thud when the hull hits a mine. */
export function playMineHit(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  const t = ctx.currentTime
  for (let i = 0; i < 4; i++) {
    beep(150 - i * 30, 50, t + i * 0.04)
  }
}
