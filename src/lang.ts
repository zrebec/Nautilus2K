/**
 * lang.ts — locale switcher for Nautilus2K.
 *
 * Reads `LANGUAGE_CODE` from config.ts and exports `L` — the active
 * string pack. All visible-text consumers (render.ts and friends) import
 * `L` from here and read `L.STR_DEPTH(...)`, `L.ENGINE_LABELS.OFF` etc.
 *
 * To add a new translation:
 *   1. Copy strings.ts → strings.<code>.ts and translate every value.
 *   2. Add the import + the entry to the `locales` map below.
 *   3. Set LANGUAGE_CODE in config.ts to the new code to test.
 *
 * The default (English) lives in strings.ts and doesn't need an entry
 * in `locales` — any unknown / null / 'en' code falls back to it.
 */

import { pickLocale } from 'zx-kit'
import { LANGUAGE_CODE } from './config.ts'
import * as en from './strings.ts'
import * as sk from './strings.sk.ts'

// Cast widens the locale string literal types so 'CIEL:GAIA' in sk is
// compatible with the 'OBJ:GAIA' literal that TypeScript infers for en.
// Trade-off: no compile-time check that sk has every key — missing
// translations show up visually as undefined text.
export const L = pickLocale(en, { sk: sk as unknown as typeof en }, LANGUAGE_CODE)
