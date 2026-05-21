/**
 * config.ts — Nautilus2K central tuning panel
 *
 * Every gameplay, physics, audio, and visual constant lives here.
 * Each entry documents:
 *   - What it controls
 *   - How significant a change is (LOW / MEDIUM / HIGH / CRITICAL)
 *   - What lowering / raising the value does in practice
 *
 * Workflow: change a value, save, the Vite dev server hot-reloads instantly.
 * No need to hunt across game.ts / state.ts / audio.ts.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// LOCALISATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Active language code. Picked up by lang.ts via zx-kit's `pickLocale`.
 *
 * - `null` / `'en'` / unknown code → loads default `strings.ts` (English)
 * - `'sk'` → loads `strings.sk.ts` (Slovak)
 *
 * Case-insensitive: `'SK'` works the same as `'sk'`.
 *
 * To add a new translation: create `strings.<code>.ts`, register it
 * in `lang.ts`, then set this code to test. HMR swaps the text live —
 * useful for checking whether translations fit the fixed 256×192 layout.
 */
export const LANGUAGE_CODE: string | null = null

// ═══════════════════════════════════════════════════════════════════════════════
// WORLD GEOMETRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * World width in abstract units. The submarine wraps toroidally at the edges.
 * Significance: CRITICAL for sense of scale and mine density.
 *
 * Lower (512):  Cramped ocean, mines feel very close, fast-paced tension.
 * Higher (2048): Vast empty ocean, long transit times, lonelier feel.
 *                Sonar and periscope ranges need to be bumped proportionally.
 */
export const WORLD_W = 1024

/**
 * World height in abstract units. Same wrap behaviour as WORLD_W.
 * Significance: CRITICAL — see WORLD_W.
 *
 * Lower / higher: same effects as WORLD_W, but in the north-south axis.
 * Keeping WORLD_W === WORLD_H gives a square ocean (easier navigation).
 */
export const WORLD_H = 1024

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMARINE PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum speed the submarine can reach at full throttle, in knots.
 * 1 knot = 1 world-unit per second at the current scale.
 * Significance: HIGH — caps how fast the player can cross the world.
 *
 * Lower (8):  Slower, more methodical feel — each dive approach takes longer.
 *             Fuel and oxygen become more critical (more time spent).
 * Higher (18): Fast and arcade-y. Mines appear and pass quickly — less time
 *              to react on sonar. Engine audio pitch range also shifts (louder, higher).
 */
export const MAX_SPEED = 12

/**
 * Rate at which actual speed approaches the throttle target (fraction/sec, exponential).
 * Significance: HIGH — this IS the "feel" of engine inertia.
 *
 * Lower (0.2):  Very sluggish acceleration and deceleration. Heavy, realistic feel.
 *               Sub takes many seconds to reach full speed. Feels like 3000 tonnes of steel.
 * Higher (0.9): Nearly instant response. Arcade-like. Kills immersion in a sim.
 * Recommendation: 0.3–0.5 for diesel sim feel.
 */
export const SPEED_CLOSE_PER_SEC = 0.5

/**
 * Rate at which speed bleeds off when engine is OFF (separate from SPEED_CLOSE_PER_SEC).
 * Significance: MEDIUM — affects how long the sub "coasts" after engine shutdown.
 *
 * Lower (0.1): Very long coast — realistic momentum for a massive vessel.
 *              Sub takes 10+ seconds to fully stop. Adds urgency to "oh no I'm heading into a mine".
 * Higher (0.8): Quick stop after engine off — feels light, not submarine-like.
 * Note: currently not implemented separately (same rate as acceleration). Future tuning point.
 */
export const SPEED_DECEL_PER_SEC = 0.2

/**
 * Throttle change rate while ↑/↓ is held, in knots per second.
 * Significance: MEDIUM — how quickly the player can dial in their speed.
 *
 * Lower (2):  Fine control — player can precisely set 6 knots vs 7 knots.
 *             Good for experienced players who want exact trim.
 * Higher (8): Coarse control — speed jumps from 0 to full in 1.5 seconds.
 *             Easier to play, less simulation feel.
 */
export const THROTTLE_RATE_PER_SEC = 4

// ═══════════════════════════════════════════════════════════════════════════════
// RUDDER & TURNING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * How fast the rudder swings when ←/→ is held, in degrees per second.
 * Significance: MEDIUM — affects how fast the player can set rudder angle.
 *
 * Lower (15): Slow to get to full rudder. Feels like fighting hydraulics. Realistic.
 * Higher (45): Snap to full rudder almost instantly. Too arcade-y.
 */
export const RUDDER_RATE_DEG_PER_SEC = 25

/**
 * How fast the rudder returns to centre when no key is held, in degrees per second.
 * Significance: MEDIUM — this affects the "drift" after you release the key.
 *
 * Lower (4):  Rudder stays deflected for a long time after release.
 *             Sub continues turning in an arc — realistic, but hard to control.
 * Higher (20): Rudder snaps back almost instantly. Clean, arcade response.
 * Note: Real subs have auto-centre at ~10°/sec. Current 10 is borderline fast.
 */
export const RUDDER_RETURN_DEG_PER_SEC = 10

/**
 * Maximum rudder deflection in degrees. Real submarines are typically ±30–35°.
 * Significance: LOW — only changes the hard limit of the rudder strip visual.
 *
 * Lower (20): Less effective turns at full rudder. Wider turning radius.
 * Higher (45): Tighter minimum turn radius. Feels very manoeuvrable.
 */
export const MAX_RUDDER_ANGLE = 35

/**
 * Turning multiplier: heading delta per second = rudderAngle × speed × this.
 * Significance: HIGH — the single most important "how tight can I turn" value.
 *
 * Lower (0.02): Wide sweeping turns. Takes a long time to reverse course.
 *               Good for a large ocean patrol. Heading change is subtle.
 * Higher (0.10): Tight responsive turns even at low speed. More playable, less realistic.
 * Current (0.05): At full speed (12 kn) and full rudder (35°): 21°/sec turn rate → ~17 sec full circle.
 */
export const TURN_PER_KNOT_PER_DEG = 0.05

// ═══════════════════════════════════════════════════════════════════════════════
// BALLAST & DEPTH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ballast fill/drain rate while A or D is held, as fraction of total per second.
 * Significance: HIGH — directly controls how fast the sub dives or ascends.
 *
 * Lower (0.04): Very slow trim changes. Realistic submarine ballast procedure.
 *               Player must plan 20–30 seconds ahead before a depth change.
 *               O2 drain during long dives becomes a real problem.
 * Higher (0.15): Near-instant ballast flip. Sub dives like a shark. Fast-paced.
 * Current (0.08): Full flood/blow cycle = ~12 seconds. Reasonable for gameplay.
 */
export const BALLAST_RATE_PER_SEC = 0.08

/**
 * Maximum depth change rate in metres per second at full speed and full buoyancy.
 * Significance: HIGH — how quickly depth responds to ballast at speed.
 *
 * Lower (4):  Sub sinks and rises slowly even at full speed. More time at each depth.
 *             Increases tension when a mine is below you and closing.
 * Higher (12): Rapid depth changes. Sub feels more like an elevator, less like a vessel.
 * Current (8): At max speed, full buoyancy → 8 m/s descent. ~10 seconds to reach 80m.
 */
export const DEPTH_RATE_PER_SEC = 8

/**
 * Minimum speed (knots) required for the dive planes to have any effect on depth.
 * Significance: MEDIUM — enforces the "you need forward motion to dive" rule.
 *
 * Lower (0.2): Depth changes even at near-zero speed. Less sim-accurate.
 * Higher (2.0): Player must reach significant speed before any depth change happens.
 *               Very realistic — and very frustrating for new players.
 * Current (0.5): 1 knot is enough to start diving slowly. Good balance.
 */
export const MIN_SPEED_FOR_DEPTH = 0.5

/**
 * Maximum depth the submarine can reach, in metres.
 * Significance: LOW for gameplay, HIGH for future crush-depth mechanic.
 *
 * Lower (300): Shallower ocean — all mines would need to be above 300m.
 * Higher (1000+): Deep ocean exploration. Future: crush-depth damage above X metres.
 */
export const MAX_DEPTH_M = 999

/**
 * Depth threshold below which diesel intake floods and the engine auto-shuts down.
 * The real-world reason: diesel needs air intake and exhaust above water.
 * Significance: HIGH — gate between the two engine modes.
 *
 * Lower (2): Sub must be very nearly surfaced to run diesel. Tight window.
 * Higher (10): More forgiving — diesel stays on through wave action. Less realistic.
 * Current (5): ~periscope depth. Realistic for snorkel-equipped submarines.
 */
export const DIESEL_SAFE_DEPTH = 5

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCES — OXYGEN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Oxygen drain rate, as fraction of total per second (crew breathes constantly).
 * Significance: HIGH — sets the "clock" the player is racing against.
 *
 * Lower (1/900): 15-minute sessions. Relaxed exploration. Long patrols possible.
 * Higher (1/300): 5-minute sessions. Every dive is urgent. Hardcore survival feel.
 * Current (1/600): ~10 minutes from full to empty. Comfortable for learning the controls.
 *
 * Audio effect: when oxygenPct < 0.2, the O2 alarm fires every O2_ALARM_INTERVAL_MS.
 * The player FEELS this constant drain through audio long before visual indicators panic.
 */
export const O2_DRAIN_PER_SEC = 1 / 600

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCES — BATTERY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base battery drain rate on ELEC mode, regardless of throttle (hotel load).
 * Significance: MEDIUM — the floor cost of running electrical systems.
 *
 * Lower (1/1800): Tiny idle drain. Battery mostly lost to throttle load.
 * Higher (1/600):  Significant even at zero throttle. Idling underwater is costly.
 * Current (1/900): ~15 min idle drain from full to empty on ELEC (pure base, no throttle).
 */
export const BATTERY_BASE_DRAIN_PER_SEC = 1 / 900

/**
 * Additional battery drain per unit of throttle fraction on ELEC, per second.
 * Total drain = BASE + throttleFraction × THROTTLE_DRAIN.
 * Significance: HIGH — full throttle costs much more than half throttle.
 *
 * Lower (1/480): Full throttle adds only a small extra drain. Speed is "cheap".
 * Higher (1/120): Full throttle drains battery aggressively. Player must choose:
 *                 fast approach vs. battery life. Core tactical decision.
 * Current (1/240): Full throttle depletes battery in ~8 minutes total (base + throttle).
 */
export const BATTERY_THROTTLE_DRAIN_PER_SEC = 1 / 240

/**
 * Battery charge rate while DIESEL is running on the surface, fraction per second.
 * Significance: HIGH — determines how long the player must surface between dives.
 *
 * Lower (1/400): Long surface time needed to recharge. Surfacing feels like a chore.
 * Higher (1/120): Quick recharge. Player barely needs to stay on the surface.
 *                 Kills the tension of "I need to surface but there's a storm".
 * Current (1/200): ~3.3 min to fully charge from empty. Balanced surface window.
 */
export const BATTERY_CHARGE_PER_SEC = 1 / 200

// ═══════════════════════════════════════════════════════════════════════════════
// COLLISION & DAMAGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 2D horizontal collision radius with mines, in world units.
 * Significance: HIGH — the "hitbox" of every mine in the horizontal plane.
 *
 * Lower (6):  Very precise — only the exact mine position triggers collision.
 *             Skill-demanding but can feel unfair ("I was right next to it!").
 * Higher (15): Generous hitbox. Mines feel "large". Safer for new players,
 *              but the sim loses precision feel.
 * Current (10): Roughly equivalent to a real contact mine's lethal radius. Fair.
 */
export const MINE_COLLISION_RADIUS = 10

/**
 * Maximum depth difference (in metres) for a mine collision to register.
 * The sub must be within ±this many metres of the mine's depth.
 * Significance: HIGH — the whole depth-management gameplay depends on this.
 *
 * Lower (3):  Very precise depth matching required. Sailing 4m above a mine is safe.
 *             Increases skill ceiling dramatically.
 * Higher (10): Generous depth tolerance. Less precise depth control needed.
 *              Reduces the importance of ballast management.
 * Current (5): Tight enough to matter. Player must be within 5m of mine depth to hit.
 */
export const MINE_COLLISION_DEPTH = 5

/**
 * Hull damage fraction inflicted per mine collision (added to damagePct).
 * Significance: HIGH — with 0.2 per hit, 5 hits = total hull failure.
 *
 * Lower (0.1): 10 hits before hull failure. Forgiving, more "lives"-like.
 * Higher (0.5): 2 hits to critical damage. Very punishing.
 * Note: lives system (Phase 3c) may replace this with "lives lost per hit" instead.
 */
export const MINE_HIT_DAMAGE = 0.2

/**
 * Duration of the red damage flash border effect after a mine hit, in milliseconds.
 * Significance: LOW for gameplay, MEDIUM for player feedback.
 *
 * Lower (200): Brief flicker. Player might miss the feedback entirely.
 * Higher (1200): Long alarm state. Very noticeable — possibly annoying after 3rd hit.
 * Current (600): ~0.6 seconds. Clear without being obnoxious.
 */
export const DAMAGE_FLASH_DURATION_MS = 600

/**
 * Number of visual segments in the ballast tank bars (AIR and WATER columns).
 * Significance: LOW — visual granularity of the ballast readout.
 *
 * Lower (4): Coarser bar — each segment = 25 % of the tank. Less precision.
 * Higher (16): Very fine bar. More "analog gauge" feel. May be visually noisy.
 * Current (8): Each segment = 12.5 %. Fine enough to see small ballast changes.
 */
export const BALLAST_BAR_SEGMENTS = 8

/**
 * Number of visual segments in the OXY / BAT / DMG resource bars.
 * Significance: LOW — visual granularity of the three status bars.
 *
 * Lower (2): Crude on/off indicator — either "full" or "half" or "empty".
 * Higher (8): Fine readout. Player can see 12 % battery remaining.
 *             Note: with 3 colour thresholds, segment count should be ≥ 3.
 * Current (4): Each segment = 25 %. Simple, fast to read at a glance.
 */
export const RESOURCE_BAR_SEGMENTS = 4

/**
 * Screen shake intensity in pixels, applied randomly ±this value on mine hit.
 * Significance: MEDIUM — tactile feedback for collision.
 *
 * Lower (1): Subtle wobble. Almost imperceptible at low monitor resolution.
 * Higher (6): Violent shake. Very dramatic but can be nauseating over time.
 * Current (3): Noticeable but not disorienting.
 * Note: shake is not yet implemented — this pre-populates it for Phase 3c.
 */
export const DAMAGE_SHAKE_PX = 3

/**
 * Number of frames the screen shake lasts after a mine hit.
 * Significance: LOW — duration of shake effect.
 *
 * Lower (2): Very brief shake. Blink-and-you-miss-it.
 * Higher (8): Lingering shake. Feels like ongoing structural damage.
 */
export const DAMAGE_SHAKE_FRAMES = 4

// ═══════════════════════════════════════════════════════════════════════════════
// SONAR DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum range in world units at which the sonar detects mine contacts.
 * Also controls the sonar map display and ping audio trigger distance.
 * Significance: CRITICAL — determines how much warning the player gets.
 *
 * Lower (80):  Short range. Mines appear with very little warning. High tension.
 *              Sonar map shows a small area. Faster ping rate at shorter distances.
 * Higher (250): Long range. Lots of advance warning. Easier to navigate around mines.
 *               Sonar map feels "wider".
 * Audio: sonar ping interval scales from SONAR_PING_FAR_MS (max range) to
 *        SONAR_PING_NEAR_MS (closest contact). Adjusting SONAR_RANGE shifts
 *        the entire audio-distance curve.
 */
export const SONAR_RANGE = 160

// ═══════════════════════════════════════════════════════════════════════════════
// PERISCOPE VIEW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Half-angle of the periscope forward viewing cone, in degrees.
 * Mines further off the nose than this angle are outside the FOV.
 * Significance: MEDIUM — how wide the periscope's visual sweep is.
 *
 * Lower (30°): Narrow tunnel vision. Only mines almost dead ahead are visible.
 *              Very realistic (early periscopes were quite narrow). High skill needed.
 * Higher (70°): Wide sweep. Mines to the sides are visible. Easier navigation.
 * Current (50°): ~100° total arc. Reasonable for a modern periscope. Balanced.
 */
export const PERISCOPE_FOV_DEG = 50

/**
 * Maximum range at which mines appear in the periscope view, in world units.
 * Significance: MEDIUM — controls how far ahead the player can "see" through periscope.
 *
 * Lower (120): Short-range view only. Mines loom up suddenly. Tense.
 * Higher (300): Long-range view. Player sees mines coming from far away.
 *               The periscope blip starts tiny and grows — very visual.
 * Current (220): ~1.4× sonar range. Makes sense — periscope is more focused.
 */
export const PERISCOPE_RANGE = 220

/**
 * Maximum depth difference (in metres) visible on the periscope Y-axis.
 * A mine at exactly this depth difference appears at the very top/bottom of the view.
 * Significance: MEDIUM — controls vertical resolution of the periscope display.
 *
 * Lower (60):  Tight vertical window. Mines slightly above/below vanish quickly.
 *              Player must match depth very precisely to see anything.
 * Higher (150): Wide vertical view. Player can see mines far above and below them.
 *               Easier depth navigation.
 * Current (100): 200m total vertical window. Mine at 80m and sub at 20m = near top of view.
 */
export const PERISCOPE_DEPTH_RANGE = 100

/**
 * Depth threshold below which the periscope switches from sky-view to underwater reticle.
 * Significance: MEDIUM — the transition point. Should match DIESEL_SAFE_DEPTH approximately.
 *
 * Lower (2):  Sky view disappears almost at the surface. Transition is very abrupt.
 * Higher (8): Sub must go deeper before the view switches. Sky visible longer.
 * Note: Future — animate this transition (water line rising across the view).
 */
export const PERISCOPE_SURFACE_THRESHOLD_M = 5

/**
 * Relative bearing (in degrees) within which a mine triggers the "MINE AHEAD" status warning.
 * Significance: MEDIUM — warning sensitivity. How "ahead" the mine needs to be.
 *
 * Lower (10°): Only mines almost perfectly dead ahead trigger the warning. Precise.
 * Higher (35°): Mines to the side also trigger it. Warning fires more often.
 * Current (20°): 40° total arc — centre third of periscope FOV.
 */
export const MINE_AHEAD_BEARING_DEG = 20

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO — ENGINE DRONE (AY chip, channels A + C)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Diesel engine tone frequency at idle (minimum speed), in Hz. Channel A.
 * Significance: HIGH — sets the "character" of the diesel sound at low RPM.
 *
 * Lower (25 Hz): Very deep rumble, almost sub-bass. Cinematic but hard to hear.
 * Higher (60 Hz): Higher idle pitch. Less "diesel", more generic hum.
 * Current (40 Hz): Classic diesel idle frequency. Felt in the chest.
 */
export const DIESEL_FREQ_MIN_HZ = 40

/**
 * Diesel engine tone frequency at full throttle, in Hz. Channel A.
 * Significance: HIGH — the "full power" character of the diesel.
 *
 * Lower (80 Hz):  Small frequency range → drone doesn't change much with speed.
 * Higher (160 Hz): Wide range → very obvious speed feedback. Almost musical.
 * Current (110 Hz): At full throttle: 40 + 70 = 110 Hz. Authentic diesel range.
 */
export const DIESEL_FREQ_MAX_HZ = 110

/**
 * Diesel sub-octave channel C volume offset below channel A.
 * Significance: MEDIUM — thickness of the diesel texture.
 *
 * Lower (1): Sub-octave almost as loud as the main channel. Very "fat" sound.
 * Higher (5): Sub-octave is quiet background rumble, barely audible.
 * Current (3): Adds body without overwhelming channel A.
 */
export const DIESEL_SUBOCTAVE_VOL_OFFSET = 3

/**
 * Electric motor minimum frequency at low speed, in Hz. Channel A only.
 * Significance: HIGH — character of the ELEC motor at low throttle.
 *
 * Lower (50 Hz): Low, rumbly whine. Sounds closer to diesel.
 * Higher (120 Hz): Higher idle pitch. Clearly "electric" / different from diesel.
 * Current (80 Hz): Clean rising tone, clearly different from diesel. Good contrast.
 */
export const ELEC_FREQ_MIN_HZ = 80

/**
 * Electric motor maximum frequency at full throttle, in Hz. Channel A only.
 * Significance: HIGH — the "screaming at full speed" electric pitch.
 *
 * Lower (160 Hz): Narrow range, not much audio feedback from throttle changes.
 * Higher (400 Hz): Wide range. Very obvious speed-dependent pitch shift.
 *                  Might sound too high-pitched / aggressive at full speed.
 * Current (220 Hz): 80 → 220 Hz sweep across 0–MAX_SPEED. Clear and distinctive.
 */
export const ELEC_FREQ_MAX_HZ = 220

/**
 * Minimum volume (AY volume units, 0–15) for the engine drone at low speed.
 * Significance: LOW — floor of the volume envelope.
 *
 * Lower (1): Very quiet at low throttle. Sub sounds nearly silent when slow.
 * Higher (6): Loud at idle. Engine always present in the mix.
 */
export const ENGINE_VOL_MIN = 3

/**
 * Maximum volume (AY volume units, 0–15) for the engine drone at full speed.
 * Significance: MEDIUM — ceiling of the volume envelope.
 *
 * Lower (6):  Never gets very loud. Subtle engine presence.
 * Higher (15): Maxes out AY chip. Full throttle is very loud.
 * Current (8): Leaves headroom for SFX to cut through. Balanced mix.
 */
export const ENGINE_VOL_MAX = 8

/**
 * Noise period for ballast blow (A key = air out). Lower = higher pitched hiss.
 * AY noise period: lower value = higher frequency noise.
 * Significance: MEDIUM — character of the air-blowing sound.
 *
 * Lower (2): Very high, tight hiss. Sounds like high-pressure air escaping.
 * Higher (8): Darker, breathier hiss. More "gentle" air release.
 * Current (4): Tight hiss, clearly "air" rather than "water".
 */
export const BALLAST_BLOW_NOISE_PERIOD = 4

/**
 * Noise period for ballast flood (D key = water in). Lower = higher pitched.
 * Significance: MEDIUM — character of the flooding sound.
 *
 * Lower (6):  Higher-pitched flood. Less clearly "water", more hiss.
 * Higher (20): Dark, low rumble. Very "water" — like a pipe filling.
 * Current (12): Mid-range dark hiss. Clearly different from blow (4 vs 12).
 */
export const BALLAST_FLOOD_NOISE_PERIOD = 12

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO — SONAR PING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sonar ping interval when the nearest contact is at maximum sonar range, in ms.
 * This is the SLOWEST ping rate — far contacts ping rarely.
 * Significance: HIGH — sets the "relaxed" end of the sonar audio tension curve.
 *
 * Lower (1500): Even far contacts ping relatively often. High base tension level.
 * Higher (4000): Far contacts are almost silent — long gaps between pings.
 *                Much more dramatic contrast when a contact gets close.
 * Current (2500): Roughly one ping every 2.5 seconds at max range. Calm, searching.
 */
export const SONAR_PING_FAR_MS = 2500

/**
 * Sonar ping interval at point-blank range (contact very close), in ms.
 * This is the FASTEST ping rate — close contacts hammer at the player.
 * Significance: HIGH — the most urgent audio cue in the game.
 *
 * Lower (100): Extremely rapid fire at close range. Borderline alarm.
 *              Creates near-panic for the player. Very effective for tension.
 * Higher (600): Slower even at close range. Less urgency. Closer = not that scary.
 * Current (300): ~3 pings/second at point-blank. Clearly urgent without being irritating.
 */
export const SONAR_PING_NEAR_MS = 300

/**
 * Sonar ping frequency (tone pitch) when nearest contact is at maximum range, in Hz.
 * This is the LOW pitch — far contacts have a lower, calmer ping.
 * Significance: MEDIUM — the "searching" sonar character.
 *
 * Lower (400 Hz): Lower, deeper ping. Classic movie sonar. Very calming.
 * Higher (800 Hz): Higher idle ping. More clinical, less atmospheric.
 * Current (600 Hz): Mid-range. Clear above engine noise without being sharp.
 */
export const SONAR_PING_FAR_FREQ_HZ = 600

/**
 * Sonar ping frequency when nearest contact is at very close range, in Hz.
 * This is the HIGH pitch — close contacts have an urgent, higher ping.
 * Significance: MEDIUM — pitch contrast between "far" and "close" creates urgency.
 *
 * Lower (800 Hz):  Small contrast with FAR pitch. Less obvious danger cue.
 * Higher (2000 Hz): Very sharp, alarming ping. Cannot be ignored.
 * Current (1400 Hz): 600→1400 Hz sweep from far to close. Clear urgency gradient.
 */
export const SONAR_PING_NEAR_FREQ_HZ = 1400

/**
 * Sonar ping duration (beep length) in milliseconds.
 * Significance: LOW — controls the "sharpness" of each ping.
 *
 * Lower (30 ms): Very short, sharp click. Dry, modern sonar feel.
 * Higher (120 ms): Longer, more resonant ping. Classic film sonar.
 * Current (60 ms): Balanced — distinct but not overly musical.
 */
export const SONAR_PING_DURATION_MS = 60

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO — LOW-RESOURCE ALARMS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Oxygen percentage below which the O2 low alarm starts firing.
 * Significance: HIGH — when does the player start hearing the "you're dying" alarm.
 *
 * Lower (0.10): Alarm only fires when critically low. Less warning time.
 * Higher (0.30): Alarm fires early. Player has 3+ minutes of warning. Less panic.
 * Current (0.20): 20% O2 = ~2 minutes remaining. Enough time to act, but urgent.
 */
export const O2_ALARM_THRESHOLD = 0.20

/**
 * Battery percentage below which the battery alarm starts (only on ELEC mode).
 * Significance: HIGH — when does the player hear "surface soon".
 *
 * Lower (0.10): Very late warning. Only 1 minute of battery left when alarm fires.
 * Higher (0.30): Early warning. Lots of time to react but alarm is annoying early.
 * Current (0.20): ~3 minutes of ELEC battery left when alarm triggers. Balanced.
 */
export const BATTERY_ALARM_THRESHOLD = 0.20

/**
 * O2 alarm interval — how often the oxygen alarm beeps, in milliseconds.
 * Significance: MEDIUM — pacing of the urgency. Too fast = annoying. Too slow = ignored.
 *
 * Lower (1500 ms): Alarm fires very often. Relentless pressure on the player.
 * Higher (5000 ms): Infrequent alarm. Player might not notice between pings.
 * Current (3000 ms): Every 3 seconds. Persistent but not overwhelming.
 *
 * Audio: two beeps at O2_ALARM_FREQ_HZ with 120ms gap between them.
 */
export const O2_ALARM_INTERVAL_MS = 3000

/**
 * Battery alarm interval — how often the battery alarm beeps, in milliseconds.
 * Significance: MEDIUM — should feel different from O2 alarm (different rhythm).
 *
 * Lower (2000 ms): Faster battery alarm. Very urgent feeling.
 * Higher (8000 ms): Slow, occasional warning. Almost ignorable.
 * Current (5000 ms): Less frequent than O2. Player can distinguish the two alarms.
 */
export const BATTERY_ALARM_INTERVAL_MS = 5000

/**
 * O2 alarm tone frequency, in Hz. Should be high and urgent.
 * Significance: MEDIUM — character of the "you're suffocating" sound.
 *
 * Lower (800 Hz): Lower urgency. Could be confused with other game sounds.
 * Higher (1600 Hz): Very sharp, piercing. Impossible to ignore.
 * Current (1200 Hz): High, clearly alarm-like. Distinct from battery alarm (400 Hz).
 */
export const O2_ALARM_FREQ_HZ = 1200

/**
 * Battery alarm tone frequency, in Hz. Should be lower and more "mechanical" than O2.
 * Significance: MEDIUM — character of the "surface to recharge" warning.
 *
 * Lower (200 Hz): Very deep, hard to hear at low volume. Bass-y warning thud.
 * Higher (600 Hz): Higher pitch. Could blur into sonar territory.
 * Current (400 Hz): Low mechanical tone. Clearly different from O2 alarm (1200 Hz).
 */
export const BATTERY_ALARM_FREQ_HZ = 400

/**
 * Duration of each alarm beep, in milliseconds.
 * Significance: LOW — length of each individual beep tone.
 *
 * Lower (40 ms): Short click. Fast and percussive.
 * Higher (150 ms): Long beep. More insistent. Classic alarm feel.
 * Current (80–100 ms): Clear tone, not overly musical.
 */
export const ALARM_BEEP_DURATION_MS = 80

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO — ONE-SHOT SFX
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Engine start jingle — rising three-note sequence frequencies, in Hz.
 * Significance: LOW — the "crank" sound when S is pressed to start the engine.
 *
 * Raising all values: higher-pitched, more "electric" cranking.
 * Lowering all values: deeper, more diesel-like startup sequence.
 * Timing: 0ms, 80ms, 180ms offsets.
 */
export const ENGINE_START_NOTES_HZ = [80, 140, 200] as const

/**
 * Engine stop jingle — falling three-note sequence frequencies, in Hz.
 * Significance: LOW — the "wind-down" when engine is switched off.
 *
 * Same as ENGINE_START_NOTES_HZ but played in reverse order.
 */
export const ENGINE_STOP_NOTES_HZ = [200, 140, 80] as const

/**
 * Diesel flood warning — 4-note warble sequence [freq, dur] when diesel auto-shuts.
 * Significance: MEDIUM — this alerts the player that they've gone too deep for diesel.
 *   Should be clearly distinct from engine start/stop.
 *
 * Current: 880→440→880→220 Hz. The alternating pattern = alarm/warning character.
 * Raising base frequencies: more urgent, shriller alarm.
 * Lowering: calmer, less alarming. Might be missed during intense navigation.
 */
export const DIESEL_FLOOD_PATTERN = [
  { freq: 880, dur: 100 },
  { freq: 440, dur: 100 },
  { freq: 880, dur: 100 },
  { freq: 220, dur: 200 },
] as const

/**
 * Mine hit SFX — descending thud: starting frequency, step down per note, count, spacing.
 * Significance: HIGH — the most important SFX in the game. Player MUST notice this.
 *
 * MINE_HIT_START_HZ + (MINE_HIT_STEP_HZ × i) = frequency of note i.
 * Higher MINE_HIT_START_HZ: starts higher, more "crack" than "thud".
 * Larger MINE_HIT_STEP_HZ: wider descending sweep. More dramatic.
 * More MINE_HIT_NOTES: longer rumble. Feels more like structural damage.
 */
export const MINE_HIT_START_HZ  = 150
export const MINE_HIT_STEP_HZ   = 30
export const MINE_HIT_NOTES     = 4
export const MINE_HIT_SPACING_S = 0.04
export const MINE_HIT_DUR_MS    = 50

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL — DASHBOARD COLOURS
// ═══════════════════════════════════════════════════════════════════════════════
// These reference the ZX Spectrum palette (from zx-kit's C object).
// Valid values: C.BLACK, C.BLUE, C.RED, C.MAGENTA, C.GREEN, C.CYAN, C.YELLOW, C.WHITE
//               C.B_BLACK … C.B_WHITE  (BRIGHT variants)
// Only 2 colours per 8×8 attribute cell — INK and PAPER.
// Changing a colour here changes it everywhere it appears in the dashboard.

import { C } from 'zx-kit'

/**
 * Sonar widget — foreground colour for the mine contact blips.
 * Also used for the sub crosshair in the sonar display.
 * Significance: MEDIUM — should contrast sharply with SONAR_PAPER.
 *
 * C.B_RED:  Classic radar red-on-green. High contrast. Aggressive feel.
 * C.B_YELLOW: Softer. Feels more "old equipment".
 * C.B_WHITE: Clean, clinical. Very readable.
 */
export const SONAR_CONTACT_COLOR = C.B_RED

/**
 * Sonar widget — grid dot and crosshair colour.
 * Significance: LOW — the subtle grid behind the blips.
 *
 * C.GREEN:   Classic phosphor green. Very authentic radar look.
 * C.B_GREEN: Brighter. More readable but less vintage.
 */
export const SONAR_GRID_COLOR = C.GREEN

/**
 * Sonar widget — background paper colour.
 * Significance: LOW — the "screen" of the sonar.
 *
 * C.BLACK: Deep black background. Maximum contrast. Most readable.
 * C.BLUE:  Slight blue tint. Slightly more "underwater" feel.
 */
export const SONAR_PAPER = C.BLACK

/**
 * Ballast bars — filled segment colour for both AIR and WATER bars.
 * Significance: MEDIUM — visual state of the ballast system.
 *
 * C.B_CYAN: Cold, clear — matches "water/air" theme. Current choice.
 * C.B_GREEN: More "system nominal" feel.
 */
export const BALLAST_COLOR = C.B_CYAN

/**
 * Ballast bars — unfilled (empty) segment paper colour.
 * Significance: LOW — background of empty bar slots.
 *
 * C.BLUE:  Dark blue. Contrasts well with B_CYAN filled segments.
 * C.BLACK: Neutral background.
 */
export const BALLAST_PAPER = C.BLUE

/**
 * Motor dial — needle colour. High contrast against the dark background.
 * Significance: MEDIUM — the RPM needle is the primary speed feedback.
 *
 * C.B_RED:    High urgency, classical gauge needle colour.
 * C.B_GREEN:  Calmer, "system normal" feel.
 * C.B_YELLOW: Caution-like. Could signal "speed = risk".
 */
export const MOTOR_NEEDLE_COLOR = C.B_RED

/**
 * Motor dial — rim and tick colour.
 * Significance: LOW — the dial surround and scale marks.
 */
export const MOTOR_RIM_COLOR = C.WHITE

/**
 * Rudder strip — neutral marker colour (the centre tick mark).
 * Significance: LOW.
 */
export const RUDDER_NEUTRAL_COLOR = C.WHITE

/**
 * Rudder strip — moving marker colour (current rudder position).
 * Significance: MEDIUM — must be immediately visible and distinct from neutral.
 *
 * C.B_YELLOW: Bright, visible. Current choice.
 * C.B_RED:    More urgent feel.
 * C.B_GREEN:  Calmer, "trim" feel.
 */
export const RUDDER_MARKER_COLOR = C.B_YELLOW

/**
 * Status bars (OXY / BAT / DMG) — three-colour gradient.
 * Applied from index 0 (lowest values = danger) to index 2 (full = safe).
 * Significance: HIGH — primary resource status feedback.
 *
 * [0] = danger colour (1 segment): C.B_RED  — critical, act now
 * [1] = warning colour (2 segments): C.B_YELLOW — low, plan ahead
 * [2] = safe colour (3-4 segments): C.B_GREEN — all good
 */
export const RESOURCE_COLORS = [C.B_RED, C.B_YELLOW, C.B_GREEN] as const

/**
 * Damage bar colour — always red regardless of amount.
 * Significance: MEDIUM — DMG only ever goes up, never has a "safe" colour.
 *
 * C.B_RED: Standard damage. Always danger.
 * C.B_MAGENTA: More "hull breach" industrial feel.
 */
export const DAMAGE_COLOR = C.B_RED

/**
 * Engine mode label colours per mode. Shown top-right on the status line.
 * Significance: HIGH — the player's primary engine state indicator.
 * Should be immediately readable at a glance. Don't use similar colours.
 *
 * OFF:    C.B_RED    — engine off is a warning state (no propulsion)
 * DIESEL: C.B_YELLOW — charging, surface mode
 * ELEC:   C.B_GREEN  — running normally underwater
 */
export const ENGINE_MODE_COLORS = {
  OFF:    C.B_RED,
  DIESEL: C.B_YELLOW,
  ELEC:   C.B_GREEN,
} as const

/**
 * Periscope frame and crosshair colour.
 * Significance: LOW — the outer border of the periscope view.
 *
 * C.CYAN: Standard ZX border. Cool, maritime feel.
 * C.B_GREEN: More "night vision" feel.
 */
export const PERISCOPE_FRAME_COLOR = C.CYAN

/**
 * Periscope crosshair colour (underwater reticle).
 * Significance: MEDIUM — the targeting lines the player uses for bearing.
 *
 * C.B_GREEN: Phosphor green. Classic submarine periscope.
 * C.B_WHITE: Bright, easy to see but less atmospheric.
 */
export const PERISCOPE_CROSSHAIR_COLOR = C.B_GREEN

/**
 * Periscope mine contact blip colour (underwater view).
 * Significance: HIGH — mines must be immediately visible in the periscope.
 *
 * C.B_RED:    Maximum danger signal. Hard to miss.
 * C.B_YELLOW: Slightly softer. "Contact" rather than "immediate danger".
 */
export const PERISCOPE_MINE_COLOR = C.B_RED

/**
 * Periscope sky colour (surface view, upper half).
 * Significance: LOW — visual atmosphere only.
 *
 * C.B_CYAN: Bright daylight sky. Clear and cheerful.
 * C.CYAN:   Slightly dimmer. Overcast or twilight feel.
 */
export const PERISCOPE_SKY_COLOR = C.B_CYAN

/**
 * Periscope sea colour (surface view, lower half; also underwater background).
 * Significance: MEDIUM — the ocean background colour.
 *
 * C.BLUE:   Deep ocean blue. Standard maritime. Good contrast with crosshair.
 * C.B_BLUE: Brighter blue. Shallower feel.
 */
export const PERISCOPE_SEA_COLOR = C.BLUE

/**
 * Bottom ticker separator line colour (1-pixel horizontal line above the ticker).
 * Significance: LOW — purely decorative divider.
 */
export const TICKER_SEPARATOR_COLOR = C.CYAN

/**
 * Compass direction labels colour.
 * Significance: LOW.
 */
export const COMPASS_COLOR = C.WHITE

/**
 * Currently highlighted compass direction (the one closest to current heading).
 * Significance: MEDIUM — must stand out from surrounding compass labels.
 *
 * C.B_YELLOW: Classic heading highlight. Warm and visible.
 * C.B_WHITE:  Clean, technical feel.
 */
export const COMPASS_HIGHLIGHT_COLOR = C.B_YELLOW

/**
 * Section labels row — colour of each section header above the dashboard widgets.
 * Significance: LOW — purely decorative labels. Changing them doesn't affect gameplay.
 *
 * Current scheme: each section has a distinct colour for fast visual grouping:
 *   SONAR   → green  (classic radar colour)
 *   BALLAST → cyan   (water/air theme)
 *   MOTOR   → red    (mechanical / power)
 *   STATUS  → yellow (caution / info)
 */
export const SECT_SONAR_COLOR   = C.B_GREEN
export const SECT_BALLAST_COLOR = C.B_CYAN
export const SECT_MOTOR_COLOR   = C.B_RED
export const SECT_STATUS_COLOR  = C.B_YELLOW

/**
 * Periscope corner HUD label ink colour (OBJ:, CONTACTS:, BRG:, MAG:).
 * Significance: LOW — informational overlays on the periscope view.
 *
 * C.B_WHITE: Maximum readability against the blue ocean background.
 * C.B_GREEN: "Night vision" feel — less stark but more atmospheric.
 */
export const PERISCOPE_LABEL_INK = C.B_WHITE

/**
 * Periscope corner HUD label paper colour.
 * Must contrast with both the sky (B_CYAN) and the ocean (BLUE).
 * Significance: LOW.
 *
 * C.BLUE: Works against both halves of the periscope view. Current choice.
 * C.BLACK: Very dark background for labels — maximum contrast but less atmospheric.
 */
export const PERISCOPE_LABEL_PAPER = C.BLUE

/**
 * Depth readout colour (D:XXM in the status widget, bottom of dashboard).
 * Significance: LOW — informational readout. Should be distinct from speed readout.
 *
 * C.B_CYAN: "Water / depth" association.
 * C.B_WHITE: Neutral, readable.
 */
export const DEPTH_READOUT_COLOR = C.B_CYAN

/**
 * Speed readout colour (V:XXKN in the status widget).
 * Significance: LOW — informational readout. Should differ from depth readout.
 *
 * C.B_GREEN: "Engine / propulsion" association. Same colour as sonar grid.
 * C.B_WHITE: Neutral.
 */
export const SPEED_READOUT_COLOR = C.B_GREEN

/**
 * Maximum RPM value shown on the motor dial (the top of the gauge scale).
 * The dial needle tracks current speed: needle = (speed / MAX_SPEED) × RPM_DIAL_MAX.
 * Significance: LOW — purely cosmetic display scale, doesn't affect physics.
 *
 * Lower (1500): Needle swings into the "red zone" earlier. More dramatic at lower speeds.
 * Higher (5000): Needle stays in the lower half of the dial — looks "under-revved".
 * Current (3000): At MAX_SPEED=12, display reads 3000 RPM. Reasonable for a sub motor.
 */
export const RPM_DIAL_MAX = 3000

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO — MASTER & JINGLE TIMING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Master volume passed to initAudio(), range 0.0–1.0.
 * Significance: HIGH — overall loudness of the entire audio system.
 *
 * Lower (0.3): Quiet game. Good for background playing or headphone users.
 * Higher (0.8): Loud and immersive. AY chip SFX can get harsh at high volume.
 * Current (0.5): Balanced default. All SFX layers audible without clipping.
 */
export const MASTER_VOLUME = 0.5

/**
 * Engine start / stop jingle — note durations in milliseconds [note1, note2, note3].
 * Significance: LOW — character of the startup / shutdown jingle.
 *
 * Shorter durations: staccato, mechanical "clunk clunk clunk".
 * Longer durations: smoother, more musical startup sequence.
 * Current start  [60, 80, 100]: accelerating feel — each note slightly longer.
 * Current stop   [60, 80, 120]: decelerating feel — last note longest (wind-down).
 */
export const ENGINE_START_DURATIONS_MS = [60, 80, 100] as const
export const ENGINE_STOP_DURATIONS_MS  = [60, 80, 120] as const

/**
 * Gap between notes in the engine start/stop jingle, in seconds.
 * Significance: LOW — pacing of the jingle.
 *
 * Lower (0.06): Rapid-fire notes. More "click click click".
 * Higher (0.20): Slow deliberate notes. More "cranking" feel.
 * Current (0.10): ~100ms between each note. Clear but snappy.
 */
export const ENGINE_JINGLE_NOTE_SPACING_S = 0.10

/**
 * Gap between the two beeps of the O2 double-alarm, in seconds.
 * The O2 alarm fires two beeps in quick succession to distinguish it from the
 * single-beep battery alarm.
 * Significance: LOW — the rhythm that makes O2 alarm recognisable.
 *
 * Lower (0.06): Very fast double-tap. Almost sounds like one long beep.
 * Higher (0.25): Wide gap. More "beep ... beep". Easily distinguishable.
 * Current (0.12): Quick double-beep. Clear double-pulse pattern.
 */
export const O2_ALARM_DOUBLE_BEEP_GAP_S = 0.12
