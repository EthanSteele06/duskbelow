
# Polish Pass: animations, art, classes, unlocks, hub cleanup

## 1. Combat animations
In `DungeonScreen.tsx`, drive short CSS animations off the last ability used:
- **Melee** (warrior/rogue + class `attack` w/o `useMag`): a `swing` keyframe — quick translateX + 12° rotate on a transparent slash glyph layered over the enemy portrait.
- **Spell** (mage/priest + `useMag`): a `cast` keyframe — scale-in + radial glow pulse tinted by the class color, plus a slight screen-flash via an overlay div.
- Enemy hit reaction already exists (`hit` shake). Add a quick `recoil` (translateX -6px → 0) on the enemy portrait when damage lands.
- Implementation: `useState<{kind:"melee"|"spell"; key:number}>` set inside `applyAttack`; conditionally render a slash/cast overlay `<div>` keyed by `key` so each cast retriggers the animation. Keyframes added to `src/styles.css`.

## 2. Priest art → female "Sister"
Regenerate `src/assets/class-priest.jpg` and `src/assets/trainer-priest.jpg` with a clearly female cleric matching the existing dark-gothic pixel-portrait style. Tagline kept; flavor lines unchanged.

## 3. Starting unlocks + how to unlock the rest
Update `meta.ts`:
- `emptyMeta().unlockedClasses` → `["warrior", "rogue"]`.
- `ACCOUNT_UNLOCKS`: drop the lvl-2 rogue entry, keep mage at lvl 4 (rename to "Class — Mage"), keep priest at lvl 6. Wanderer XP from runs already feeds this — no new mechanic needed.
- TitleScreen already shows 🔒 + "next: …" so unlock path is visible.

## 4. New classes (paywall): Druid & Death Knight
- Extend `ClassId` with `"druid" | "deathknight"`.
- Add `ClassDef` entries (HP/ATK/MAG balanced: druid 30/5/8 hybrid healer-caster; DK 38/8/4 self-sustain bruiser).
- Add `CLASS_ABILITIES`:
  - **Druid**: Wrath (1.0× MAG), Moonfire (1.2× MAG + burn 3t), Rejuvenation (HoT).
  - **Death Knight**: Death Strike (1.3× ATK + self-heal 25% of dmg dealt — needs a new `lifesteal` sub-effect OR reuse `attack` with a `lifesteal` field), Frost Strike (1.0× ATK + chill), Blood Boil (1.5× ATK AoE-flavored single-target + bleed).
  - Lifesteal: add optional `lifesteal: number` to the `attack` effect; honored inside `applyAttack` in DungeonScreen.
- Generate two new portrait assets + two trainer assets (pixel-gothic style, on-theme).
- Add `TRAINERS` + intro/quest entries; class-specific quest for each.
- Cosmetic-shop entitlement: extend `MetaState` with `ownedClasses: ClassId[]` (default `[]`). A class is playable if `unlocked.has(id) || meta.ownedClasses.includes(id)`.
- Paywall UI: in `ShopScreen.tsx` ("Cobalt Vault"), add a "Heroes" section listing Druid + DK with a gem price (e.g. 300◆) and a **"Test unlock (dev)"** button that calls `unlockClass(id)` without spending gems — explicitly for your testing.
- TitleScreen shows them with 🔒 + a small ◆ badge if not owned; tapping a locked premium class jumps to Cobalt Vault → Heroes.

## 5. Redundant stat info
`CharacterHeader` already shows name, level, HP bar, gold, gems. The separate `<StatBar />` repeats most of it.
- Delete `StatBar` usage from `CityScreen`, `DungeonScreen`, and any other screen that mounts it under the header.
- Move ATK · MAG into the `CharacterHeader` row (compact: `Lv X · Class · Spec · ATK X · MAG X`) so no info is lost.
- Keep `StatBar.tsx` deleted (or leave file unused if simpler — will remove).

## 6. Hub screen cleanup
`CityScreen` currently lists 11 tiles in one flat grid. Reorganize into three labeled sections + a fixed Descend CTA:

```text
▣ Character
  Equipment   Trainer
▣ City
  Vendors   Quests   Crafter's Row   Auction
▣ Meta
  Echo Tree   Dungeon Journal   Cobalt Vault   Champion's Pass
▼ Descend Dungeon  (big primary)
```

- 2-column grid inside each section; section header in the existing `pixel text-[10px] text-gold` style.
- Locked tiles (Cobalt Vault / Champion's Pass before first run) stay in place but render disabled — same as today.
- Keep the journal log block below.

## Technical details
- New types: `ownedClasses: ClassId[]` in `MetaState`, `unlockClass(id)` store action that mutates+saves meta.
- Lifesteal: in `applyAttack`, if `ab.effect.lifesteal`, call `heal(Math.floor(dmg * lifesteal))` and float a green number.
- Animations live in `src/styles.css` as `@keyframes swing`, `@keyframes cast`, `@keyframes recoil` + utility classes. Existing `shake` reused for screen shudder.
- Art generation uses `imagegen--generate_image` (premium for portraits to match existing detail) at 512×512, then referenced via existing imports — no new asset wiring needed.
- No data migration required: `loadMeta` already merges new fields against `emptyMeta()`, so `ownedClasses` defaults safely.

## Out of scope
- New abilities for existing classes, balance pass, animation for enemy abilities beyond the existing telegraph, real IAP wiring (the gem cost + dev-unlock button is the placeholder paywall).
