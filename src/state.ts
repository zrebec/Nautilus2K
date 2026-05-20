/**
 * Whole submarine state, single source of truth. In Fáza 2 this is a hardcoded
 * snapshot; in Fáza 3 the game loop mutates it every frame.
 */
export interface SubmarineState {
  /** Current depth in metres. */
  depth: number
  /** Speed in knots. */
  speed: number
  /** Heading in degrees `0..360` (0 = N). */
  heading: number
  /** External hull pressure in atmospheres. */
  pressure: number
  /** Ballast tank fill level `0..1` — air tank (fraction full of compressed air). */
  ballastAirPct: number
  /** Ballast tank fill level `0..1` — water tank (fraction flooded). */
  ballastWaterPct: number
  /** Motor RPM `0..3000`. */
  motorRPM: number
  /** Oxygen remaining `0..1`. */
  oxygenPct: number
  /** Battery charge `0..1`. */
  batteryPct: number
  /** Hull damage taken `0..1` (1 = destroyed). */
  damagePct: number
  /** Active propulsion source. */
  power: 'DIESEL' | 'ELEC' | 'NUKE'
  /** Mines marked / disarmed so far. */
  minesFound: number
  /** Mission counter — how many of the total mines have been processed. */
  mineCounter: { current: number; total: number }
  /** Remaining lives. */
  lives: number
  /** Distance to nearest detected mine ahead, in metres. `0` = none ahead. */
  mineAheadM: number
  /** Detected blip positions on the sonar grid (in sonar-local coords). */
  sonarHits: ReadonlyArray<{ x: number; y: number }>
}

/**
 * Hardcoded snapshot used to drive the Fáza 2 layout. All values are chosen
 * so every widget visibly does something — not extremes, not zero, not max.
 */
export const DEMO_STATE: SubmarineState = {
  depth: 112,
  speed: 8,
  heading: 0,                          // N
  pressure: 5,
  ballastAirPct: 0.34,
  ballastWaterPct: 0.66,
  motorRPM: 1500,
  oxygenPct: 0.81,
  batteryPct: 0.75,
  damagePct: 0.15,
  power: 'ELEC',
  minesFound: 3,
  mineCounter: { current: 2, total: 10 },
  lives: 3,
  mineAheadM: 50,
  sonarHits: [
    { x: 12, y:  8 },
    { x: 28, y: 18 },
    { x: 44, y: 30 },
  ],
}
