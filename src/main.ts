import { setupCanvas, curveDisplay, initInput } from 'zx-kit'
import { CANVAS_W, CANVAS_H, pickFittingScale } from './constants.ts'
import { createInitialState } from './state.ts'
import { tickGame } from './game.ts'
import { render } from './render.ts'
import { initSubAudio, updateEngineSound } from './audio.ts'

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = setupCanvas(canvas, pickFittingScale(), CANVAS_W, CANVAS_H)
curveDisplay(canvas, 0.7)

initInput()

// Browsers refuse to create an AudioContext outside a user-gesture handler.
// `initSubAudio` is idempotent, so wiring it to both the first keydown and
// the first click means it kicks in whichever input the player tries first.
window.addEventListener('keydown', initSubAudio, { once: true })
window.addEventListener('click',   initSubAudio, { once: true })

const state = createInitialState()

let last = performance.now()

function loop(now: number): void {
  const dt = Math.min(now - last, 100)
  last = now

  tickGame(state, dt)
  updateEngineSound(state)
  render(ctx, state)

  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)
