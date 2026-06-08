
# Phase 1 — New Enemies & Dungeon Interactions

## New Enemies (data.ts + new art per enemy)
Add 6 new enemies, slotted into existing depth pools so they show up naturally:
- **Spider Swarm** (depth 1–9) — telegraphed *Web* applies a slow (chill-style "+dmg taken").
- **Goblin Sapper** (depth 4–14) — telegraphed *Bomb Throw* heavy single hit.
- **Mire Shambler** (depth 6–19) — heals itself every 3 turns; high HP, low ATK.
- **Cinder Drake** (depth 10–24) — *Wingbeat* + telegraphed *Firebreath* burn.
- **Soulbinder** (depth 12–24) — applies a stacking "weakness" debuff that reduces player ATK/MAG for 3 turns.
- **Stone Golem** (depth 15–29) — armored, takes flat -2 damage per hit; telegraphed *Quake*.

Each gets a generated pixel-art portrait via `imagegen` and a `materialDrop`.

## New Dungeon Interactions
Extend `Encounter` and `rollEncounter`:
- **Merchant** (~3%) — sells 1 random potion or blessing at a small markup; can be skipped.
- **Lore Stone** (~3%) — gives a journal entry + small shard reward; flavor only.
- **Cursed Altar** (~2%) — choice: gain a temporary +ATK/+MAG buff for the rest of the run *or* take 10% HP damage.
- **Wandering Healer** (~2%) — free full heal; one-shot per encounter.

Adjust shrine/trap rates so total still leaves combat dominant.

## Materials in the Bag
Currently `materials` only show on the Crafter's Row screen. Add a **Materials** section to `EquipmentScreen.tsx` that lists each owned material with its name, icon, and count (read-only — crafting still happens on Crafter's Row). This makes the bag feel inclusive without changing storage.

---

# Phase 2 — Varied Loot Tables + Class Legendaries

## Loot table variety
Replace the single `rollGear` with a weighted table per encounter source:
- **Trash mob** — common-leaning, low chance of rare+.
- **Mini-boss (5/15/25)** — guaranteed rare, ~25% epic, ~5% epic+.
- **Major boss (10/20)** — guaranteed epic, ~15% legendary.
- **Final boss (30)** — guaranteed epic + small chance (~8%) of that class's legendary.
- **Chest** — biased to uncommon/rare, scales with depth.

## Class Legendaries
Add `CLASS_LEGENDARIES: Record<ClassId, GearItem template>` — one named legendary per class with thematic stats and a flavor line:
- Warrior — *Worldcleaver* (sword, big ATK + crit)
- Rogue — *Whisper of the Vanished* (dagger, ATK + dodge)
- Mage — *Aetheric Scepter* (staff, big MAG + crit)
- Priest — *Reliquary of Dawn* (tome, MAG + HP)
- Druid — *Heartwood Branch* (staff, MAG + HP)
- Death Knight — *Frostmourne Shard* (sword, ATK + lifesteal flag)

Only drops from depth 30 boss kill, gated on `player.classId`. Add a journal/log line celebrating the drop.

---

# Phase 3 — Cursed Depths (Hard Mode with Affixes)

A second dungeon mode, unlocked after completing the normal dungeon at least once (gate on `meta.hasCompletedFirstRun` + a new `meta.hasClearedNormal` flag set on victory at depth 30).

## Entry
- New `ActionTile` in CityScreen: "▼ Cursed Depths" (only visible after first clear).
- Confirm modal explains: harder enemies, but better loot and shards.

## Affix system
On entry, roll **2 affixes** for the run from a pool (shown in a banner during the run):
- **Fortified** — enemies have +30% HP.
- **Sapping** — enemies hit +20% harder.
- **Bloodlust** — enemies enrage below 30% HP (+50% damage).
- **Volatile** — on enemy death, lose 5% max HP.
- **Frostbitten** — all chill effects also apply to you.
- **Starved** — between-room healing reduced by 50%.
- **Greedy** — enemies drop double materials and 50% more gold.
- **Echoes** — every 5th floor spawns a second enemy after the first dies.

Affixes are pure modifiers — wired in `buildCombat`, `enemyTurn`, `finishKill`, `restoreBetweenRooms`. Reward side: Cursed Depths grants +50% shards and a higher legendary chance on final boss.

## Implementation outline
- New `meta.cursedAffixes: AffixId[]` plus a `mode: "normal" | "cursed"` field on the run.
- `enterDungeon(mode)` accepts the mode and rolls affixes when cursed.
- Pass `mode`/`affixes` into encounter rolls and combat math.
- HUD: small banner in DungeonScreen header listing active affixes.

---

# Out of scope (deferred per your roadmap)
- Spec rebalances, ability tuning, QoL polish — next pass after Cursed Depths lands.

# Technical notes
- All new assets generated under `src/assets/` via `imagegen` (fast tier, pixel-art style matching existing).
- No schema/db changes — all state is local Zustand + localStorage meta.
- Keep encounter probability table in one place (`rollEncounter`) so future tweaks are one edit.
