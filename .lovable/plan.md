
# Pass 4 — Make choices matter & finish the world

All eight items from your brief, grouped by where the work lands. No new screens — every change reuses existing UI shells (Chronicle, vendor, quest board, dungeon encounter card, journal).

## 1. Real fork choices (DungeonScreen + store)

Replace the three identical `advance()` buttons with weighted paths. New `advance(bias)` param on the store action:

- **← Left — The Bloody Way**: combat weight ×1.6, gold/gear drops +25%, trap/shrine weight ×0.5
- **↑ Onward — The Even Road**: current weights, unchanged
- **→ Right — The Crooked Path**: trap weight ×1.8, shrine weight ×1.8, XP/material drops +30%, combat ×0.7

Implementation: the existing encounter-roll table in `store.ts` (rollEncounter or equivalent) gets a multiplier object; the path card passes a bias key. Add a tiny pixel-text hint under each button so players learn the pattern.

## 2. Finish three Chronicle arcs (data.ts + ChronicleScreen)

Reuse the Demon Hunter pattern (3 stages, NPC dialog before/after, optional class unlock). New content only — no UI changes.

- **The Sealed Heart** (`story_sealed`) → 3 stages culminating at floor-30 `sealed_one`. Quest items: `ward_fragment` (drops floors 20-29), `sealed_sigil` (floor-30 boss guaranteed first kill). Final turn-in unlocks Cursed-mode lore entry + a Warding Echo node.
- **The Marrow March** (`story_marrow`) → Brigade/skeleton arc with new NPC "Captain Veil, the Bone-Listener". Quest items reuse `bone_dust` then a new `marching_order` from skeleton-type enemies on floors 8-18. Final reward: Wanderer Lv 5 "Bone Halls" lore unlock + faction-flavored relic.
- **The Mossfather's Toll** (`story_moss`) → Druid grove arc with new NPC "Elder Thorn" (portrait already imported at data.ts:822). 3 stages using `herb_bundle` then new `stoneheart_seed`. Final turn-in unlocks druid profession recipe (Mossbind Salve).

Each arc reuses `STORYLINES`, `QUESTS`, and `openChronicle` — zero new components.

## 3. Daily Contract (store + CityScreen tile)

- New `meta.dailyContract: { id, seed, acceptedAt, completedAt, expiresAt }` with 24h rotation.
- Pool of ~8 contracts: kill counts ("Slay 8 cultists"), no-potion floor reaches, turn-in counts, faction objectives.
- Reward: Soul Shards (5-15) + Account XP scaled to difficulty.
- New "▣ Contract Board" tile on CityScreen (above Quest Board). Uses existing quest UI styling. Shows current contract, accept/turn-in, countdown.

## 4. Rotating Relics vendor (MarketScreens)

Replace the Auction House stub with **Rotating Relics**:

- `meta.relicVendor: { rolledAt, listings: GearItem[] }`, refresh every 24h.
- 3 listings, weighted toward rare/epic, occasional legendary at premium price. Faction-flavored 30% of the time (name + sigil tint).
- Reuses ShopScreen item rows + `GearCompare` from Pass 3. Sold items disappear until next refresh.
- City tile renamed from "Auction House" to "Rotating Relics" with "🕯 next refresh in Xh" line.

## 5. Boss moments — floors 10/20/30 (store + DungeonScreen)

For each boss (`dragon`, `voidspawn`, `sealed_one`):

- **Intro line** rendered as a pixel banner above the combat card on first encounter ("The Sealed One stirs. The stone forgets its name.").
- **Phase 2 at ≤50% HP**: log line, +10% damage flag, new intent rotation. For `dragon` add a wing-buffet bleed; for `voidspawn` add "Void Echo" telegraphed AoE; for `sealed_one` summon a passive Shard add that ticks bleed.
- **First-kill guaranteed drop**: legendary-tier slot item + lore fragment for that boss. Tracked via existing `meta.journal.bossesDowned` set.

No new combat systems — uses existing intent + telegraph + bleed primitives.

## 6. Tiered Bestiary (JournalScreen + meta)

Existing kill counts already persist. Layer reveal tiers on top:

- **0 kills** → `???`, type only (already exists).
- **3 kills** → reveal name, HP band ("Low / Med / High / Boss"), and one signature attack line.
- **10 kills** → reveal full intent rotation with telegraph markers, mirroring how the combat card formats them.
- **25 kills** → "Mastery" badge + small permanent +5% damage vs that enemy id (passive lookup in combat resolver).

Pure presentation + one passive lookup. No new screens.

## 7. Faction-specific content

- **Faction bounties**: 2 per faction, gated by player's chosen faction. Allies get "Cull the Banner" (kill 6 brigade_marauder), "Sealed Orders" (deliver 2 sealed_scroll to kingdom contact). Brigade gets symmetric pair vs kingdom_knight.
- **Faction shrine encounter**: new dungeon `shrine` subtype with two variants. Allies shrine = "Bulwark Oath" (+15% block this run); Brigade shrine = "Bloodlust" (+12% damage, -5% max HP this run). Player's faction determines which spawns.
- **Faction Echo node**: one new node in EchoTree per faction (Allies: +1 armor every 5 Wanderer levels; Brigade: +1 crit damage every 5 Wanderer levels).

## 8. Pre-descent Oaths (new modal on DESCEND)

Tap DESCEND → small modal with three optional buttons (skippable):

- **Greedy Oath** — gold +30%, trap damage +50%
- **Silent Oath** — potions disabled, Soul Shards +50%
- **Deep Oath** — start at floor 3, all enemies +1 tier, +20% XP

Stored on `player.activeOaths: string[]`, cleared on `finishRun`. Run summary screen shows which oaths were active and their final modifier line.

## Technical details

- **Files touched**: `src/game/store.ts` (fork weights, daily contract, relic vendor refresh, boss phases, bestiary mastery, oaths), `src/game/data.ts` (chronicle content, daily contract pool, faction bounties, oath defs, shrine variants), `src/game/DungeonScreen.tsx` (fork hints, boss banner, phase-2 line, oath modal, shrine encounters), `src/game/CityScreen.tsx` (Contract Board tile, Rotating Relics rename), `src/game/MarketScreens.tsx` (Rotating Relics vendor), `src/game/JournalScreen.tsx` (tiered reveal), `src/game/EchoTreeScreen.tsx` (faction nodes), `src/game/RunSummaryScreen.tsx` (oath summary).
- **Meta schema additions** (no migration — additive): `dailyContract`, `relicVendor`, `bestiaryMastery: Record<string, number>`, plus `player.activeOaths`. Save loads default missing fields to safe values.
- **No new assets required** — reuses existing class portraits (Elder Thorn already imported), faction sigils, and rarity frames.

## Out of scope (Pass 5+)

- Real auction house with bid/sell economy.
- New combat ability system or weapon-swap mid-run.
- More than one daily contract at a time.
- Cross-class profession trees beyond the one Mossbind Salve recipe.
