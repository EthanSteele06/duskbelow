# Pass 7 — Long-Term Progression

True-roguelite death: on defeat, the **character wipes** (level → 1, gear cleared, bag cleared, talents refunded, gold reset to a small stipend). What survives is the **Wanderer account**, an **heirloom stash**, the **Dungeon Journal**, and any unspent **Soul Shards**. The only way out of a wipe mid-run is a paid consumable.

## What carries over

### 1. Wanderer Account Level
- New stat on the *save*, not the character: `account.xp`, `account.level` (cap 30 for now).
- Sources: depth reached, bosses killed, journal pages completed, first-time class clears.
- Each level grants exactly one tangible unlock so leveling always feels concrete:
  - L2 — second class slot (Rogue) unlocked
  - L3 — Heirloom Stash slot 1
  - L4 — Mage unlocked
  - L5 — second zone "The Bone Halls" unlocked
  - L6 — Priest unlocked
  - L7 — Heirloom Stash slot 2
  - L8 — second racial charge per run
  - L10 — third zone "Void Sanctum"
  - L12 — Heirloom Stash slot 3
  - L15 — choose starting ability from a small pool
  - …etc. Table lives in `data.ts` as `ACCOUNT_UNLOCKS`.
- Title screen shows "Wanderer Lv X · next: <unlock>".

### 2. Heirloom Stash (persistent gear)
- A small permanent inventory (1–3 slots unlocked via account level).
- On the **victory/run-end screen** the player may move up to N bag items into the stash *before* the wipe is applied.
- On a **fresh character**, the stash contents auto-equip into matching slots if empty, otherwise sit in the new bag.
- Heirlooms get a subtle gold border + "Heirloom" tag and are non-sellable.
- Cannot be moved into the stash mid-run, only at the post-run screen — keeps the decision meaningful.

### 3. Dungeon Journal
- Persistent codex across runs:
  - Enemies discovered / killed (counter)
  - Bosses downed (per boss)
  - Items found (per item id)
  - Deepest floor + best run summary
  - **Lore fragments** dropped by elites/bosses (text snippets revealed on collection)
- Page completions grant Soul Shards + occasional account XP.
- Accessible from the city as a new "Journal" card.

### 4. Soul Shards + Echo Tree
- Currency dropped from elites/bosses and granted by journal completions.
- Persists across wipes.
- Spent in an **Echo Tree** (small 8–10 node tree, simple chains):
  - +5 starting HP, +1 starting ATK, +1 potion slot, start with shield, +5% gold, extra racial charge, retain 25% gold on wipe, etc.
- Respec costs shards (not gold) and is always available from the city.

### 5. Paid escape / revive (monetization hook)
- Two consumables, only buyable with **gems** (no gold path):
  - **Hearthstone Charm** — bail out of the dungeon before death; keeps current bag + gold + XP, no character wipe. One-time use, consumed on activation.
  - **Phoenix Feather** — auto-trigger on lethal damage, revives at 50% HP. Single use.
- Visible button slot in the dungeon HUD once owned. Champion's Pass gives 1 of each per week (lore: "the patron pays your debt").
- All other progression remains fully F2P — the paid items only soften the roguelite, they don't grant power.

## Death flow

```text
HP ≤ 0
  └── any revive item owned? ── yes ── consume, restore, continue
                              └── no  ── Run Summary screen
                                          ├── show: floors, kills, gold, XP, shards earned, items found
                                          ├── allow: stash up to N items (if slots unlocked)
                                          ├── grant: account XP, journal updates, shards
                                          └── button: "Wake in the city" → wipe character → city
```

## Onboarding changes

- New saves start at **0 gems** (not 500).
- Shop & Champion's Pass cards in the city are **locked until first run completes** (win or wipe). Tooltip: "Unlocks after your first descent."
- First wipe shows a one-time explainer overlay: "Your hero falls — but the Wanderer endures. Spend Soul Shards. Recover heirlooms. Descend again."

## Out of scope for this pass

- Backend leaderboard, daily login, friends list, cross-device sync.
- Heirloom *scaling* (heirlooms keep their original stats; level-scaling is a later pass).
- New zone art beyond names + tinted palette (real zone biome work is Pass 8+).

## Technical notes

- New module `src/game/meta.ts` owns `AccountState`, `JournalState`, `ECHO_TREE`, `ACCOUNT_UNLOCKS`, and a `persistMeta()` / `loadMeta()` pair using `localStorage` (key `duskbelow.meta.v1`). Versioned so we can migrate later.
- `store.ts`:
  - Split state into `player` (per-run) and `meta` (persistent).
  - New actions: `grantShards`, `spendShard(nodeId)`, `respecEchoTree`, `stashItem(itemId)`, `unstashOnNewRun`, `recordKill`, `recordBoss`, `recordItem`, `recordLore`, `wipeCharacter`, `useHearthstone`, `consumePhoenixOnLethal`.
  - `damage()` checks Phoenix Feather before applying lethal; if revived, pushes log + clears the feather.
  - `reset()` no longer clears `meta`.
- `data.ts`:
  - `ACCOUNT_UNLOCKS: AccountUnlock[]`, `ECHO_TREE: EchoNode[]`, `LORE_FRAGMENTS: LoreFragment[]`.
  - Two new gem-only items: `hearthstone_charm`, `phoenix_feather` added to `VENDOR_ITEMS` with `kind: "consumable"` and an `effect` discriminator.
  - Elites flagged `dropsLore?: string` and `shardValue?: number`.
- New screens:
  - `src/game/RunSummaryScreen.tsx` — shown on wipe or full clear; handles stash selection.
  - `src/game/EchoTreeScreen.tsx` — spend shards.
  - `src/game/JournalScreen.tsx` — three tabs: Bestiary / Items / Lore.
- `CityScreen.tsx`: add Journal + Echo Tree cards; gate Shop & Champion behind `meta.hasCompletedFirstRun`.
- `DungeonScreen.tsx`: HUD buttons for Hearthstone / Phoenix when owned; on lethal-damage path, route through revive check; on victory/defeat route to `RunSummaryScreen` instead of jumping straight back to city.
- `TitleScreen.tsx`: "Wanderer Lv X · next unlock: …" line under the logo.
- Class selection in character creation filters to classes unlocked at the current account level.

## Suggested ship order inside the pass

1. Meta state module + persistence + run-summary screen + character wipe (loop works end-to-end with no rewards yet).
2. Soul Shards + Echo Tree + journal tracking + Journal screen.
3. Account level + unlock table + class/zone gating + title-screen readout.
4. Heirloom stash UI on run summary + auto-equip on new character.
5. Hearthstone + Phoenix items, HUD buttons, lethal-damage interception, Champion's Pass weekly grant.
6. Defer Shop/Champion behind first-run flag + remove starter 500 gems + first-wipe explainer.
