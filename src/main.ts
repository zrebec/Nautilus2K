import { setupCanvas, curveDisplay, initInput, isHeld } from 'zx-kit'
import { CANVAS_W, CANVAS_H } from './constants.ts'
import {
  createInitialState, MINES, SONAR_RANGE, dist,
} from './state.ts'
import { tickGame } from './game.ts'
import { render } from './render.ts'
import {
  initSubAudio,
  updateEngineSound, updateBallastSound,
  updateSonarPing, updateLowResourceAlarms,
} from './audio.ts'

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = setupCanvas(canvas, 4, CANVAS_W, CANVAS_H)
canvas.style.width = ''
canvas.style.height = ''
curveDisplay(canvas, 0.7)

initInput()

window.addEventListener('keydown', initSubAudio, { once: true })
window.addEventListener('click', initSubAudio, { once: true })

const state = createInitialState()

let last = performance.now()

function nearestMineRange(): number | null {
  let nearest = Infinity
  for (const mine of MINES) {
    if (mine.disarmed) continue
    const d = dist(state.x, state.y, mine.x, mine.y)
    if (d < nearest) nearest = d
  }
  return nearest <= SONAR_RANGE ? nearest : null
}

function loop(now: number): void {
  const dt = Math.min(now - last, 100)
  last = now

  tickGame(state, dt)

  // ── Audio updates (after game tick so they see fresh state) ────────
  updateEngineSound(state)
  updateBallastSound(
    isHeld('a') || isHeld('A'),
    isHeld('d') || isHeld('D'),
  )
  updateSonarPing(nearestMineRange(), dt, SONAR_RANGE)
  updateLowResourceAlarms(state, dt)

  render(ctx, state)

  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)
