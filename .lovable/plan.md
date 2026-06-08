# Pass 7 Bug Sweep

Scope: bug fixes only, no new mechanics. Grouped by file.

## `src/game/store.ts`

1. **Heirloom stash is never consumed.** `buildFreshPlayer` reads `meta.stash` and equips/bags every item, but `meta.stash` is left untouched, so the next wipe re-applies the same heirlooms (duplicate item ids, infinite gear). Fix: in `startGame` (and any place that calls `buildFreshPlayer`), clear `meta.stash` after consuming it, and persist.

2. **`startGold` floor erases Buried Coin.** `Math.max(50, Math.floor(prev.gold * retainGoldPct) || 50)` forces a minimum of 50, so retained gold below 50 silently disappears and the echo node has no effect for small purses. Fix: when `retainGoldPct > 0`, use the retained amount as-is (no `max(50, …)` clamp); only default to 50 when there is no previous run.

3. **`stashItem` doesn't recompute stats.** Stashing an *equipped* item removes it from `player.equipment` but never calls `recompute`, so ATK/MAG/MaxHP keep counting the stashed piece until the next equip/level. Fix: wrap the `set({ player: … })` in `recompute(...)`.

4. **`useHearthstone` never marks `hasCompletedFirstRun`.** Bailing out via hearth banks shards/XP but the Shop and Champion's Pass stay gated as if you'd never descended. Decide and apply one of:
   - Treat hearth as a completed run (set `hasCompletedFirstRun: true`, bump `journal.runsCompleted`), OR
   - Document that hearth doesn't count; instead set the first-run flag the first time `enterDungeon` is invoked.
   Recommended: set `hasCompletedFirstRun = true` on hearth use, since the player did descend.

5. **`runFloors` is dead state.** It's incremented in `restoreBetweenRooms` but `finishRun` reports `p.dungeonDepth` for floors. Either delete `runFloors` from `PlayerState` and the reset paths, or use it in the summary. Recommended: delete it.

6. **`Phoenix Feather` reports lethal damage as taken.** `damage()` returns `n` even when the feather revives, so the floating damage number shows the killing blow as if it landed normally. Fix: when the feather triggers, return the actual HP delta (`p.hp` before → 0 → revived hp), or surface a distinct floater color/log line in `DungeonScreen` for the revive.

7. **Dead screens still wired.** `screen === "victory" / "defeat"` cases in `src/routes/index.tsx` and the `VictoryScreen` / `DefeatScreen` exports are never reachable now (everything routes through `run_summary`). Remove the imports/render branches and the two exports from `DungeonScreen.tsx`. Also drop `"victory" | "defeat"` from the `Screen` union in `store.ts`.

## `src/game/DungeonScreen.tsx`

8. **`restoreBetweenRooms` called twice per kill.** After a combat win, `closeVictory()` calls `restoreBetweenRooms()` and then `advance()` (via the next path) also calls it on the *next* transition — but the immediate "Continue" button path is `closeVictory` → set to `path` (no advance). Trace again: `closeVictory` calls `restoreBetweenRooms` then sets path. `advance` calls `restoreBetweenRooms` when moving to the next depth. That's OK. **Real issue:** on a non-combat path encounter, `advance` is invoked from path → restore fires once. Good. Cancel this item.

9. **`onRacial` gating bug.** `if (... !player.racialUsed) return;` blocks the second racial charge entirely — once `racialUsed === 1` the button still renders (button disabled-check uses `>= racialMax`, correct), but the click handler early-returns. Fix: use `player.racialUsed >= player.racialMax` instead.

## `src/game/RunSummaryScreen.tsx`

10. **Stash-button disabled check uses item identity but stash holds copies.** `meta.stash.some(s => s.id === it.id)` works only because items have unique ids — confirmed in `data.ts` (`newItemId`). No fix needed, but tied to #1: if we clear the stash on consume, the same ids won't ever collide.

## `src/game/meta.ts`

11. **SSR / hydration of `loadMeta()`.** `initialMeta = loadMeta()` runs at module top-level. On the server it returns `emptyMeta()`; on the client it reads localStorage. The store is created once per environment, so titles will render "Wanderer Lv 1" during SSR then jump to the real level after hydration (visible flicker, possible React hydration warning for the level text). Fix: initialize the store with `emptyMeta()`, then hydrate from `loadMeta()` inside a `useEffect` in `TitleScreen` / root, or behind a `typeof window !== "undefined"` lazy initializer that runs once on first client access.

## Out of scope (intentionally not changing)

- XP curves, shard values, echo node costs.
- The fact that `gems` persist through wipes (design choice — they're the paywall currency).
- The unused `closeVictory` + `equippedForSlot` / `gearDelta` UI rendering paths — they're reachable.

## Order of changes

1. Fixes 1–3 (stash + gold + recompute) — most player-visible save corruption.
2. Fix 4 (hearth unlock flag) — gating correctness.
3. Fixes 5, 7 (dead state + dead screens) — cleanup.
4. Fixes 6, 9 (combat polish).
5. Fix 11 (SSR hydration) — last; touches store init.

No new screens, no new data tables.
