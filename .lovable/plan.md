# Pass 3 — Polish, Stats & Dedupe

Four focused jobs. No new features beyond what we already designed.

## 1. Wire real lifetime + collection tracking

Today the Wanderer → Profile / Codex tabs read `meta.lifetime` and `meta.collection`, but nothing writes to them. Fix:

- **`startGame`** — add `classId` to `collection.classesPlayed` and `faction` to `collection.factionsPlayed` on first play.
- **`recordKill`** — when `opts.boss`, bump `lifetime.bossesKilled`.
- **`rewardGold`** — add the gained amount to `lifetime.goldEarned`.
- **`addToBag`** — when a legendary lands, bump `lifetime.legendariesFound` and add classId to `collection.legendaryClasses`.
- **`finishRun`** — bump `lifetime.runs`; on victory add classId to `collection.classesCleared`; track `lifetime.deepest` (any mode) and `lifetime.deepestCursed` (cursed only).

All writes go through `persistMeta`. No new schema — `MetaState` already has these fields.

## 2. Compare-tooltip on loot & vendor

Reuse the existing `gearScore` delta UI from `EquipmentScreen`:

- **Loot screen (DungeonScreen victory)** — already shows a delta number; expand it into the same `▲ +N vs equipped` / `▼ -N vs equipped` / `= same` line with rarity color, plus a one-line "currently equipped: X (iLvl)" reference so the player can compare without leaving.
- **Vendor / Shop gear listings** — for any vendor item that is a `weapon` or gear-style entry, show the same delta block under price. Skip for potions/buffs/cosmetics.
- Mobile-friendly: it's always-visible info, not a hover tooltip, so it works on touch.

Refactor: extract a small `<GearCompare item={...} equipped={...} />` component in a new `src/game/GearCompare.tsx` so EquipmentScreen, DungeonScreen, ShopScreen, and VendorScreen all share one implementation.

## 3. Stash polish

- **Withdraw → bag, not discard.** `unstashItem` currently just deletes. Change it to: try to add the item to `player.bag` (respect bag cap via `bagFreeSlots`), then remove from stash. If the bag is full, log "Bag full" and abort. New `withdrawStash(idx)` action; keep `unstashItem` as a private fallback or remove it.
- **Stash-from-equipment shortcut on Wanderer page.** Add a small grid under the Stash tab showing currently equipped items with a "→ Stash" button per item (uses the existing `stashItem(_, slot)` API). Disabled when stash is full.
- The existing per-slot stash button on `EquipmentScreen` stays.

## 4. Dedupe Journal ↔ Wanderer

The Wanderer Profile tab already covers Wanderer level, runs completed, deepest floor, shards, bosses, gold, legendaries. The old Journal screen shows: runs completed, deepest floor, best-run kills, bestiary, lore fragments.

Plan: **keep `JournalScreen`, but make it lore-only**, and remove the City tile.

- Strip the stats card from `JournalScreen` (lives on Wanderer now).
- Keep the Bestiary and Lore Fragments — those are too long to fit in the Wanderer tab and are a different reading experience.
- Rename the screen header "▣ Bestiary & Lore" and move the entry point into the Wanderer page as a fifth small button at the bottom of the **Codex** tab ("Open Bestiary & Lore →"). Remove the standalone "Journal" tile from `CityScreen`.
- Add a "Best run" mini-line to the Wanderer Profile tab (it has the data, just not displayed yet) so nothing is lost.

This collapses 2 city tiles into 1 and removes duplicate stat grids.

## Technical details

- **Files touched**: `src/game/store.ts` (tracking + `withdrawStash`), `src/game/WandererScreen.tsx` (best run line, equipment-to-stash shortcut, "Open Bestiary" button, switch to withdrawStash), `src/game/JournalScreen.tsx` (strip stats, rename), `src/game/CityScreen.tsx` (remove Journal tile), `src/game/GearCompare.tsx` (new), `src/game/DungeonScreen.tsx` / `ShopScreen.tsx` / `MarketScreens.tsx` (use `<GearCompare>`).
- **No data migrations needed** — meta schema is already shaped for these stats; existing saves just had zero writes against them.

## Out of scope (saving for Pass 4)

- Additional Chronicle NPCs for non-DH storylines.
- Auto-junk filter beyond the existing "auto-sell common" toggle (e.g. rarity threshold slider).
- One-tap "stash all heirloom-grade gear" mass action.
