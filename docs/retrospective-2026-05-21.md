# Retrospektíva — ZX-Nautilus / Nautilus2K
**Dátum:** 21. máj 2026  
**Fáza:** 3b dokončená → 3c na rade

---

## Kde sme teraz

Phase 3b je funkčná a živá na https://zrebec.github.io/Nautilus2K/.

Ponorka sa pohybuje, otáča, ponára, dobíja batériu na hladine, diesel auto-shutdown funguje s alarmom, periskop prepína medzi sky-mode a underwater-reticle, sonar pinguje podľa vzdialenosti, mínky majú hĺbku a collision vyžaduje 2D zhodu. Zvuk je bohatý — engine drone, ballast hiss, alarmy, SFX.

Čo **chýba** na hrateľnú hru:
- Žiadne odzbrojenie mín (`F` nad mínou — Phase 3c)
- Žiadna win podmienka (nájsť Gaia Stone)
- Žiadne lose podmienky (0 kyslíka, 0 životov, hull failure pri 100% dmg)
- Žiadna game-over / výhra obrazovka
- Gaia Stone existuje len ako label, nie objekt v svete

---

## Čo ideme robiť ďalej — Phase 3c

### Must-have (herná slučka)
1. **Disarming** — stlač `F` keď si nad mínou (2D radius + depth match). Míny si musia pamätať stav. Progress counter.
2. **Gaia Stone** — náhodné miesto v svete, pevná hĺbka, objaví sa ako špeciálny sonar kontakt keď si blízko.
3. **Win podmienka** — dostaneš sa na pozíciu Gaia Stone a si na správnej hĺbke → výhra.
4. **Lose podmienky:**
   - `oxygenPct === 0` → game over ("crew asphyxiated")
   - `lives === 0` → game over ("hull failure")
   - `damagePct >= 1.0` → immediate game over (hull breach)
5. **Game-over / win obrazovka** — ZX Spectrum štýl, animácia, press any key.

### Nice-to-have (polish)
- Hiscore table (localStorage)
- Random mine layout namiesto hand-placed
- Intro obrazovka (title screen)

---

## Čo by sme mohli technicky zlepšiť

### Fyzika a ovládanie

**Zotrvačnosť (inertia)**  
`SPEED_CLOSE_PER_SEC = 0.5` je exponenciálny approach — rýchlo na začiatku, pomalé finálne priblíženie. Cíti sa dobre, ale engine-off deceleration by mohlo byť pomalšie (reálna ponorka nezastaví za pár sekúnd). Zvážiť oddelený `DECEL_RATE` keď engine = OFF.

**Rudder self-centering**  
`RUDDER_RETURN_DEG_PER_SEC = 10` je relatívne rýchle. Pri vysokej rýchlosti to vyzerá artificially fast. Mohlo by byť proportional k rýchlosti (rýchlejšia ponorka = pomalší return, pretože water pressure drží kormidlo).

**Hĺbkové plane fyzika**  
Teraz: depth mení sa iba keď speed ≥ 0.5 a engine nie je OFF.  
Realita: aj keď engine vypneš, ponorka s momentom klesá/stúpa kým má speed.  
Refactor: oddeliť "má momentum" od "engine beží". Používať `state.speed` ako podmienku, nie `engineMode`.

**Kolízia s hranicou sveta**  
Teraz je toroidal wrap (prechádzaš cez okraj). Phase 3c možnosť: hard bounds s bump damage, ako keby si narazil do steny (hutný sediment, útesy). Dramatickejšie.

### Audio

**Engine drone glitch pri mode switchi**  
Keď prepneš DIESEL→ELEC, AY tón skočí okamžite. Malý fade-through (10–20 ms gain ramp) by to vyhladil.

**Sonar hĺbkový mod**  
Sonar ping mení frekvenciu podľa vzdialenosti, ale nie podľa hĺbky. Míny, kde je veľký depth mismatch, by mohli dávať iný tón — napr. chirp namiesto beep — aby hráč vedel "je tam, ale nie na tvojej hĺbke".

**Ballast hiss stereo**  
Blow (vzduch) mohol by znieť trochu inak ako flood (voda). Teraz je rozdiel iba vo frekvencii noise channelu (4 vs 12). Mohli by sme pridať moduláciu — blow: krátky burst, flood: dlhší pomalý hiss.

---

## Čo by sme mohli vybalancovať

### Tabuľka hodnôt na zváženie

| Konštanta | Aktuálna | Čo zmeniť | Prečo |
|-----------|----------|-----------|-------|
| `SPEED_CLOSE_PER_SEC` | 0.5 | 0.3 pri decel | Pomalšie brzdenie = realistickejšie |
| `RUDDER_RATE_DEG_PER_SEC` | 25 | 20 | Mierne pomalšie zatáčanie |
| `RUDDER_RETURN_DEG_PER_SEC` | 10 | 6 | Viac "feels like water drag" |
| `BALLAST_RATE_PER_SEC` | 0.08 | 0.06 | Pomalší trim = viac napätia |
| `DEPTH_RATE_PER_SEC` | 8 | 6 | Pomalší depth change = viac time |
| `O2_DRAIN_PER_SEC` | 1/600 | 1/480 | Trošku väčší urgency na kyslík |
| `BATTERY_CHARGE_PER_SEC` | 1/200 | 1/250 | Dobíjanie trvá dlhšie = viac tiempo na povrchu |
| `MINE_COLLISION_RADIUS` | 10 | 8 | Trošku benevolentnejšia hra |
| `MINE_COLLISION_DEPTH` | 5 | 8 | Hráč má trochu väčší margin na hĺbku |
| `PERISCOPE_RANGE` | 220 | 180 | Menšia viditeľnosť = väčšie napätie |

### Resource timing (ako dlho trvá čo)
- **Kyslík**: 10 minút hry → kritický < 20 % pri ~8 min → urob veci rýchlejšie
- **Batéria na ELEC full throttle**: ~3.5 min → OK, ale musíš sa vracať na hladinu
- **Dobíjanie**: ~3.3 min na full → trochu dlhšie by bolo lepšie

---

## Čo by sme mohli vizuálne zlepšiť

### Periscope prechod (najdôležitejšie)

**Problém:** Pri `depth >= 5m` okamžite skočí z sky-mode na underwater-mode. Je to jarring — obloha zmizne instant.

**Nápad — plynulý prechod:**
```
0m → 5m:   sky-mode s "water line" ktorá stúpa (horizontBar klesá hore → zakrýva sky)
5m → 10m:  transition — sky % klesá, blue % rastie
> 10m:     plný underwater mode
```

Implementácia: `renderPeriscopeSurface` by mohla akceptovať `waterFraction: number` (0..1) a podľa toho posunúť horizonY smerom k PERISCOPE_Y + 2. Sky by sa "zaplnilo" vodou shora nadol.

Prípadne animácia "vody cez šošovku" — blue wipe zľava doprava, trvá 0.5s reálneho času.

### Sonar zobrazenie hĺbky

Sonar teraz ukazuje 2D top-down pohľad. Míny vyzerajú rovnako bez ohľadu na hĺbku.  
Zlepšenie: **dimmer blip** pre míny, kde depth mismatch je veľký. Blip na 30m pri tvojich 90m by bol slabší/menší ako mína na 91m.

### Damage flash

Teraz: červený frame okolo okraja. Jednoduchý, ale mohol by byť expresívnejší.  
Nápady:
- Screen shake (offset vykreslenia o ±2px na niekoľko framov)
- Vignette effect (tmavé rohy)
- Blikajúci border (alternating red/black na 3 frame-och)

### Status line kontext

`MINE AHEAD 214M` je dobrý warning. Dalo by sa rozšíriť:
- Ak mine je na inej hĺbke: `MINE DEEP 214M` alebo `MINE SHALLOW 214M`
- Pomáha hráčovi vedieť, či sa má ponoriť alebo vynoriť pred zásahom

### Nočný mode / depth tinting

Čím hlbšie, tým tmavší periscope. Teraz je to rovnaký BLUE na všetkých hĺbkach. Mohli by sme interpolovať:
- 0–30m: `C.BLUE` (light)
- 30–80m: tmavší odtieň (ale Spectrum má iba 2 varianty blue)
- Obísť cez dithering — striedajúce sa BLUE / BLACK pixely v pozadí

---

## Čo by sme mohli pokryť v testoch

### Jednotkové testy (unit tests) — `game.ts` a `state.ts`

**Fyzika:**
- `rudderAngle` self-centres korektne za daný dt
- `heading` rotuje správnym smerom (kladný rudder = clockwise)
- `speed` konverguje k `throttle` s exponenciálnym krivkou
- `depth` sa nemení keď `speed < 0.5` alebo `engineMode === 'OFF'`
- `depth` je clampnutý na `0..999`
- Toroidal wrap: `x` a `y` wrap cez WORLD_W/WORLD_H

**Engine constraints:**
- DIESEL auto-shutdowns keď `depth > DIESEL_SAFE_DEPTH`
- Cycle `S` pod vodou skipuje DIESEL (OFF ↔ ELEC only)
- Cycle `S` na hladine ide OFF → DIESEL → ELEC → OFF

**Resources:**
- O2 klesá každý frame
- Batéria rastie na DIESEL, klesá na ELEC
- Batéria zostáva stabilná na OFF
- Drain je proportional k throttle na ELEC

**Kolízia:**
- `checkMineCollisions` deteguje zásah keď dist < radius A depth match
- Zásah mimo radius = žiadny damage
- Zásah s veľkým depth rozdielom = žiadny damage
- `disarmed` míny sa ignorujú

### Integračné testy

- Sekvencie input akcií (napr. dive sequence: ELEC on → throttle → D held → depth increases)
- Battery dead + ELEC = speed coasts to zero
- Mine collision → damageFlashMs set → decreases with each tick

### Render testy

Ťažšie testovať bez pixel-level diff, ale aspoň:
- `bearingTo` a `relativeBearing` vracajú správne hodnoty pre konkrétne pozície
- `nearbyMines` filtruje správne podľa range
- `renderPeriscope` sa nevyhodí (smoke test)

---

## Zhrnutie priorít

| Priorita | Čo | Dopad |
|----------|----|-------|
| 🔴 Must | Phase 3c gameplay (disarm, Gaia, win/lose) | Hra je hrateľná |
| 🟠 High | Periscope prechod animácia | Pohlcujúcejší zážitok |
| 🟡 Medium | Balance tweaky (ballast rate, O2 drain) | Plynulejšia krivka obtiažnosti |
| 🟡 Medium | Unit testy physics + engine constraints | Zabrání regresii pri 3c |
| 🟢 Low | Sonar depth dimming, status depth hints | Lepší UX |
| 🟢 Low | Engine mode audio fade | Hladší zvuk |

---

---

## Návrhy hráča / dizajnové rozhodnutia (2026-05-21)

Toto sú konkrétne smery, na ktorých sa zhodujeme ako priorita pred Phase 3c gameplay.

### 1. `config.ts` — centrálny súbor konštánt

Všetky herné konštanty (fyzika, drain rates, sonar ranges, audio parametre) presunúť do jedného `config.ts`. Dôvod: jednoduché dolaďovanie SIM stránky hry bez hľadania hodnôt naprieč `game.ts` a `state.ts`. Každá konštanta by mala komentár s "čo to ovplyvňuje a v akom smere".

### 2. Míny — náhodné, nie deterministické

Aktuálne je 10 hand-placed mín na pevných súradniciach — hráč si môže "naučiť" mapu. Zmena:
- **Náhodný počet** mín v range (napr. 15–30)
- **Náhodné pozície** v celom svete (1024×1024)
- **Náhodné hĺbky** — od plytkých po veľmi hlboké
- **Náhodné vzdialenosti od štartu** — najposlednejšia mína môže byť 10 km (tj. oveľa väčší svet alebo scale world units inak)
- Vždy generovať seed pri štarte hry (replay možnosť cez seed v budúcnosti)

### 3. Míny ako sprites — nie bodky

Teraz sú míny iba 2×2 červené bodky v periscope. To nestačí.

**Cieľ:** Skutočné sprite-y — "coronavírus" / spike mína — valec/sféra s ostňami dokola. Vedia byť krásne a detailné.

**Parametre:**
- Veľkosť: kľudne 16×16 alebo 24×24 — nie sme obmedzení na 8×8
- **Farebné typy** (náhodné pri generovaní):
  - Tmavé modré pozadie + **červená** mína (klassická)
  - Tmavé modré pozadie + **biela** mína (hlbšia?)
  - Tmavé modré pozadie + **žltá** mína (nebezpečnejšia?)
- Dodržať color clash pravidlo per 8×8 blok — presne 2 farby na blok
- Color clash pri pretínaní s periscope crosshair lines je **zámerný a krásny** — ZX Spectrum autentikum
- Mína v sonar: aj tam sprite namiesto bodky (zmenšená verzia)

### 4. Bohatší zvuk — AY + beeper kombinácia

Zlaté YouTube pravidlo: **zvuk je dôležitejší ako obraz**. Hráč to cíti, aj keď si to neuvedomuje. Apel na maximálne využitie toho, čo web audio dokáže v ZX Spectrum duchu.

**Čo chceme:**
- **Kombinácia AY čipu (3 kanály) + beeper** (raw oscillator) — používať oba súčasne
- Viac zvukových udalostí:
  - Sonar ping by mal mať **echo** — krátky reverb (delay node ~80ms, gain 0.3)
  - **Proximity warning** — čím bližšia mína, tým rýchlejší ping, plus subtílny bass drone narastá
  - **Ricochet** — keď sa mína "mihne" v periscope (vstúpi do FOV), krátky chirp
  - **Disarm jingle** — každá úspešne zneškodnená mína → krátky víťazný tón
  - **Descent tone** — hluký zvuk pri rýchlom ponáraní (tlak)
  - **Battery critical** — nie len periodický beep, ale narastajúca frekvencia (urgency)
  - **O2 critical** — podobne, ale inakší charakter (alarm vs. warning)
  - **Surface break** — zvuk keď vynorí periskop (voda odtečie)
- Engine drone: plynulý crossfade pri DIESEL↔ELEC prepnutí (10–20ms gain ramp)
- Ballast hiss: blow vs. flood by mali znieť inak (iný noise charakter + modulácia)

### 5. Screen shake pri náraze

Damage flash (červený okraj) zostáva, ale pridať **screen shake**:
- Offset celého vykreslenia o `±random(2–4)px` na 3–5 framov
- Shake intenzita úmerná damage veľkosti (míny robia 20% damage → plný shake)
- Implementácia: `state.shakeFrames: number` + `state.shakeIntensity: number`, render číta a aplikuje offset

### 6. Win podmienka — zmena konceptu (dôležité!)

**Gaia Stone je zlý nápad.** Konceptuálne nezmysel. Skutočná misia ponorky je:

> **Zneškodniť určitý počet mín** — to je cieľ tvojej ponorky, nie hľadanie kameňa.

Nový win flow:
- Pri generovaní sveta: náhodný **target count** (napr. 60–80% z celkového počtu mín)
- Status bar ukazuje: `DISARMED: 8/20` (počet/cieľ)
- Keď `minesDisarmed >= targetCount` → výhra
- Zostatok mín (20–40%) reprezentuje "nepreskúmaná oblasť" — realistické

Táto zmena odstráni Gaia Stone zo všetkého:
- `OBJ:GAIA` label v periscope → `TASK: CLEAR MINEFIELD` alebo `MINES: 8/20`
- Žiadny špeciálny objekt v svete na hľadanie

### 7. Poradie priorít (dohodnuté)

1. **config.ts** — extrakcia všetkých konštánt
2. **Mine sprites** — krásne spike míny v rôznych farbách
3. **Náhodné míny** — generátor namiesto hand-placed
4. **Zvuk** — bohatší, kombinácia AY + beeper, viac udalostí, engine crossfade
5. **Screen shake** — na damage
6. **Periscope prechod** — animovaný sky→underwater
7. **Win/lose kondície** — defuse target count, game-over/win screen

---

## Silné stránky projektu

- **zx-kit abstrakcia funguje** — Nautilus2K je dôkaz, že zx-kit je reusable a generický. Použitý cez `npm link` v local development.
- **Fyzika je surprizingly satisfying** — zotrvačnosť, rudder physics, depth-gating, diesel/elec model. Viac simulátor než arkáda.
- **Audio je bohaté** — 7 rôznych zvukových udalostí, AY emulacia na 3 kanáloch, sonar ping rate, low-resource alarmy.
- **CI/CD pipeline** — každý commit sa automaticky deployne na GitHub Pages.
- **State je čistý** — render je pure function zo state, tickGame mení iba state, žiadna implicitná state mimo `GameState`.

## Slabé stránky / dlh

- **Žiadne testy** — celá fyzika je untested. Raz keď pridáme Phase 3c podmienky, je šanca na regressiu.
- **Hand-placed míny** — 10 mín na pevných súradniciach. Hra je deterministická, hráč si môže "naučiť" mape.
- **Žiadna intro obrazovka** — hra začína priamo s dashboard-om. Chýba title screen / lore setup.
- **Gaia Stone je fiction** — label v periscope, ale žiadna game object. Hráč nemá cieľ.
- **No config file** — všetky konštanty sú v `state.ts` a `game.ts`. Mohlo by byť v `config.ts` pre jednoduchšie tweaking.
