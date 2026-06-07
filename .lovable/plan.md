## Pass 4: Make Cosmetics Actually Visible

Right now cosmetics are invisible purchases. This pass adds a persistent **Character Header** that shows the player everywhere, then retrofits the shop so every cosmetic slot maps to something on screen.

### 1. Character Header (the foundation)

A compact bar pinned to the top of City, Dungeon, Equipment, Talents, Quests, Profession, Trainer, and Shop screens:

```text
┌──────────────────────────────────────────┐
│ [🐾]  ╔═══╗  Kaelen, the Ashbringer      │
│       ║ ◉ ║  Warrior · Arms · Lv 7       │
│       ╚═══╝  ████████░░  HP 84/100       │
└──────────────────────────────────────────┘
```

- `╔═══╗` = **nameplate frame** (cosmetic, animated border SVG/CSS)
- `◉` = **class portrait** with optional **portrait border** (cosmetic ring/glow)
- `the Ashbringer` = **title** (cosmetic text suffix)
- `🐾` = equipped **pet sprite** (cosmetic, idle bobbing animation)

New component: `src/game/CharacterHeader.tsx`. Mounted via `src/routes/index.tsx` so every screen gets it for free.

### 2. Combat FX (visible every fight)

In `DungeonScreen.tsx`:
- **Weapon glow** cosmetic → colored aura behind ability buttons + colored tint on the player's damage numbers
- **Damage number skin** cosmetic → swaps the font/color/animation of floating damage text (default white, plus: Golden Crit, Hellfire, Frostbite, Arcane Sparks)
- Floating damage numbers are added (they don't exist yet) using a small `<FloatingNumber>` component with `animate-fade-in` + translate-Y

### 3. Pets

- Idle pet sprite in the left slot of the Character Header
- 3 starter pets in shop: Shadow Imp, Frost Whelp, Spectral Owl
- Pure cosmetic — no combat effect

### 4. Shop rework (`ShopScreen.tsx`)

Replace current mount-heavy catalog with 4 tabs that match what's actually visible:
- **Titles** (text) — "the Ashbringer", "Dungeon Delver", "Voidtouched"
- **Portrait Borders** (animated CSS rings) — Gold Trim, Demonic, Frostbound, Arcane
- **Nameplate Frames** (SVG borders) — Iron, Runed, Bone, Celestial
- **Weapon Glows + Damage Skins** (combat FX) — paired packs
- **Pets** — 3 sprites

Each item shows a live preview of the header with the cosmetic applied before purchase.

### 5. Collections / equip flow

New `CollectionsScreen.tsx` (or a tab in Shop): grid of owned cosmetics per category with one "Equipped" slot per category. Click to equip/swap. Live preview of the header at top.

### 6. Mounts: deferred (with a note)

Since there's no world/travel screen, true mount visuals don't fit yet. Existing mount cosmetics will be **converted to portrait borders/titles** in the data migration, and the Shop will no longer sell mounts. A "Coming soon: Mounts" placeholder card explains they'll unlock when a travel/world-map system ships.

### Technical Changes

- **New files**:
  - `src/game/CharacterHeader.tsx` — persistent top bar
  - `src/game/FloatingNumber.tsx` — damage number with skin variants
  - `src/game/CollectionsScreen.tsx` — equip owned cosmetics
  - `src/game/cosmetics.ts` — typed catalog (titles, borders, frames, glows, dmg skins, pets) + helpers `getEquippedCosmetic(category)`
- **Edited**:
  - `src/game/store.ts` — replace `ownedCosmetics: string[]` / `equippedCosmetics` with `{ title, portraitBorder, nameplateFrame, weaponGlow, damageSkin, pet }`; migration drops mount entries; actions `equipCosmetic(category, id)`, `unequipCosmetic(category)`
  - `src/game/data.ts` — remove mount cosmetics from `COSMETICS`; add new categories
  - `src/game/ShopScreen.tsx` — tabbed catalog, live header preview, "Mounts coming soon" card
  - `src/game/DungeonScreen.tsx` — render `<FloatingNumber>` on hits; ability buttons read weapon-glow color
  - `src/routes/index.tsx` — mount `<CharacterHeader />` above the active screen (except Title/Intro)
  - `src/game/CityScreen.tsx` — add "Collections" tile next to Shop
  - `src/styles.css` — keyframes for portrait-border glow rotation, damage-number rise, pet idle bob; CSS variables `--glow-weapon`, `--dmg-skin-color`
- **Art** (pixel art, ~6 small sprites + a few SVGs):
  - 3 pet sprites (`pet-imp.png`, `pet-whelp.png`, `pet-owl.png`) — transparent PNGs
  - 4 class portrait icons (square 256×256) if not already present; otherwise reuse class images cropped
  - Nameplate frame SVGs authored inline as React components (no asset upload)

### Out of scope
- Real mount visuals / travel screen
- Full standing avatar / paper-doll character
- Animated portrait (static + CSS effects only)
- Emotes, dungeon-entry banners (can come next pass)

### Acceptance
- Header visible on all gameplay screens, shows class portrait + name + title + HP + pet
- Equipping any cosmetic in Collections changes the header live
- Combat shows floating damage numbers styled by the equipped damage skin
- Shop sells only categories that are actually visible somewhere
