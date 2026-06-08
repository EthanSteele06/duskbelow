# Roadmap: Three Passes + Faction Weight

The review is largely correct. The strongest, cheapest wins all sit in combat feedback, run framing, and giving death meaning. Below is a phased plan — we ship and review one pass at a time.

## Pass 5 — Combat Depth (ship first)

The pass that fixes "spam Strike wins everything."

- **Real class kits.** Replace the shared Warrior-flavored log with per-class abilities & combat verbs:
  - Warrior: Strike · Cleave · Shield Wall (already)
  - Rogue: Backstab · Eviscerate (combo points) · Evasion (dodge buff)
  - Mage: Frostbolt (Chill) · Fireball (Burn DoT) · Arcane Barrier
  - Priest: Smite · Shadow Word: Pain (DoT) · Renew (HoT)
- **Status effects engine.** Add `effects: StatusEffect[]` to combatants. Tick at end of turn. Types: `burn`, `bleed`, `chill` (−speed/+dmg taken), `curse` (−ATK), `renew` (HoT), `shield` (absorb).
- **Enemy telegraphs.** Each enemy has an `intent` for next turn shown above its sprite ("⚡ Cultist is channeling Hellfire — 18 dmg"). Gives Shield Wall / Evasion / Barrier a reason to exist.
- **Inline equip-on-drop.** When loot drops mid-dungeon, show a card with stat delta vs equipped and an **Equip / Bag / Discard** row right there — no need to leave the dungeon.
- **HP regen between rooms.** +10% maxHp per cleared room (configurable). Lets 10-floor runs breathe.
- **Damage-skin color** already wired — extend it to crits with a small screen-shake.

Technical: new `src/game/combat.ts` (status engine + intent resolver), `src/game/abilities.ts` (per-class ability defs), edits to `DungeonScreen.tsx`, `data.ts` (enemy `intents[]`), `store.ts` (loot prompt state).

## Pass 6 — Run Feel

Make a run feel like a journey, not a corridor of identical rooms.

- **Run Summary on death/victory.** Floors cleared, kills, gold, XP, best item, time. Replaces the abrupt "YOU DIED."
- **Named zones every 3 floors.** Depth 1–3 The Rat Warrens · 4–6 The Bone Halls · 7–9 The Void Sanctum · 10 The Throat. Zone banner on entry, palette tint per zone.
- **Bosses at floor 5 and floor 10.** Named encounters with multi-phase intents and a guaranteed rare drop.
- **Branch flavor hints.** Each fork shows a one-line cue per path ("skittering from the left", "faint warmth ahead") tied to the actual encounter type.
- **Mini-map strip.** Compact horizontal trail of cleared/current/upcoming rooms with icons (combat / chest / shrine / boss).
- **More event types.** Shrines (gamble buff), wandering merchant, traps, rest spots.

Technical: `src/game/zones.ts`, `src/game/RunSummaryScreen.tsx`, `src/game/MiniMap.tsx`, `bosses` added to `data.ts`, `DungeonScreen` event dispatcher refactor.

## Pass 7 — Meta + Retention

Give death weight; defer monetization until earned.

- **Soul Shards** (new meta currency, persists across runs). Earn ~1 per floor + boss bonuses.
- **Echo Tree** — small persistent passive tree spent with shards (`+5 starting HP`, `+1 potion`, `+ small chance to keep a green item`, unlock 4th ability slot, etc.). New `EchoTreeScreen.tsx`.
- **Dungeon Journal** — kills/bosses/items/lore fragments tracked across runs.
- **Lore fragments** drop from elite mobs; readable in Journal.
- **Defer shop & Champion Pass surfacing** until first run completes (city tiles greyed with "Unlocks after first descent").
- **Remove starter 500 gems** — start at 0, first 50 gems awarded on first run completion with a small "Welcome" toast.
- **Daily login bonus** (gold + 1 shard).
- **Leaderboard stub** (local-only deepest floor / fastest clear; ready to wire to Cloud later).

Technical: `meta` slice in `store.ts` (shards, echoes, journal, dailyClaimed), new screens, gate logic in `CityScreen.tsx`.

## Faction Weight (folded into Pass 5)

Small mechanical asymmetry, applied at character creation:

- **Kingdom of Allies** — *Bulwark Oath:* +5 maxHp, +3% block; starter offhand = Battered Buckler.
- **Endless Brigade** — *Bloodlust:* +3% crit, +1 ATK; starter weapon swap to a 2H variant (no offhand).
- Each faction also gets one **once-per-run racial-style ability** button in combat ("Rally" — heal 15% / "Frenzy" — +30% dmg next turn).

Technical: extend `FACTIONS` in `data.ts` with `passives` + `racial`, apply at `createCharacter` in `store.ts`, render racial button in `DungeonScreen` ability row.

## Order & Acceptance

1. **Pass 5 + Faction Weight** — combat feels different per class, enemies telegraph, loot equips inline, factions matter. *Acceptance:* a Mage run plays nothing like a Warrior run; Shield Wall is the right call against a telegraphed Hellfire.
2. **Pass 6** — death/victory shows a real summary, zones are named, two bosses exist, mini-map renders. *Acceptance:* you can describe your run from memory.
3. **Pass 7** — shards persist, Echo Tree spendable, shop/pass hidden until first run, no starter gems. *Acceptance:* dying advances something; first city visit shows no monetization.

## Out of scope (for now)

Real multiplayer auction, audio, companions/party, true async leaderboard backend. We'll revisit after Pass 7 lands.
