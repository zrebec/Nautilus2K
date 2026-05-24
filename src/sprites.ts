/**
 * sprites.ts — bitmap sprites used by Nautilus2K.
 *
 * Each sprite is a `Uint8Array` (rows × bytesPerRow), wrapped in a `Bitmap`
 * via zx-kit's `createBitmap(data, width, height)`. Bit 7 of every byte is
 * the leftmost pixel — same convention as the ZX Spectrum ROM.
 *
 * MINE DESIGN
 * ───────────
 * The "spike mine" (a.k.a. naval contact mine, a.k.a. coronavirus) is a
 * central sphere with eight radial spikes — N, NE, E, SE, S, SW, W, NW.
 * Each spike triggers detonation on contact.
 *
 * Two sizes ship: a 16×16 hero sprite for the periscope and an 8×8 mini
 * for the sonar disc. Both share the same silhouette so a player learns
 * one shape and recognises it in both views.
 *
 * COLOUR CLASH
 * ────────────
 * Each bitmap renders with a single (ink, paper) pair — exactly the
 * ZX Spectrum attribute constraint. When a mine overlaps the periscope
 * crosshair lines, the crosshair pixels get wiped out by the mine's
 * BLUE paper (matching the sea background). The crosshair "breaks" at
 * the contact — period-correct and visually dramatic.
 */

import { createBitmap, type Bitmap } from 'zx-kit'

// ── 16×16 hero mine — periscope view ─────────────────────────────────────
//
// 32 bytes (2 per row × 16 rows). Bit 7 of byte 0 = leftmost pixel (column 0).
//
//          col: 0 1 2 3 4 5 6 7 8 9 A B C D E F
//        row 0: . . . . . . . # # . . . . . . .   N spike tip
//        row 1: . . . . . . . # # . . . . . . .   N spike
//        row 2: # . . . . . # # # # . . . . . #   NW + NE tip
//        row 3: . # . . . # # # # # # . . . # .
//        row 4: . . . . # # # # # # # # . . . .   sphere top
//        row 5: . . . # # # # # # # # # # . . .
//        row 6: . . # # # # # # # # # # # # . .
//        row 7: # # # # # # # # # # # # # # # #   W spike + body + E spike
//        row 8: # # # # # # # # # # # # # # # #
//        row 9: . . # # # # # # # # # # # # . .
//       row 10: . . . # # # # # # # # # # . . .   sphere bottom
//       row 11: . . . . # # # # # # # # . . . .
//       row 12: . # . . . # # # # # # . . . # .
//       row 13: # . . . . . # # # # . . . . . #   SW + SE tip
//       row 14: . . . . . . . # # . . . . . . .
//       row 15: . . . . . . . # # . . . . . . .   S spike tip
//
export const MINE_BITMAP_16: Bitmap = createBitmap(new Uint8Array([
  0x01, 0x80,   // row 0
  0x01, 0x80,   // row 1
  0x83, 0xC1,   // row 2
  0x47, 0xE2,   // row 3
  0x0F, 0xF0,   // row 4
  0x1F, 0xF8,   // row 5
  0x3F, 0xFC,   // row 6
  0xFF, 0xFF,   // row 7
  0xFF, 0xFF,   // row 8
  0x3F, 0xFC,   // row 9
  0x1F, 0xF8,   // row 10
  0x0F, 0xF0,   // row 11
  0x47, 0xE2,   // row 12
  0x83, 0xC1,   // row 13
  0x01, 0x80,   // row 14
  0x01, 0x80,   // row 15
]), 16, 16)

// ── 8×8 mini mine — sonar disc ────────────────────────────────────────────
//
// Same silhouette compressed to half resolution. 8 bytes.
//
//          col: 0 1 2 3 4 5 6 7
//        row 0: . . . # # . . .   N
//        row 1: # . . # # . . #   NW + NE
//        row 2: . # # # # # # .   sphere top
//        row 3: # # # # # # # #   W + body + E
//        row 4: # # # # # # # #
//        row 5: . # # # # # # .   sphere bottom
//        row 6: # . . # # . . #   SW + SE
//        row 7: . . . # # . . .   S
//
export const MINE_BITMAP_8: Bitmap = createBitmap(new Uint8Array([
  0x18,   // row 0  ...##...
  0x99,   // row 1  #..##..#
  0x7E,   // row 2  .######.
  0xFF,   // row 3  ########
  0xFF,   // row 4  ########
  0x7E,   // row 5  .######.
  0x99,   // row 6  #..##..#
  0x18,   // row 7  ...##...
]), 8, 8)
