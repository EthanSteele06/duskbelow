# QoL & Refinement Pass

## 1. Unified Bag (gear + materials + quest items)

Today gear lives in `player.bag` while materials and quest items live in separate `Record<string, number>` maps and don't count against capacity. Unify them.

- Introduce a single `BagEntry` discriminated union:
  - `{ kind: "gear", item: GearItem }` — 1 slot each
  - `{ kind: "material", id: string, count: number }` — 1 slot per **stack of 20**; 25 Fel Residue = 2 slots (20 + 5)
  - `{ kind: "quest", id: string, count: number }` — same stacking rule
- Replace `player.bag: GearItem[]`, `player.materials`, `player.questItems` with `player.bag: BagEntry[]`. Add helpers `addMaterial / addQuestItem / removeMaterial` that find the partial stack first, then spill into a new slot, refusing when bag is full.
- Update every reader: `EquipmentScreen`, `ProfessionScreen` (crafting cost check + consume), `QuestsScreen` (carrying count), `turnInQuest`, `acceptQuest` back-fill (see §3), vendor sell-material, dev grants, and the run-end stash flow.
- `EquipmentScreen` bag list gets three filters (All / Gear / Materials & Quest) and a Sort button (rarity → ilvl → slot for gear; alpha for stacks).
- When bag is full mid-dungeon: drop is logged as "couldn't loot — bag full" instead of silently disappearing.

## 2. Wanderer Page

New screen `wanderer` reached from the City Meta section (replace the current "Journal" tile label or sit beside it). Tabs:

1. **Stash** — grid of `meta.stash` slots up to `stashCapacity`. Each slot shows the gear card; tap to withdraw into current run's bag (if room). Empty slots show "Heirloom Slot — unlocks at Lv X".
2. **Profile** — lifetime totals: runs completed, deepest floor (normal / cursed), bosses slain, gold earned, legendaries owned, playtime if tracked. Add the counters we don't store yet to `meta` (`lifetime: { runs, bossesKilled, goldEarned, deepest, deepestCursed }`) and increment them in `finishKill`, `endRun`, etc.
3. **Unlock Track** — vertical ladder from current Wanderer level → cap, each rung showing the `UNLOCKS` entry, with the next one highlighted. Reuse `nextUnlock` / `UNLOCKS` from `meta.ts`.
4. **Collection** — grid of all classes, specs, and factions. Greyed if never played; gold-framed if completed a run with them; ★ if a legendary owned. Tracking lives in `meta.collection: { classesPlayed: ClassId[], classesCleared: ClassId[], factionsPlayed: FactionId[] }` updated on run start / boss kill.

Existing Journal screen stays for the log; Wanderer is the new identity hub.

## 3. Quest Turn-In Fix

Root cause: `acceptQuest` initializes `progress: 0` and progress is only incremented when materials/quest items are *added*. If the player already carries the item before accepting, the quest can never complete. Also `turnInQuest`'s consume step is brittle (only consumes from one of items vs. materials, not both, and doesn't fail if the unified bag can't cover it after §1).

Fixes:
- On `acceptQuest`, scan the unified bag and seed `progress = min(target.count, carried)`; mark `completed` if already satisfied.
- On any `addMaterial / addQuestItem`, recompute progress from the bag total instead of `prev + count` — idempotent and correct after §1.
- `turnInQuest`: decrement `target.count` from bag stacks (across kinds), pulling from quest entries first then materials. Refuse and log if total < target.
- "Turn in all ready" button at top of Quests screen — iterates `quests.filter(q => q.completed && !q.turnedIn)`.

## 4. Chronicler NPCs (per-storyline)

Each storyline gets its own NPC with portrait, name, and per-step dialogue. New screen `chronicle` that takes a `storyId`.

- Extend `STORYLINES` entries with `npc: { name, title, portrait, intro, outro }` and add `dialogue: { before: string[], after: string[] }` to each story-step `QuestDef` (multi-page text the NPC speaks before accepting and after turn-in).
- `QuestsScreen` Chronicles section: each storyline card shows the NPC portrait + name and a "Speak with {name}" button → opens chronicle screen.
- Chronicle screen flow per step: NPC portrait + paged dialogue → Accept button → progress view → on completion, return to NPC → outro dialogue → Turn In (which can unlock class).
- **Demon Hunter — Altruis the Sufferer** (Illidari survivor exiled from his order). Three steps written from WoW lore:
  1. *Whispers from the Wards* — Altruis warns of fel taint leaking through the city wards; speaks of Mardum, the shattered prison-world, and why Illidan tore demons apart to consume them.
  2. *Hunt the Shacklewarden* — Lore on the Black Temple, Maiev Shadowsong's hunt, and how the Shacklewarden is a fragment of a pit lord's binding that escaped. Altruis grimly recounts Varedis Felsoul.
  3. *Bind the Pact* — The ritual of consuming a demon's soul to become Illidari; the Spectral Sight blindfold, the metamorphosis, "We must become demons to defeat them." Turn-in unlocks DH and Altruis intones Illidan's "You are not prepared!" as outro.
- Generate one new portrait asset: `src/assets/npc-altruis.jpg`. Stub names + placeholder portraits for the three other storylines (reuse existing trainer art, fill copy later).

## 5. Dev Panel additions

Add to `Settings.tsx` Dev Tools:
- **Unlock Demon Hunter (test)** — calls `unlockClass("demonhunter", { devFree: true })` and marks the DH storyline turned-in so the chain UI is consistent.
- **+5 of every quest item** — for testing turn-in flow now that bag is shared.
- **Reset Chronicles** — wipes story quest state to re-test dialogues.

## 6. Extra QoL bundled

- **Auto-sell junk toggle** — setting `meta.options.autoSellCommon: boolean`. At run end (or when picked up if bag full), Common rarity gear is auto-sold for its `gearSellPrice` and one summary log line is emitted.
- **Compare-on-hover everywhere** — extract the existing bag delta render into `<GearCompare item />` component and reuse on vendor cards and dungeon loot offers.
- **One-tap turn-in all** — already covered in §3.

## Files touched

- `src/game/data.ts` — `BagEntry` types, storyline NPC/dialogue fields, Altruis dialogue copy.
- `src/game/store.ts` — bag refactor, quest progress recompute, lifetime/collection counters, dev actions.
- `src/game/meta.ts` — `lifetime`, `collection`, `options` on MetaState + migration.
- `src/game/EquipmentScreen.tsx` — render BagEntry, filters/sort, GearCompare reuse.
- `src/game/QuestsScreen.tsx` — NPC card + Speak button + Turn-in-all.
- `src/game/ChronicleScreen.tsx` — new screen.
- `src/game/WandererScreen.tsx` — new screen with 4 tabs.
- `src/game/CityScreen.tsx` — Wanderer tile.
- `src/game/Settings.tsx` — dev DH unlock + quest item grant + reset chronicles.
- `src/game/ProfessionScreen.tsx`, `src/game/MarketScreens.tsx`, `src/game/RunSummaryScreen.tsx`, `src/game/DungeonScreen.tsx` — updates for unified bag readers, GearCompare, auto-sell at run end.
- `src/assets/npc-altruis.jpg` — new portrait.

## Order of work

1. Bag refactor + migration (touches everything; do first).
2. Quest progress fix on top of new bag.
3. Wanderer screen + meta counters.
4. Chronicler NPC system + Altruis content.
5. Dev panel additions.
6. Auto-sell + GearCompare reuse + turn-in-all.
