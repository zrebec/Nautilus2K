import { setupCanvas, curveDisplay, initInput } from 'zx-kit'
import { CANVAS_W, CANVAS_H, pickFittingScale } from './constants.ts'
import { createInitialState } from './state.ts'
import { tickGame } from './game.ts'
import { render } from './render.ts'

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = setupCanvas(canvas, pickFittingScale(), CANVAS_W, CANVAS_H)
curveDisplay(canvas, 0.7)

initInput()

const state = createInitialState()

let last = performance.now()

function loop(now: number): void {
  const dt = Math.min(now - last, 100)  // cap dt at 100ms to survive tab-switch lag
  last = now

  tickGame(state, dt)
  render(ctx, state)

  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)
