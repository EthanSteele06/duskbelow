## Dusk Below — Pass 3: Gear, Talent Trees, and Monetization Foundation

A 3/5 scope pass: adds two deep WoW-style systems (talent trees per spec, full gear with rarity) and the foundation for a hybrid sub + cosmetic-shop revenue model. Multiplayer Auction House and real accounts are intentionally deferred to a later pass.

---

### 1. Talent Trees per Spec

Each class gets **3 specs**, each spec a **branching talent tree** (~7 nodes, tiered).

- Warrior: Arms / Fury / Protection
- Rogue: Assassination / Outlaw / Subtlety
- Mage: Frost / Fire / Arcane
- Priest: Discipline / Holy / Shadow

Mechanics:
- Pick a spec at Lv 3 (free), can re-spec in city for gold.
- Earn 1 talent point per level from 3-10 (8 points total).
- Tree shape: Tier 1 (1 node) → Tier 2 (2 nodes, pick 1) → Tier 3 (2 nodes) → Tier 4 (1 capstone, requires 5 spent).
- Node effects: stat boosts, ability modifiers (e.g. "Shield Wall also heals 8"), passive procs ("20% chance on hit to gain 5 ATK for 2 turns"), and ability unlocks.
- Trainer screen rebuilt as a visual tree (nodes + connecting lines, tier rows).

### 2. Gear & Equipment

Replace the flat `atk += weapon.atk` system with proper slots and rarity.

Slots: **Head, Chest, Legs, Weapon, Off-hand, Trinket** (6 slots).

Rarity tiers (color-coded, WoW style):
- Common (gray), Uncommon (green), Rare (blue), Epic (purple), Legendary (orange).

Each item has: slot, rarity, item level (1-15), stat block (HP / ATK / MAG / crit / dodge), optional set bonus tag, optional proc.

Drops:
- Enemies drop loot based on depth & rarity table (deeper = better odds).
- Boss at floor 10 guarantees Rare+, with small chance of Epic/Legendary.
- Loot pop-up on victory shows rarity color, stat compare ("+3 ATK, -1 HP vs equipped").

Inventory & equip screen:
- New `EquipmentScreen.tsx` in city — paper-doll view with 6 slot squares around the character portrait, scrollable bag list below, tap-to-equip with confirm-replace.
- Stat bar updates to show derived totals.

Vendor tie-in: Blacksmithing/Tailoring/Leatherworking recipes now produce real gear (not just consumables/gold).

### 3. Monetization Foundation (Hybrid: Sub + Cosmetic Shop)

Build the **UI shell and local-state version** of both systems so they're visible and testable. Real payments are wired in a later pass once Lovable Cloud + Pro plan are enabled.

**Champion's Pass (subscription preview):**
- New `ChampionPassScreen.tsx` accessed from city.
- Perks displayed: +50% XP, +2 daily quest slots, +10 AH listing slots (future), exclusive monthly mount, larger bag (40 → 80 slots).
- "Subscribe" button shows a coming-soon modal explaining payments will be live at launch.
- A dev toggle (`isChampion` in store) lets you flip the perks on to test the XP boost and bag size now.

**Cosmetic Shop:**
- New `ShopScreen.tsx` — grid of cosmetic items: mount skins, character portraits, weapon glows, name-plate frames.
- Items have a "gem" price (premium currency).
- Player gets 50 free gems on first launch to test purchase flow.
- Owned cosmetics save to store, equipped from a new "Collections" tab.
- 6-8 placeholder cosmetic art assets (pixel mount silhouettes, glowing weapon overlays).

**Why this order:** building the UI now lets you validate the model and lock in art style. When you're ready to charge real money, we plug in Lovable's built-in Stripe payments (requires Pro plan + Lovable Cloud) and replace the gem-grant with a gem-pack purchase flow.

### 4. Mobile-first polish

- Larger touch targets on combat buttons (min 56px).
- Bottom-anchored action bar in dungeon for thumb reach.
- Haptic feedback on attack/crit (navigator.vibrate).
- Portrait-lock CSS and safe-area insets for notches.
- Add to-home-screen PWA manifest + icon so it installs like an app.

### 5. Out of scope this pass (next passes)

- Real Auction House (needs Lovable Cloud + auth — separate pass).
- Real Stripe payments (needs Pro plan + Cloud — separate pass).
- Guilds, raids, PvP, mounts as rideable entities, daily/weekly resets.
- Reputation grinds, achievements.

---

### Technical details

- `src/game/data.ts`: add `SPECS`, `TALENT_TREES`, `GEAR_POOL` (template items by tier/slot), rarity tables per dungeon depth, `COSMETICS`, `CHAMPION_PERKS`.
- `src/game/store.ts`: add `specId`, `talents: string[]`, `talentPoints`, `equipment: Record<Slot, Item|null>`, `bag: Item[]`, `gems`, `isChampion`, `ownedCosmetics`, `equippedCosmetics`. New actions: `pickSpec`, `learnTalent`, `respec`, `equip`, `unequip`, `rollLoot(depth)`, `buyGems` (stub), `buyCosmetic`, `toggleChampion` (dev).
- New screens: `TalentTreeScreen.tsx` (replaces TrainerScreen tree UI), `EquipmentScreen.tsx`, `ShopScreen.tsx`, `ChampionPassScreen.tsx`.
- `DungeonScreen.tsx`: update Victory overlay to show loot with rarity colors + equip/discard buttons; recompute enemy ATK to account for new player stats.
- `CityScreen.tsx`: add tiles for Equipment, Shop, Champion's Pass; surface "★ NEW" badges when unspent talents or unopened loot exist.
- Art: generate ~12 pixel assets — paper-doll background, 5 gear-slot icons, 6 cosmetic items (3 mounts + 3 weapon glows), Champion's Pass banner.
- All colors via design tokens in `src/styles.css` (add rarity tokens: `--rarity-uncommon`, `--rarity-rare`, `--rarity-epic`, `--rarity-legendary`).
