## Goals

Round of nitpick fixes and content. Each item below maps to one of your asks.

---

### 1. Druid & Death Knight specs + talent trees
- `data.ts` → add to `SPECS`:
  - Druid: **Balance** (mag), **Feral** (atk), **Restoration** (mag/hp).
  - Death Knight: **Blood** (hp/atk lifesteal), **Frost** DK (atk/crit), **Unholy** (atk/mag).
- Add matching entries to `TALENT_TREES` reusing the `tree(prefix, {...})` helper.
  - Note: "frost" id is taken by Mage — use `dk_frost` etc.

### 2. Unlock paths for Mage & Priest (shards)
- `meta.ts` → add Echo Tree nodes:
  - **Awaken the Mage** — cost 6 shards, unlocks Mage permanently.
  - **Awaken the Priest** — cost 10 shards, unlocks Priest permanently.
- Implement by extending `spendEcho` in `store.ts`: if node id matches one of these, also add the class to `meta.unlockedClasses`.
- Remove the auto-unlock from `ACCOUNT_UNLOCKS` for Mage (lvl 4) and Priest (lvl 6) — replace with cosmetic/utility unlocks so the path is shards-only.

### 3. Slower shard rate
- `recordKill` in `store.ts` → drop trash from `1 → 0` (with ~25% chance of 1) and boss from `8 → 3`. Net effect: trash runs yield ~1-3 shards instead of 8-12; bosses still meaningful.
  - Keep `echo.shardMult` scaling.

### 4. "Equipped" feedback on loot
- `store.ts` `equip()` already calls `pushLog("Equipped …")`. Issue is the log scrolls in the city, not the dungeon loot screen.
- Fix: in `DungeonScreen.tsx` loot view, after pressing **Equip**, set a transient `equippedFlash` state (3s) that shows a green "✓ EQUIPPED — replaces [oldName]" banner inline on the loot card. Also disable the Equip button afterward so it's obvious.

### 5. Vendor → next-run buffs (consumed on dungeon exit)
- `data.ts` `VENDOR_ITEMS`:
  - Replace stat-stick weapons (`w1`, `w2`) and `t1` trinket with **temporary blessings**:
    - **Whetstone Oil** (40g) — +3 ATK next run.
    - **Ember Tonic** (40g) — +3 MAG next run.
    - **Ironskin Draught** (60g) — +15 Max HP next run.
    - **Lucky Coin** (90g) — +25% gold this run.
  - Add `kind: "buff"` with `effect: { atk?, mag?, maxHp?, goldMult? }` and `duration: "next_run"`.
- `store.ts`:
  - Add `player.activeBuffs: BuffEffect[]` (empty by default).
  - `buy()` for buff items pushes onto `activeBuffs` instead of stat-baking.
  - `enterDungeon()` → apply all `activeBuffs` to `baseAtk/baseMag/baseMaxHp/goldMult` for the run, then recompute.
  - `exitDungeon()` AND `finishRun()` → clear `activeBuffs` and recompute base stats.
- UI: small "Active Blessings" strip on Vendor screen + City showing what's queued.

### 6. More Echo Tree nodes + sort learned to bottom
- `meta.ts` add (in addition to the two class unlocks above):
  - **Iron Will** — start with +1 racial charge (cost 4).
  - **Grave Robber** — +1 chest per floor chance bump (cost 3).
  - **Hoarder** — keep 1 random bag item through wipe (cost 4).
  - **Echo of Light** — first hit per fight crits (cost 5).
  - **Ascendance** — +1 starting level on new chars (cost 8).
- `EchoTreeScreen.tsx` → split nodes into `available` and `learned`, render learned in a collapsed section below "Available".

### 7. Tap-to-confirm combat actions (mobile)
- `DungeonScreen.tsx` ability buttons:
  - Local state `armedAbility: string | null`.
  - First tap on an ability → set `armedAbility`, show its full description in a banner under the action bar, button visually "armed" (gold border + "TAP TO CONFIRM").
  - Second tap on the same ability → execute and clear.
  - Tapping a different ability → re-arms to that one.
  - Add a setting toggle `confirmCombat` (default true on mobile, off on desktop via `useIsMobile`). Persist in localStorage. Surface in City as a small ⚙ toggle, OR just default-on for everyone; default-on is simpler — go with that.

### 8. Two town arts (Brigade vs Kingdom)
- Generate two new pixel-art city backgrounds matching existing style:
  - `src/assets/city-allies.jpg` — bright gothic kingdom, banners, stained glass, stone keep.
  - `src/assets/city-brigade.jpg` — grim warcamp, tents, braziers, palisade, blood-red banners.
- `CityScreen.tsx` → pick image by `player.faction`. Keep old `city.jpg` as fallback.
- (Out of scope: separate NPCs/vendors per town — only the art changes for now, as you said "at least separate arts".)

---

### Technical notes
- All changes are local state + content; no backend.
- Persistent fields added to `MetaState` / `PlayerState` will need migration in `loadMeta` (default to empty arrays) — straightforward.
- No new packages.

---

### Out of scope (flag for later)
- Per-town vendors / quest boards / trainers.
- Real settings menu (combat-confirm is just default-on).
- Mage/Priest shard prices are guesses — easy to tune after playtest.
