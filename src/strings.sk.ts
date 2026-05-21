/**
 * strings.sk.ts — slovenský preklad Nautilus2K.
 *
 * Musí presne kopírovať tvar strings.ts (anglickej zdrojovej verzie).
 * Pri pridaní nového reťazca do strings.ts pridaj sem aj jeho preklad —
 * TypeScript ti to vynúti cez `pickLocale`'s generic constraint.
 *
 * AKTIVÁCIA
 * ─────────
 * Nastav `LANGUAGE_CODE = 'sk'` v config.ts a HMR okamžite prepne hru.
 *
 * PIXEL BUDGET — VEĽMI DÔLEŽITÉ
 * ──────────────────────────────
 * Hra beží v pevnom rozlíšení 256×192 px, 8×8 px font.
 * Každý reťazec má rozpočet pixelov v komentári vyššie (v strings.ts).
 * Ak prekročíš budget, text bude prekrývať susedné widgety alebo vyletí
 * mimo plátna. HMR ti ukáže problém okamžite po uložení.
 *
 * Časté problémy pri preklade do slovenčiny:
 * - Slovenské slová bývajú dlhšie ako anglické (BALLAST → BALAST je OK,
 *   ale ENGINE OFF → MOTOR VYPNUTÝ je 13 znakov a vyletí mimo plátna)
 * - Diakritika je súčasťou ROM fontu zx-kit — písmená Á É Í Ó Ú Ý Č Š Ž
 *   sú v ASCII rozsahu rendrovateľné len ak font ich obsahuje. Bezpečné
 *   je používať len ASCII verzie (A E I O U Y C S Z).
 */

// ── Engine mode labels (status line, pravý horný roh) ─────────────────────
// Budget: ≤ 10 znakov.
export const ENGINE_LABELS: Record<'OFF' | 'DIESEL' | 'ELEC', string> = {
  OFF:    'MOTOR OFF',   //  9 znakov
  DIESEL: 'POH:DIESEL',  // 10 znakov — limit
  ELEC:   'POH:ELEK',    //  8 znakov
}

// ── Varovanie pred mínou (status line, ľavá strana) ──────────────────────
// 'MINA VPREDU 220M' = 16 znakov. OK vedľa 10-znakového engine labelu.
export const STR_MINE_AHEAD = (distM: number) => `MINA VPREDU ${distM}M`

// ── Periscope — HUD popisky v rohoch ──────────────────────────────────────
export const STR_OBJECTIVE = 'CIEL:GAIA'        // 9 znakov

export const STR_CONTACTS  = (n: number) => `KONTAKTY:${n}`  // až 10 znakov

export const STR_BRG_NONE = 'AZM:---'           // 7 znakov
export const STR_BRG      = (deg: string) => `AZM:${deg}`

export const STR_MAG      = 'ZOOM:2X'           // 7 znakov

// ── Dashboard — popisky sekcií ────────────────────────────────────────────
// Pozícia každého labelu je pevná — text pod ním sa neposúva. Skontroluj
// vizuálne v HMR či sa labely neprekrývajú.
export const STR_SECT_SONAR   = 'SONAR'    // 5 znakov, budget ≤ 7
export const STR_SECT_BALLAST = 'BALAST'   // 6 znakov, budget ≤ 8 (SK kratšie)
export const STR_SECT_MOTOR   = 'MOTOR'    // 5 znakov, budget ≤ 9
export const STR_SECT_STATUS  = 'STAV'     // 4 znaky,  budget ≤ 7

// ── Sonar widget ──────────────────────────────────────────────────────────
// 'D:160M' = 6 znakov. ('D' ako "dosah")
export const STR_SONAR_RANGE = (rangeM: number) => `D:${rangeM}M`

// ── Balastník — popisky tankov a percent ──────────────────────────────────
// Hard limit 3 znaky — bar pod nimi má pevnú šírku 32 px.
export const STR_BALLAST_AIR   = 'VZD'    // 3 znaky (vzduch)
export const STR_BALLAST_WATER = 'VOD'    // 3 znaky (voda)

export const STR_PCT = (pct: number) => `${pct}%`

// ── Status bary — popisky zdrojov ─────────────────────────────────────────
// Hard limit 3 znaky.
export const STR_OXY = 'KYS'    // 3 znaky (kyslík)
export const STR_BAT = 'BAT'    // 3 znaky (batéria)
export const STR_DMG = 'POS'    // 3 znaky (poškodenie)

// ── Status widget — živé readouty ─────────────────────────────────────────
// 'H:999M'  a 'R:12UZ' — H ako hĺbka, R ako rýchlosť, UZ ako uzly.
export const STR_DEPTH = (m: number)  => `H:${m}M`
export const STR_SPEED = (kn: number) => `R:${kn}UZ`

// ── Kompas ────────────────────────────────────────────────────────────────
// Kardinálne smery — N/S/E/W sú medzinárodne zrozumiteľné. Slovenský
// preklad (SEVER/JUH/VYCHOD/ZAPAD) by sa nezmestil — kompas má pevnú šírku.
// drawCompassText() v zx-kit má svoje vlastné labely, takže toto sa
// reálne nepoužije na rendering — len na výpočet šírky.
export const COMPASS_DIRS = ['S', 'SV', 'V', 'JV', 'J', 'JZ', 'Z', 'SZ'] as const

// ── Spodný ticker — počítadlo mín a životov ───────────────────────────────
// 'M:10/20 Z:3' = 11 znakov. ('Z' ako "životy")
export const STR_MINES = (found: number, total: number) => `M:${found}/${total}`
export const STR_LIVES = (lives: number) => `Z:${lives}`
