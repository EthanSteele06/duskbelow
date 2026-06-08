
# Pre-Launch Pass 3 — Depth + Polish

## 1. Spec abilities (WoW-inspired, one per spec)

Today `CLASS_ABILITIES` gives 3 abilities per class; picking a spec only grants stat talents. I'll add **one signature ability per spec** (18 total) that slots in as a **4th combat button** once the player picks a spec.

- New `SPEC_ABILITIES: Record<SpecId, Ability>` in `data.ts`.
- `DungeonScreen` builds `abilities = [...CLASS_ABILITIES[classId], SPEC_ABILITIES[specId]]` when `specId` set.
- Grid switches from `grid-cols-3` → `grid-cols-2` (2×2) when a spec ability is present so the new button fits cleanly on mobile.

Spec ability picks (each uses the existing `AbilityEffect` types — no engine changes):

| Spec | Ability | Effect |
|---|---|---|
| Arms | Mortal Strike | 2.0× ATK + Bleed(4t,5), CD 3 |
| Fury | Bloodthirst | 1.6× ATK + 40% lifesteal, CD 2 |
| Protection | Last Stand | Shield 80% next hit + heal 25% maxHp, CD 5 (heal via stacked effects on the action) |
| Assassination | Rupture | 1.2× ATK + Bleed(6t,6), CD 3 |
| Outlaw | Adrenaline Rush | next attack ×2.5 (via `nextAttackMult` shim), CD 4 |
| Subtlety | Shadowstrike | 2.2× ATK, CD 3 |
| Frost | Ice Lance | 1.0× MAG + chill — 3.0× MAG vs already-chilled, CD 2 |
| Fire | Pyroblast | 2.2× MAG + Burn(4t,6), CD 4 |
| Arcane | Arcane Blast | 1.8× MAG, CD 1 |
| Discipline | Power Word: Shield | shield 60% next hit + heal small, CD 3 |
| Holy | Holy Word: Serenity | flat heal = 3× MAG, CD 3 |
| Shadow | Mind Blast | 1.7× MAG, CD 2 |
| Balance | Starsurge | 1.6× MAG + Burn(3t,5), CD 3 |
| Feral | Rake | 1.3× ATK + Bleed(4t,5), CD 2 |
| Restoration | Wild Growth | renew 5/t for 5t, CD 4 |
| Blood (DK) | Death Coil | 1.4× ATK + 50% lifesteal, CD 3 |
| Frost (DK) | Obliterate | 2.0× ATK, double damage if chilled, CD 3 |
| Unholy | Festering Strike | 1.4× ATK + Bleed(4t,4), CD 2 |

Where the effect doesn't map cleanly to an existing kind (Adrenaline Rush "next attack ×N", Last Stand combined shield+heal), I'll add a tiny extension to the `attack`/`shield` handlers in `DungeonScreen` so a single ability can also bump `nextAttackMult` or `heal()` — no new effect-kind unions needed.

## 2. Dungeon: 30 floors with boss cadence + art

- `MAX_DEPTH = 30` (replaces hard-coded `>= 10`). Victory triggers on floor 30 kill.
- Encounter pacing:
  - Floors 5, 15, 25 → **mini-boss** (forced combat with elite enemy).
  - Floors 10, 20, 30 → **major boss** (forced combat, guaranteed rare+ gear drop).
  - Other floors → existing random table, with shrine rarity cut (see §3).
- New enemies (`ENEMIES` entries with art):
  - Mini-bosses: **Bone Warden** (5), **Crimson Reaver** (15), **Frostbound Lich** (25)
  - Major bosses: keep **Black Dragon** as floor 10, add **Voidspawn Hierarch** (20), **The Sealed One** (30 — final boss)
- `enemyForDepth(depth, faction)` updated tier buckets:
  - 1–5: rat, skeleton, imp
  - 6–10: skeleton, cultist, wraith, imp, ghoul
  - 11–15: wraith, ogre, cultist, ghoul
  - 16–20: ogre, ghoul, cultist + faction foe
  - 21–25: wraith, ogre, cultist + faction foe
  - 26–30: ogre, ghoul, wraith + faction foe
  - Forced returns at boss floors.

### Background art per tier
Generate 6 dungeon backgrounds (one per 5-floor tier) — `DungeonScreen` selects via `Math.floor((depth-1)/5)`:
- 1–5: existing `corridor` (reuse, no regen)
- 6–10: catacomb crypt
- 11–15: blood-soaked barracks
- 16–20: cultist sanctum
- 21–25: frozen vault
- 26–30: voidscarred throne

All generated with `imagegen` (standard quality, pixel-gothic to match house style).

## 3. Shrines: rarer + art

- Rarity drop: shrines from ~12% → **~4%** of non-boss floors. Update `rollEncounter` thresholds.
- Generate **shrine art** (single image, runed altar with cool light) → swap the centered "✦ SHRINE ✦" label for a small overlay sprite over the corridor BG.

## 4. Traps: art + new branch

- Replace current "Rush through / Detour" with:
  - **Push through** — take damage (existing damage formula, no dodge skip).
  - **Turn back** — retreat 3 floors (`depth = max(1, depth - 3)`, `restoreBetweenRooms()` to refresh).
- Generate 2 trap art assets: **spike pit** and **gas vent**. Show as overlay sprite (same pattern as shrine).

## 5. Champion's Pass disables settings toggles

Interpretation: Champion-account players can't tinker with **gameplay-affecting** settings (Abandon Run, Hard Reset) — audio and the about section stay open. Rationale matches the existing "no free respec for non-champs" pattern but inverted: Champs already get reset perks elsewhere and shouldn't double-dip with a free wipe from the modal.

If you meant something else (lock the gear icon entirely, hide audio sliders, etc.) say so before I build.

- In `Settings.tsx`, when `player.isChampion`, the Account section shows a locked banner ("Champion accounts use the Trainer's free weekly respec instead") and hides the two destructive buttons.

## 6. Settings accessible in the dungeon

- Add `<SettingsButton />` to `DungeonScreen` header (top-right, next to the Depth chip). Reuses the existing modal — no new logic.

---

## Files touched

- `src/game/data.ts` — `SPEC_ABILITIES`, `MAX_DEPTH`, new enemies, `enemyForDepth` rebalance, `rollEncounter` rarity tuning.
- `src/game/DungeonScreen.tsx` — 4th ability slot, tier-based BG, boss-floor forcing, shrine/trap art overlays, trap branch rewrite, SettingsButton in header.
- `src/game/Settings.tsx` — champion lockout for Account section.
- `src/game/store.ts` — minor: surface depth cap from `MAX_DEPTH` if referenced (and bag/run logic stays as-is).
- New assets via `imagegen` (standard): 6 dungeon BGs (jpg), 5 new enemy portraits (jpg), 1 shrine sprite (png transparent), 2 trap sprites (png transparent).

## Out of scope (this pass)

- Cloud save (deferred earlier, still deferred).
- Re-balancing existing class abilities or talent stat values.
- Mini-boss-specific mechanics beyond stat scaling + guaranteed loot.
