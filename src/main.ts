import { setupCanvas, curveDisplay } from 'zx-kit'
import { CANVAS_W, CANVAS_H, pickFittingScale } from './constants.ts'
import { DEMO_STATE } from './state.ts'
import { render } from './render.ts'

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = setupCanvas(canvas, pickFittingScale(), CANVAS_W, CANVAS_H)
curveDisplay(canvas, 0.7)

// Fáza 2: hardcoded state. The render loop just keeps repainting it so the
// canvas stays alive (and so future state animation drops in without changes).
function loop(): void {
  render(ctx, DEMO_STATE)
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)
