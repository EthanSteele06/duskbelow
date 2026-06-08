import warriorImg from "@/assets/class-warrior.jpg";
import rogueImg from "@/assets/class-rogue.jpg";
import mageImg from "@/assets/class-mage.jpg";
import priestImg from "@/assets/class-priest.jpg";
import druidImg from "@/assets/class-druid.jpg";
import deathKnightImg from "@/assets/class-deathknight.jpg";
import alliesSigil from "@/assets/faction-allies.png";
import brigadeSigil from "@/assets/faction-brigade.png";
import skeletonImg from "@/assets/enemy-skeleton.jpg";
import ratImg from "@/assets/enemy-rat.jpg";
import wraithImg from "@/assets/enemy-wraith.jpg";
import ogreImg from "@/assets/enemy-ogre.jpg";
import cultistImg from "@/assets/enemy-cultist.jpg";
import dragonImg from "@/assets/enemy-dragon.jpg";
import trainerWarriorImg from "@/assets/trainer-warrior.jpg";
import trainerRogueImg from "@/assets/trainer-rogue.jpg";
import trainerMageImg from "@/assets/trainer-mage.jpg";
import trainerPriestImg from "@/assets/trainer-priest.jpg";
import trainerDruidImg from "@/assets/trainer-druid.jpg";
import trainerDeathKnightImg from "@/assets/trainer-deathknight.jpg";

export type ClassId = "warrior" | "rogue" | "mage" | "priest" | "druid" | "deathknight";
export type FactionId = "allies" | "brigade";

export interface ClassDef {
  id: ClassId;
  name: string;
  tagline: string;
  hp: number;
  atk: number;
  mag: number;
  portrait: string;
  color: string;
  /** Premium class — gated behind the Cobalt Vault (paywall). */
  premium?: boolean;
  /** Gem price for premium classes. */
  gemPrice?: number;
}

export const CLASSES: ClassDef[] = [
  { id: "warrior", name: "Warrior", tagline: "Steel and fury.", hp: 40, atk: 9, mag: 1, portrait: warriorImg, color: "var(--color-ember)" },
  { id: "rogue",   name: "Rogue",   tagline: "Strike from shadow.", hp: 28, atk: 7, mag: 3, portrait: rogueImg, color: "oklch(0.7 0.18 150)" },
  { id: "mage",    name: "Mage",    tagline: "Bend the arcane.", hp: 22, atk: 3, mag: 10, portrait: mageImg, color: "var(--color-arcane)" },
  { id: "priest",  name: "Priest",  tagline: "Light against the dark.", hp: 32, atk: 5, mag: 7, portrait: priestImg, color: "var(--color-divine)" },
  { id: "druid",       name: "Druid",        tagline: "Of root and tooth.",        hp: 30, atk: 5, mag: 8, portrait: druidImg,       color: "oklch(0.65 0.17 145)", premium: true, gemPrice: 300 },
  { id: "deathknight", name: "Death Knight", tagline: "Frost in the marrow.",      hp: 38, atk: 8, mag: 4, portrait: deathKnightImg, color: "oklch(0.6 0.18 230)",  premium: true, gemPrice: 300 },
];

export interface FactionPassive {
  maxHp?: number;
  atk?: number;
  mag?: number;
  crit?: number;
  dodge?: number;
}

export interface FactionRacial {
  id: string;
  name: string;
  desc: string;
  kind: "heal_pct" | "buff_dmg";
  /** for heal_pct: fraction of maxHp; for buff_dmg: damage multiplier next attack */
  amount: number;
  flavor: string;
}

export interface FactionDef {
  id: FactionId;
  name: string;
  motto: string;
  sigil: string;
  color: string;
  passives: FactionPassive;
  passiveLabel: string;
  racial: FactionRacial;
}

export const FACTIONS: FactionDef[] = [
  {
    id: "allies", name: "Kingdom of Allies", motto: "Bound by oath. Forged in light.", sigil: alliesSigil, color: "var(--color-allies)",
    passives: { maxHp: 6, dodge: 2 },
    passiveLabel: "Bulwark Oath — +6 Max HP, +2% dodge.",
    racial: { id: "rally", name: "Rally", kind: "heal_pct", amount: 0.25, desc: "Heal 25% Max HP. Once per run.", flavor: "{p} rallies — light blooms in their chest" },
  },
  {
    id: "brigade", name: "Endless Brigade", motto: "We march. We do not stop.", sigil: brigadeSigil, color: "var(--color-brigade)",
    passives: { atk: 1, crit: 3 },
    passiveLabel: "Bloodlust — +1 ATK, +3% crit.",
    racial: { id: "frenzy", name: "Frenzy", kind: "buff_dmg", amount: 2.0, desc: "Next attack deals 2× damage. Once per run.", flavor: "{p} bares teeth — eyes go red" },
  },
];

// ── Abilities ────────────────────────────────────────────────────────────────

export type StatusEffectKind = "burn" | "bleed" | "chill" | "renew";

export interface StatusEffect {
  kind: StatusEffectKind;
  turns: number;
  /** dmg/heal per tick; for chill this stores the damage-taken multiplier */
  power: number;
}

export type AbilityEffect =
  | { kind: "attack"; mult: number; useMag?: boolean; flavor: string; applyStatus?: { kind: StatusEffectKind; turns: number; power: number }; lifesteal?: number }
  | { kind: "heal"; amount: number; flavor: string }
  | { kind: "hot"; healPerTurn: number; turns: number; flavor: string }
  | { kind: "flee"; flavor: string }
  | { kind: "stun"; flavor: string }
  | { kind: "shield"; reduce: number; flavor: string };

export interface Ability {
  id: string;
  name: string;
  desc: string;
  cooldown: number;
  effect: AbilityEffect;
}

export const CLASS_ABILITIES: Record<ClassId, Ability[]> = {
  warrior: [
    { id: "strike", name: "Strike",      desc: "A clean swing. ATK damage.",                        cooldown: 0, effect: { kind: "attack", mult: 1.0, flavor: "{p} strikes with their blade" } },
    { id: "cleave", name: "Cleave",      desc: "Heavy two-hander. 1.6× ATK, applies Bleed (3t).",   cooldown: 2, effect: { kind: "attack", mult: 1.6, flavor: "{p} swings a wide cleave", applyStatus: { kind: "bleed", turns: 3, power: 3 } } },
    { id: "wall",   name: "Shield Wall", desc: "Brace. Cut next hit by 70%.",                       cooldown: 3, effect: { kind: "shield", reduce: 0.7, flavor: "{p} raises a shield wall" } },
  ],
  rogue: [
    { id: "slash",      name: "Slash",      desc: "Twin daggers. ATK damage.",                      cooldown: 0, effect: { kind: "attack", mult: 1.0, flavor: "{p} slashes with twin daggers" } },
    { id: "eviscerate", name: "Eviscerate", desc: "Vicious cut. 1.8× ATK + Bleed (4t).",            cooldown: 2, effect: { kind: "attack", mult: 1.8, flavor: "{p} carves a deep wound", applyStatus: { kind: "bleed", turns: 4, power: 4 } } },
    { id: "backstab",   name: "Backstab",   desc: "Surgical kill. 2.5× ATK.",                       cooldown: 4, effect: { kind: "attack", mult: 2.5, flavor: "{p} drives a dagger through a weak point" } },
  ],
  mage: [
    { id: "frostbolt", name: "Frostbolt",  desc: "1.0× MAG + Chill (foe takes +30% dmg, 2t).",      cooldown: 0, effect: { kind: "attack", mult: 1.0, useMag: true, flavor: "{p} hurls a frostbolt", applyStatus: { kind: "chill", turns: 2, power: 1.3 } } },
    { id: "fireball",  name: "Fireball",   desc: "1.5× MAG + Burn (3t).",                           cooldown: 2, effect: { kind: "attack", mult: 1.5, useMag: true, flavor: "{p} casts a roaring fireball", applyStatus: { kind: "burn", turns: 3, power: 5 } } },
    { id: "nova",      name: "Frost Nova", desc: "Freeze the foe. Skip its turn.",                  cooldown: 3, effect: { kind: "stun", flavor: "{p} unleashes a frost nova" } },
  ],
  priest: [
    { id: "smite", name: "Smite",             desc: "Holy MAG damage.",                              cooldown: 0, effect: { kind: "attack", mult: 1.0, useMag: true, flavor: "{p} smites with holy light" } },
    { id: "swp",   name: "Shadow Word: Pain", desc: "1.2× MAG + DoT (4t).",                          cooldown: 2, effect: { kind: "attack", mult: 1.2, useMag: true, flavor: "{p} whispers a word of agony", applyStatus: { kind: "burn", turns: 4, power: 4 } } },
    { id: "renew", name: "Renew",             desc: "Heal over time — MAG/turn for 4 turns.",        cooldown: 3, effect: { kind: "hot", healPerTurn: 0, turns: 4, flavor: "{p} weaves a renewing prayer" } },
  ],
  druid: [
    { id: "wrath",     name: "Wrath",         desc: "Nature MAG damage.",                            cooldown: 0, effect: { kind: "attack", mult: 1.0, useMag: true, flavor: "{p} hurls a bolt of wrath" } },
    { id: "moonfire",  name: "Moonfire",      desc: "1.2× MAG + Burn (3t).",                         cooldown: 2, effect: { kind: "attack", mult: 1.2, useMag: true, flavor: "{p} sears the foe with moonfire", applyStatus: { kind: "burn", turns: 3, power: 4 } } },
    { id: "rejuv",     name: "Rejuvenation",  desc: "Heal over time — MAG/turn for 4 turns.",        cooldown: 3, effect: { kind: "hot", healPerTurn: 0, turns: 4, flavor: "{p} weaves vines of renewal" } },
  ],
  deathknight: [
    { id: "deathstrike", name: "Death Strike", desc: "1.3× ATK + heal for 30% damage dealt.",        cooldown: 0, effect: { kind: "attack", mult: 1.3, flavor: "{p} drives a runeblade through the foe", lifesteal: 0.30 } },
    { id: "froststrike", name: "Frost Strike", desc: "1.0× ATK + Chill (foe takes +30% dmg, 2t).",   cooldown: 2, effect: { kind: "attack", mult: 1.0, flavor: "{p} buries a frost-rimed blade", applyStatus: { kind: "chill", turns: 2, power: 1.3 } } },
    { id: "bloodboil",   name: "Blood Boil",   desc: "1.7× ATK + Bleed (4t).",                       cooldown: 3, effect: { kind: "attack", mult: 1.7, flavor: "{p} boils the foe's blood", applyStatus: { kind: "bleed", turns: 4, power: 5 } } },
  ],
};

// ── Enemies ──────────────────────────────────────────────────────────────────

export interface EnemyIntent {
  id: string;
  /** UI label shown above the enemy ("⚔ Bite", "🔥 Hellfire") */
  label: string;
  /** damage multiplier on enemy.atkBase */
  mult: number;
  /** narration line; supports {n} (name) and {d} (damage) */
  line: string;
  /** if true, telegraphed — the enemy WILL use this next turn (shown before player acts) */
  telegraphable?: boolean;
}

export interface EnemyDef {
  id: string;
  name: string;
  image: string;
  hpBase: number;
  atkBase: number;
  questItemId?: string;
  materialDrop?: { id: string; chance: number };
  attackLines: string[];
  intents: EnemyIntent[];
}

export const ENEMIES: Record<string, EnemyDef> = {
  rat: {
    id: "rat", name: "Plague Rat", image: ratImg,
    hpBase: 8, atkBase: 2, questItemId: "rat_tail",
    materialDrop: { id: "rough_pelt", chance: 0.5 },
    attackLines: ["The {n} lunges and bites for {d}!", "The {n} claws at your shins for {d}!", "Mangy teeth tear in for {d}!"],
    intents: [
      { id: "bite", label: "🦷 Bite", mult: 1.0, line: "The {n} lunges and bites for {d}!" },
      { id: "claw", label: "🪓 Claw", mult: 0.8, line: "The {n} claws at your shins for {d}!" },
    ],
  },
  skeleton: {
    id: "skeleton", name: "Risen Skeleton", image: skeletonImg,
    hpBase: 14, atkBase: 4,
    materialDrop: { id: "bone_dust", chance: 0.55 },
    attackLines: ["The {n} swings a rusted sword for {d}!"],
    intents: [
      { id: "swing", label: "⚔ Rusted Swing", mult: 1.0, line: "The {n} swings a rusted sword for {d}!" },
      { id: "lunge", label: "🩸 Lunge", mult: 1.5, line: "{n} winds up — a brutal lunge for {d}!", telegraphable: true },
    ],
  },
  cultist: {
    id: "cultist", name: "Robed Cultist", image: cultistImg,
    hpBase: 20, atkBase: 6, questItemId: "cult_mask",
    materialDrop: { id: "dark_thread", chance: 0.5 },
    attackLines: ["The {n} chants and slashes for {d}!"],
    intents: [
      { id: "stab",     label: "🗡 Stab",     mult: 1.0, line: "A jagged dagger bites for {d}!" },
      { id: "hellfire", label: "🔥 Hellfire", mult: 1.8, line: "Hellfire roars from the {n} for {d}!", telegraphable: true },
    ],
  },
  wraith: {
    id: "wraith", name: "Wailing Wraith", image: wraithImg,
    hpBase: 26, atkBase: 7,
    materialDrop: { id: "ghost_essence", chance: 0.4 },
    attackLines: ["The {n} drains your soul for {d}!"],
    intents: [
      { id: "drain", label: "👻 Soul Drain",  mult: 1.0, line: "The {n} drains your soul for {d}!" },
      { id: "wail",  label: "🌀 Wail",        mult: 1.6, line: "A spectral wail crushes you for {d}!", telegraphable: true },
    ],
  },
  ogre: {
    id: "ogre", name: "Ogre Brute", image: ogreImg,
    hpBase: 38, atkBase: 9,
    materialDrop: { id: "iron_scrap", chance: 0.6 },
    attackLines: ["The {n} smashes a club down for {d}!"],
    intents: [
      { id: "club",  label: "🪵 Club",   mult: 1.0, line: "The {n} smashes a club down for {d}!" },
      { id: "stomp", label: "👣 Stomp",  mult: 1.7, line: "{n} stomps the floor for {d}!", telegraphable: true },
    ],
  },
  dragon: {
    id: "dragon", name: "Black Dragon", image: dragonImg,
    hpBase: 80, atkBase: 12,
    materialDrop: { id: "dragon_scale", chance: 1.0 },
    attackLines: ["The {n} bites for {d}!"],
    intents: [
      { id: "bite",   label: "🐲 Bite",         mult: 1.0, line: "{n} bites with iron jaws for {d}!" },
      { id: "wing",   label: "🌪 Wing Sweep",  mult: 1.3, line: "A wing sweep crushes you for {d}!" },
      { id: "breath", label: "🔥 Dragon Breath",mult: 2.2, line: "The {n} breathes searing flame for {d}!", telegraphable: true },
    ],
  },
};

export function enemyForDepth(depth: number): EnemyDef {
  if (depth >= 10) return ENEMIES.dragon;
  const pool =
    depth <= 3 ? ["rat", "skeleton"] :
    depth <= 6 ? ["skeleton", "cultist", "wraith"] :
                 ["wraith", "ogre", "cultist"];
  return ENEMIES[pool[Math.floor(Math.random() * pool.length)]];
}

// ── Vendor / Auction ─────────────────────────────────────────────────────────

export interface VendorItem {
  id: string;
  name: string;
  desc: string;
  price: number;
  kind: "weapon" | "potion" | "trinket" | "consumable";
  atk?: number;
  heal?: number;
  /** if set, sold in the Cobalt Vault for gems instead of gold */
  gemPrice?: number;
  /** consumable effect identifier */
  effect?: "hearthstone" | "phoenix";
}

export const VENDOR_ITEMS: VendorItem[] = [
  { id: "p1", name: "Lesser Healing Draught", desc: "Restores 15 HP.", price: 12, kind: "potion", heal: 15 },
  { id: "p2", name: "Greater Healing Draught", desc: "Restores 35 HP.", price: 30, kind: "potion", heal: 35 },
  { id: "w1", name: "Ironbite Blade", desc: "+2 ATK.", price: 45, kind: "weapon", atk: 2 },
  { id: "w2", name: "Runed Cleaver", desc: "+4 ATK.", price: 110, kind: "weapon", atk: 4 },
  { id: "t1", name: "Ember Charm", desc: "Pulses with dungeon heat.", price: 25, kind: "trinket" },
  // Premium revive consumables — sold for gems in the Cobalt Vault.
  { id: "hearth",  name: "Hearthstone Charm", desc: "Bail out of the dungeon at any moment. Keeps your run rewards. One use.", price: 0, gemPrice: 75,  kind: "consumable", effect: "hearthstone" },
  { id: "phoenix", name: "Phoenix Feather",   desc: "On lethal damage, revives at 50% HP. Auto-trigger. One use.",            price: 0, gemPrice: 150, kind: "consumable", effect: "phoenix" },
];

export interface AuctionListing {
  id: string;
  name: string;
  seller: string;
  bid: number;
  rarity: "common" | "rare" | "epic";
}

export const AUCTION_LISTINGS: AuctionListing[] = [
  { id: "a1", name: "Skullsplitter Maul", seller: "Grok the Pale", bid: 240, rarity: "rare" },
  { id: "a2", name: "Cowl of Whispers", seller: "Vex", bid: 180, rarity: "rare" },
  { id: "a3", name: "Phylactery of Dusk", seller: "Lady Maren", bid: 920, rarity: "epic" },
  { id: "a4", name: "Salted Boot", seller: "Anonymous", bid: 3, rarity: "common" },
  { id: "a5", name: "Crown of the Brigade", seller: "Warlord Kael", bid: 1500, rarity: "epic" },
];

// ── Chest loot table ─────────────────────────────────────────────────────────

export interface ChestPreview {
  goldRange: [number, number];
  xpRange: [number, number];
  questItemId?: string;
  materialId?: string;
  recipeId?: string;
  label: string;
}

export function rollChest(depth: number): ChestPreview {
  const labels = ["A reinforced iron chest", "A small wooden coffer", "A rune-etched strongbox", "A dusty chest, faintly humming"];
  const r = Math.random();
  const drop = r < 0.3 ? "sealed_scroll" : undefined;
  const matRoll = Math.random();
  const matId =
    matRoll < 0.25 ? "arcane_dust" :
    matRoll < 0.45 ? "linen_scrap" :
    matRoll < 0.6  ? "herb_bundle" : undefined;
  const recipeRoll = Math.random();
  const recipeId = recipeRoll < 0.08 ? "recipe_minor_potion" : undefined;
  return {
    goldRange: [5 + depth * 4, 12 + depth * 8],
    xpRange: [4 + depth * 2, 8 + depth * 4],
    questItemId: drop,
    materialId: matId,
    recipeId,
    label: labels[Math.floor(Math.random() * labels.length)],
  };
}

// ── Quests ───────────────────────────────────────────────────────────────────

export interface QuestDef {
  id: string;
  name: string;
  desc: string;
  target: { itemId: string; count: number; label: string };
  rewardGold: number;
  rewardXp: number;
  classId?: ClassId; // class-only quest
}

export const QUESTS: QuestDef[] = [
  { id: "q1", name: "Pest Control",      desc: "The smith hates rats. Bring proof.",                       target: { itemId: "rat_tail",     count: 3, label: "Rat Tail" },     rewardGold: 40,  rewardXp: 25 },
  { id: "q2", name: "Forbidden Pages",   desc: "A scribe pays well for sealed scrolls from the deep.",     target: { itemId: "sealed_scroll",count: 2, label: "Sealed Scroll" },rewardGold: 80,  rewardXp: 40 },
  { id: "q3", name: "Unmasked",          desc: "Bring back masks worn by the cultists below.",             target: { itemId: "cult_mask",    count: 2, label: "Cultist Mask" }, rewardGold: 140, rewardXp: 70 },

  // class-specific
  { id: "cq_warrior", name: "Trial of Bone",  desc: "Trainer demands skeleton remains as proof of grit.",  target: { itemId: "bone_dust",   count: 3, label: "Bone Dust" },    rewardGold: 60, rewardXp: 60, classId: "warrior" },
  { id: "cq_rogue",   name: "Silken Threads", desc: "Cut thread from cultist robes, unseen.",              target: { itemId: "dark_thread", count: 3, label: "Dark Thread" },  rewardGold: 60, rewardXp: 60, classId: "rogue" },
  { id: "cq_mage",    name: "Arcane Pulse",   desc: "Gather arcane dust from chests for study.",           target: { itemId: "arcane_dust", count: 3, label: "Arcane Dust" },  rewardGold: 60, rewardXp: 60, classId: "mage" },
  { id: "cq_priest",  name: "Restless Souls", desc: "Bring wraith essence to be put to rest.",             target: { itemId: "ghost_essence",count: 2,label: "Ghost Essence" },rewardGold: 60, rewardXp: 60, classId: "priest" },
];

// ── Intro flavor text ────────────────────────────────────────────────────────

const FACTION_INTRO: Record<FactionId, string> = {
  allies:  "The Kingdom of Allies has bled for a hundred years to keep the dark sealed below. Tonight, the seals are cracking. They need someone willing to walk down.",
  brigade: "The Endless Brigade does not ask why the dark stirs. It only marches. Conscript or volunteer, the road is the same — and it ends underground.",
};

const CLASS_INTRO: Record<ClassId, string> = {
  warrior: "You were trained on the wall. Steel is honest. The dungeon will be neither.",
  rogue:   "You learned the trade in alleys nobody named. The dark below is just another room with thinner walls.",
  mage:    "The colleges burned. You took what you could carry — a staff, a name, and an appetite for ruin.",
  priest:  "Your god is quiet, lately. You suspect they are waiting to see what you do down there.",
  druid:   "The grove remembers what cities forget. You carry a piece of it down into the stone.",
  deathknight: "You died once. The cold did not keep you. Something colder gave you a sword and pointed.",
};

export function buildIntro(faction: FactionId, classId: ClassId, name: string): string[] {
  return [
    FACTION_INTRO[faction],
    CLASS_INTRO[classId],
    `They call you ${name}. The gate is open. Descend.`,
  ];
}

// ── Trainers & Skill Trees ───────────────────────────────────────────────────

export type SkillEffect =
  | { kind: "stat"; atk?: number; mag?: number; maxHp?: number }
  | { kind: "starting_potion" };

export interface SkillNode {
  id: string;
  name: string;
  desc: string;
  cost: number;
  requires?: string;
  effect: SkillEffect;
}

export interface TrainerDef {
  classId: ClassId;
  name: string;
  title: string;
  portrait: string;
  greeting: string;
  skills: SkillNode[];
}

export const TRAINERS: Record<ClassId, TrainerDef> = {
  warrior: {
    classId: "warrior", name: "Captain Brask", title: "Warden of the Outer Wall", portrait: trainerWarriorImg,
    greeting: "You survived to three. That's farther than most. Show me what you'd spend a hard-earned point on.",
    skills: [
      { id: "w_iron",   name: "Iron Skin",       desc: "+8 Max HP.",                cost: 1, effect: { kind: "stat", maxHp: 8 } },
      { id: "w_edge",   name: "Whetted Edge",    desc: "+2 ATK.",                   cost: 1, effect: { kind: "stat", atk: 2 } },
      { id: "w_legend", name: "Legend of the Wall", desc: "+12 Max HP, +1 ATK.",   cost: 2, requires: "w_iron", effect: { kind: "stat", maxHp: 12, atk: 1 } },
    ],
  },
  rogue: {
    classId: "rogue", name: "Vesh", title: "Of the Crooked Lantern", portrait: trainerRogueImg,
    greeting: "You're still breathing. Surprising. Pick a knack — I won't show twice.",
    skills: [
      { id: "r_swift",  name: "Swift Hands",     desc: "+3 ATK.",                   cost: 1, effect: { kind: "stat", atk: 3 } },
      { id: "r_wit",    name: "Sharp Wit",       desc: "+1 MAG.",                   cost: 1, effect: { kind: "stat", mag: 1 } },
      { id: "r_silent", name: "Silent Step",     desc: "+5 Max HP, +2 ATK.",        cost: 2, requires: "r_swift", effect: { kind: "stat", maxHp: 5, atk: 2 } },
    ],
  },
  mage: {
    classId: "mage", name: "Archivist Hael", title: "Last of the Glass Tower", portrait: trainerMageImg,
    greeting: "The page turns. You've earned a sigil. Choose carefully — ink is finite.",
    skills: [
      { id: "m_focus",  name: "Arcane Focus",    desc: "+3 MAG.",                   cost: 1, effect: { kind: "stat", mag: 3 } },
      { id: "m_wards",  name: "Lesser Wards",    desc: "+6 Max HP.",                cost: 1, effect: { kind: "stat", maxHp: 6 } },
      { id: "m_storm",  name: "Storm Etching",   desc: "+4 MAG, +1 ATK.",           cost: 2, requires: "m_focus", effect: { kind: "stat", mag: 4, atk: 1 } },
    ],
  },
  priest: {
    classId: "priest", name: "Sister Vola", title: "Keeper of the Quiet Light", portrait: trainerPriestImg,
    greeting: "Light kept you walking. Choose what you'll carry of it.",
    skills: [
      { id: "p_grace",  name: "Grace",           desc: "+2 MAG.",                   cost: 1, effect: { kind: "stat", mag: 2 } },
      { id: "p_vigor",  name: "Vigor",           desc: "+6 Max HP, +1 ATK.",        cost: 1, effect: { kind: "stat", maxHp: 6, atk: 1 } },
      { id: "p_radiant",name: "Radiant Conduit", desc: "+3 MAG, +6 Max HP.",        cost: 2, requires: "p_grace", effect: { kind: "stat", mag: 3, maxHp: 6 } },
    ],
  },
};

// ── Professions ──────────────────────────────────────────────────────────────

export type ProfessionId = "enchanting" | "tailoring" | "blacksmithing" | "alchemy";

export interface ProfessionDef {
  id: ProfessionId;
  name: string;
  desc: string;
  icon: string;
}

export const PROFESSIONS: ProfessionDef[] = [
  { id: "enchanting",    name: "Enchanting",    desc: "Bind arcane dust into charms.",      icon: "✦" },
  { id: "tailoring",     name: "Tailoring",     desc: "Stitch cloth and thread into wear.", icon: "✂" },
  { id: "blacksmithing", name: "Blacksmithing", desc: "Forge scrap and bone into edges.",   icon: "⚒" },
  { id: "alchemy",       name: "Alchemy",       desc: "Brew herbs and essences into vials.",icon: "⚗" },
];

export interface MaterialDef {
  id: string;
  name: string;
  sellPrice: number;
}

export const MATERIALS: Record<string, MaterialDef> = {
  rough_pelt:    { id: "rough_pelt",    name: "Rough Pelt",    sellPrice: 4 },
  bone_dust:     { id: "bone_dust",     name: "Bone Dust",     sellPrice: 5 },
  dark_thread:   { id: "dark_thread",   name: "Dark Thread",   sellPrice: 7 },
  ghost_essence: { id: "ghost_essence", name: "Ghost Essence", sellPrice: 12 },
  iron_scrap:    { id: "iron_scrap",    name: "Iron Scrap",    sellPrice: 10 },
  dragon_scale:  { id: "dragon_scale",  name: "Dragon Scale",  sellPrice: 80 },
  arcane_dust:   { id: "arcane_dust",   name: "Arcane Dust",   sellPrice: 8 },
  linen_scrap:   { id: "linen_scrap",   name: "Linen Scrap",   sellPrice: 3 },
  herb_bundle:   { id: "herb_bundle",   name: "Herb Bundle",   sellPrice: 4 },
};

export interface RecipeDef {
  id: string;
  profession: ProfessionId;
  name: string;
  desc: string;
  levelReq: number;
  inputs: Record<string, number>; // materialId -> count
  output: { kind: "vendor"; itemId: string } | { kind: "sell"; gold: number };
  xp: number;
  buyPrice?: number; // if buyable from trainer; otherwise drop-only
}

export const RECIPES: RecipeDef[] = [
  // Alchemy
  { id: "recipe_minor_potion", profession: "alchemy",      name: "Brew Lesser Potion", desc: "Yields a Lesser Healing Draught.", levelReq: 1, inputs: { herb_bundle: 2 },                output: { kind: "vendor", itemId: "p1" }, xp: 15, buyPrice: 30 },
  { id: "recipe_greater_potion", profession: "alchemy",    name: "Brew Greater Potion", desc: "Yields a Greater Healing Draught.", levelReq: 3, inputs: { herb_bundle: 3, ghost_essence: 1 }, output: { kind: "vendor", itemId: "p2" }, xp: 35, buyPrice: 90 },
  // Blacksmithing
  { id: "recipe_ironbite",    profession: "blacksmithing", name: "Forge Ironbite Blade", desc: "Forge an Ironbite Blade (+2 ATK).", levelReq: 2, inputs: { iron_scrap: 3, bone_dust: 1 }, output: { kind: "vendor", itemId: "w1" }, xp: 30, buyPrice: 60 },
  { id: "recipe_scale_ingot", profession: "blacksmithing", name: "Smelt Scale Ingot",    desc: "A salable ingot.",                  levelReq: 1, inputs: { iron_scrap: 2 },                output: { kind: "sell", gold: 30 },        xp: 20 },
  // Tailoring
  { id: "recipe_dark_cowl",   profession: "tailoring",     name: "Stitch Dark Cowl",     desc: "A salable hood.",                   levelReq: 1, inputs: { dark_thread: 2, linen_scrap: 2 }, output: { kind: "sell", gold: 40 },      xp: 25 },
  { id: "recipe_pelt_wrap",   profession: "tailoring",     name: "Pelt Wrap",            desc: "A simple sellable wrap.",           levelReq: 1, inputs: { rough_pelt: 3 },                output: { kind: "sell", gold: 18 },        xp: 12 },
  // Enchanting
  { id: "recipe_dust_charm",  profession: "enchanting",    name: "Bind Dust Charm",      desc: "A glittering trinket.",             levelReq: 1, inputs: { arcane_dust: 3 },                output: { kind: "sell", gold: 35 },        xp: 22 },
  { id: "recipe_soul_focus",  profession: "enchanting",    name: "Soul Focus",           desc: "A reagent of value.",               levelReq: 3, inputs: { arcane_dust: 2, ghost_essence: 1 }, output: { kind: "sell", gold: 80 },     xp: 50, buyPrice: 60 },
];

export function profXpForLevel(level: number) {
  return 50 + level * 50;
}

// ── Specs & Talent Trees ─────────────────────────────────────────────────────

export interface SpecDef {
  id: string;
  classId: ClassId;
  name: string;
  tagline: string;
  color: string;
}

export const SPECS: SpecDef[] = [
  { id: "arms",          classId: "warrior", name: "Arms",          tagline: "Two-handed precision.",  color: "var(--color-ember)" },
  { id: "fury",          classId: "warrior", name: "Fury",          tagline: "Berserk dual strikes.",  color: "var(--color-blood)" },
  { id: "protection",    classId: "warrior", name: "Protection",    tagline: "Shield and survive.",    color: "var(--color-gold)" },
  { id: "assassination", classId: "rogue",   name: "Assassination", tagline: "Poisons and bleeds.",    color: "oklch(0.6 0.18 145)" },
  { id: "outlaw",        classId: "rogue",   name: "Outlaw",        tagline: "Reckless gambits.",      color: "var(--color-gold)" },
  { id: "subtlety",      classId: "rogue",   name: "Subtlety",      tagline: "Shadows and ambush.",    color: "var(--color-arcane)" },
  { id: "frost",         classId: "mage",    name: "Frost",         tagline: "Freeze and shatter.",    color: "var(--color-allies)" },
  { id: "fire",          classId: "mage",    name: "Fire",          tagline: "Burn everything.",       color: "var(--color-ember)" },
  { id: "arcane",        classId: "mage",    name: "Arcane",        tagline: "Pure raw mana.",         color: "var(--color-arcane)" },
  { id: "discipline",    classId: "priest",  name: "Discipline",    tagline: "Shield with light.",     color: "var(--color-divine)" },
  { id: "holy",          classId: "priest",  name: "Holy",          tagline: "Restoration mastery.",   color: "var(--color-gold)" },
  { id: "shadow",        classId: "priest",  name: "Shadow",        tagline: "Drain the living.",      color: "var(--color-arcane)" },
];

export interface TalentNode {
  id: string;
  name: string;
  desc: string;
  tier: 1 | 2 | 3 | 4;
  requires?: string;
  effect: { atk?: number; mag?: number; maxHp?: number; crit?: number; dodge?: number };
}

function tree(prefix: string, t: { atk?: number; mag?: number; maxHp?: number }): TalentNode[] {
  const a = t.atk ?? 0;
  const m = t.mag ?? 0;
  const h = t.maxHp ?? 0;
  return [
    { id: `${prefix}_1`,  name: "Foundation",  desc: `+${4+h} Max HP, +${1+Math.floor(a/2)} ATK.`, tier: 1, effect: { maxHp: 4+h, atk: 1+Math.floor(a/2) } },
    { id: `${prefix}_2a`, name: "Edge",        desc: `+${2+a} ATK.`,                                tier: 2, requires: `${prefix}_1`,  effect: { atk: 2+a } },
    { id: `${prefix}_2b`, name: "Mind",        desc: `+${2+m} MAG.`,                                tier: 2, requires: `${prefix}_1`,  effect: { mag: 2+m } },
    { id: `${prefix}_3a`, name: "Resilience",  desc: `+${8+h} Max HP, +3% dodge.`,                  tier: 3, requires: `${prefix}_2a`, effect: { maxHp: 8+h, dodge: 3 } },
    { id: `${prefix}_3b`, name: "Precision",   desc: "+8% crit chance.",                            tier: 3, requires: `${prefix}_2b`, effect: { crit: 8 } },
    { id: `${prefix}_4a`, name: "Capstone I",  desc: `+${5+a} ATK, +${5+h} Max HP.`,                tier: 4, requires: `${prefix}_3a`, effect: { atk: 5+a, maxHp: 5+h } },
    { id: `${prefix}_4b`, name: "Capstone II", desc: `+${4+m} MAG, +10% crit.`,                     tier: 4, requires: `${prefix}_3b`, effect: { mag: 4+m, crit: 10 } },
  ];
}

export const TALENT_TREES: Record<string, TalentNode[]> = {
  arms:          tree("arms",       { atk: 3 }),
  fury:          tree("fury",       { atk: 2, maxHp: 2 }),
  protection:    tree("protection", { maxHp: 6 }),
  assassination: tree("assassin",   { atk: 2, mag: 1 }),
  outlaw:        tree("outlaw",     { atk: 3 }),
  subtlety:      tree("subtle",     { atk: 2, mag: 2 }),
  frost:         tree("frost",      { mag: 3 }),
  fire:          tree("fire",       { mag: 4 }),
  arcane:        tree("arcane",     { mag: 3, maxHp: 2 }),
  discipline:    tree("disc",       { mag: 2, maxHp: 4 }),
  holy:          tree("holy",       { mag: 3, maxHp: 2 }),
  shadow:        tree("shadow",     { mag: 3, atk: 1 }),
};

// ── Gear / Equipment ─────────────────────────────────────────────────────────

export type GearSlot = "head" | "chest" | "legs" | "weapon" | "offhand" | "trinket";
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const SLOT_LABEL: Record<GearSlot, string> = {
  head: "Head", chest: "Chest", legs: "Legs",
  weapon: "Weapon", offhand: "Off-hand", trinket: "Trinket",
};

export const SLOT_ICON: Record<GearSlot, string> = {
  head: "◉", chest: "▩", legs: "║", weapon: "⚔", offhand: "⛨", trinket: "✦",
};

export const RARITY_RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary",
};
export const RARITY_CLASS: Record<Rarity, string> = {
  common: "text-rarity-common",
  uncommon: "text-rarity-uncommon",
  rare: "text-rarity-rare",
  epic: "text-rarity-epic",
  legendary: "text-rarity-legendary",
};

export interface GearItem {
  id: string;
  baseId: string;
  name: string;
  slot: GearSlot;
  rarity: Rarity;
  ilvl: number;
  stats: { atk?: number; mag?: number; maxHp?: number; crit?: number; dodge?: number };
}

interface GearTemplate {
  baseId: string;
  slot: GearSlot;
  names: Partial<Record<Rarity, string>>;
  focus: "atk" | "mag" | "hp" | "mixed";
}

export const GEAR_TEMPLATES: GearTemplate[] = [
  { baseId: "helm",    slot: "head",    focus: "hp",    names: { common: "Iron Cap",      uncommon: "Hardened Helm",  rare: "Wraithguard Helm",  epic: "Skullcrown of Dusk",       legendary: "Crown of the Dragon" } },
  { baseId: "circlet", slot: "head",    focus: "mag",   names: { common: "Patched Hood",  uncommon: "Runed Hood",     rare: "Arcane Circlet",    epic: "Diadem of Stars",          legendary: "Halo of the Voidcaller" } },
  { baseId: "plate",   slot: "chest",   focus: "hp",    names: { common: "Tattered Mail", uncommon: "Iron Cuirass",   rare: "Plate of the Wall", epic: "Bonecage Hauberk",         legendary: "Aegis of the Endless" } },
  { baseId: "robe",    slot: "chest",   focus: "mag",   names: { common: "Coarse Robe",   uncommon: "Embroidered Robe", rare: "Robe of Whispers", epic: "Vestment of the Glass Tower", legendary: "Mantle of the First Mage" } },
  { baseId: "greaves", slot: "legs",    focus: "mixed", names: { common: "Leather Pants", uncommon: "Iron Greaves",   rare: "Stoneward Greaves", epic: "Legguards of Dread",       legendary: "Striders of the Inferno" } },
  { baseId: "sword",   slot: "weapon",  focus: "atk",   names: { common: "Notched Sword", uncommon: "Iron Sword",     rare: "Bloodbite",         epic: "Dawnreaver",               legendary: "Doomsong" } },
  { baseId: "dagger",  slot: "weapon",  focus: "atk",   names: { common: "Rusty Dagger",  uncommon: "Twin Fang",      rare: "Nightveil",         epic: "Sliver of the Wraith",     legendary: "Heartrender" } },
  { baseId: "staff",   slot: "weapon",  focus: "mag",   names: { common: "Cracked Staff", uncommon: "Runed Staff",    rare: "Frostspire",        epic: "Staff of the Quiet Light", legendary: "World-Splitter" } },
  { baseId: "shield",  slot: "offhand", focus: "hp",    names: { common: "Wooden Buckler",uncommon: "Iron Bulwark",   rare: "Wardstone Shield",  epic: "Bastion of Ash",           legendary: "Aegis Eternal" } },
  { baseId: "tome",    slot: "offhand", focus: "mag",   names: { common: "Torn Tome",     uncommon: "Bound Codex",    rare: "Tome of Echoes",    epic: "Liber Umbrae",             legendary: "Book of the Black Sun" } },
  { baseId: "charm",   slot: "trinket", focus: "mixed", names: { common: "Bone Trinket",  uncommon: "Ember Charm",    rare: "Spectral Locket",   epic: "Phylactery Shard",         legendary: "Heart of the Dragon" } },
];

const RARITY_MULT: Record<Rarity, number> = { common: 1, uncommon: 1.5, rare: 2.2, epic: 3.0, legendary: 4.2 };

let _itemSeq = 0;
const newItemId = () => `g_${Date.now().toString(36)}_${(_itemSeq++).toString(36)}`;

export function rollGear(depth: number, opts?: { minRarity?: Rarity }): GearItem {
  const r = Math.random();
  const depthBoost = depth / 10;
  let rarity: Rarity;
  if (r < 0.45 - depthBoost * 0.25) rarity = "common";
  else if (r < 0.75 - depthBoost * 0.15) rarity = "uncommon";
  else if (r < 0.92) rarity = "rare";
  else if (r < 0.985) rarity = "epic";
  else rarity = "legendary";
  if (opts?.minRarity && RARITY_RANK[rarity] < RARITY_RANK[opts.minRarity]) rarity = opts.minRarity;

  const template = GEAR_TEMPLATES[Math.floor(Math.random() * GEAR_TEMPLATES.length)];
  const ilvl = Math.max(1, Math.min(15, depth + Math.floor(Math.random() * 3)));
  const mult = RARITY_MULT[rarity];
  const base = Math.max(1, Math.floor(ilvl * 0.7 * mult));
  const stats: GearItem["stats"] = {};
  switch (template.focus) {
    case "atk":   stats.atk = base; if (rarity !== "common") stats.crit = Math.floor(mult * 2); break;
    case "mag":   stats.mag = base; if (rarity !== "common") stats.crit = Math.floor(mult * 2); break;
    case "hp":    stats.maxHp = Math.floor(base * 2.5); if (rarity !== "common") stats.dodge = Math.floor(mult); break;
    case "mixed": stats.atk = Math.floor(base * 0.6); stats.maxHp = Math.floor(base * 1.5); if (rarity === "epic" || rarity === "legendary") stats.mag = Math.floor(base * 0.4); break;
  }
  return {
    id: newItemId(),
    baseId: template.baseId,
    name: template.names[rarity] ?? template.names.common ?? "Curio",
    slot: template.slot,
    rarity, ilvl, stats,
  };
}

export function gearScore(item: GearItem): number {
  return (item.stats.atk ?? 0) * 2 + (item.stats.mag ?? 0) * 2 + (item.stats.maxHp ?? 0) + (item.stats.crit ?? 0) + (item.stats.dodge ?? 0);
}

export function gearSellPrice(item: GearItem): number {
  return Math.max(2, Math.floor(gearScore(item) * (1 + RARITY_RANK[item.rarity])));
}

// ── Cosmetics & Champion's Pass ──────────────────────────────────────────────

export type CosmeticKind = "title" | "portraitFrame" | "namePlate" | "weaponGlow" | "damageSkin" | "pet";

export interface CosmeticDef {
  id: string;
  name: string;
  kind: CosmeticKind;
  desc: string;
  priceGems: number;
  /** CSS color or gradient used for previews and borders */
  swatch: string;
  /** Solid CSS color used when this cosmetic tints UI (glows, damage numbers) */
  tint?: string;
  /** Title suffix text (for kind="title") */
  titleText?: string;
  /** Display glyph (used for pets and shop previews) */
  glyph: string;
  championExclusive?: boolean;
}

export const COSMETICS: CosmeticDef[] = [
  // Titles — appear after your name in the header
  { id: "title_ashbringer",  name: "the Ashbringer",   kind: "title", desc: "Earned in fire.",         titleText: "the Ashbringer",   priceGems: 120, swatch: "var(--color-ember)",  glyph: "“" },
  { id: "title_delver",      name: "the Delver",       kind: "title", desc: "You always go deeper.",   titleText: "the Delver",       priceGems: 80,  swatch: "var(--color-gold)",   glyph: "“" },
  { id: "title_voidtouched", name: "Voidtouched",      kind: "title", desc: "Something looked back.",  titleText: "Voidtouched",      priceGems: 150, swatch: "var(--color-arcane)", glyph: "“" },
  { id: "title_oathbound",   name: "the Oathbound",    kind: "title", desc: "A Champion's mark.",      titleText: "the Oathbound",    priceGems: 0,   swatch: "var(--color-divine)", glyph: "“", championExclusive: true },

  // Portrait frames — glowing ring around your portrait
  { id: "frame_iron",       name: "Iron Trim",       kind: "portraitFrame", desc: "Hammered iron border.",     priceGems: 50,  swatch: "oklch(0.5 0.02 60)",  tint: "oklch(0.5 0.02 60)",  glyph: "▢" },
  { id: "frame_gilded",     name: "Gilded Trim",     kind: "portraitFrame", desc: "Inlaid gold filigree.",     priceGems: 110, swatch: "var(--color-gold)",   tint: "var(--color-gold)",   glyph: "▢" },
  { id: "frame_demonic",    name: "Demonic Trim",    kind: "portraitFrame", desc: "Pulses with infernal red.", priceGems: 140, swatch: "var(--color-blood)",  tint: "var(--color-blood)",  glyph: "▢" },
  { id: "frame_frostbound", name: "Frostbound Trim", kind: "portraitFrame", desc: "Rimed in blue ice.",        priceGems: 140, swatch: "var(--color-allies)", tint: "var(--color-allies)", glyph: "▢" },

  // Nameplate frames — outer border style of the header card
  { id: "plate_obsidian",  name: "Obsidian Plate", kind: "namePlate", desc: "Black-stone nameplate.", priceGems: 40,  swatch: "oklch(0.25 0.005 280)", tint: "oklch(0.4 0.005 280)",  glyph: "▣" },
  { id: "plate_runed",     name: "Runed Plate",    kind: "namePlate", desc: "Etched arcane glyphs.",  priceGems: 90,  swatch: "var(--color-arcane)",   tint: "var(--color-arcane)",   glyph: "▣" },
  { id: "plate_bone",      name: "Bone Plate",     kind: "namePlate", desc: "Carved from a wraith.",  priceGems: 90,  swatch: "oklch(0.92 0.02 80)",   tint: "oklch(0.92 0.02 80)",   glyph: "▣" },
  { id: "plate_celestial", name: "Celestial Plate",kind: "namePlate", desc: "Champion's pact-mark.",  priceGems: 0,   swatch: "var(--color-divine)",   tint: "var(--color-divine)",   glyph: "▣", championExclusive: true },

  // Weapon glows — tint your ability buttons in combat
  { id: "glow_blood",  name: "Bloodthirst Glow", kind: "weaponGlow", desc: "Ability buttons drip red.", priceGems: 60,  swatch: "var(--color-blood)",  tint: "var(--color-blood)",  glyph: "✦" },
  { id: "glow_arcane", name: "Arcane Glow",      kind: "weaponGlow", desc: "Buttons sheen violet.",     priceGems: 60,  swatch: "var(--color-arcane)", tint: "var(--color-arcane)", glyph: "✦" },
  { id: "glow_gold",   name: "Goldfire Glow",    kind: "weaponGlow", desc: "Burns lantern-yellow.",     priceGems: 90,  swatch: "var(--color-gold)",   tint: "var(--color-gold)",   glyph: "✦" },
  { id: "glow_frost",  name: "Frostbite Glow",   kind: "weaponGlow", desc: "Cold blue aura.",           priceGems: 90,  swatch: "var(--color-allies)", tint: "var(--color-allies)", glyph: "✦" },

  // Damage number skins — color of YOUR floating damage numbers
  { id: "dmg_golden",   name: "Golden Crit",  kind: "damageSkin", desc: "Numbers bloom gold.",     priceGems: 80,  swatch: "var(--color-gold)",   tint: "var(--color-gold)",   glyph: "9" },
  { id: "dmg_hellfire", name: "Hellfire",     kind: "damageSkin", desc: "Red flame digits.",       priceGems: 80,  swatch: "var(--color-blood)",  tint: "var(--color-blood)",  glyph: "9" },
  { id: "dmg_arcane",   name: "Arcane Spark", kind: "damageSkin", desc: "Violet sparks per hit.",  priceGems: 100, swatch: "var(--color-arcane)", tint: "var(--color-arcane)", glyph: "9" },
  { id: "dmg_frost",    name: "Frostbite",    kind: "damageSkin", desc: "Icy blue numerals.",      priceGems: 100, swatch: "var(--color-allies)", tint: "var(--color-allies)", glyph: "9" },

  // Pets — idle beside your portrait
  { id: "pet_imp",   name: "Shadow Imp",   kind: "pet", desc: "Cackles at your kills.",  priceGems: 150, swatch: "oklch(0.3 0.05 25)",  tint: "var(--color-blood)",  glyph: "👹" },
  { id: "pet_whelp", name: "Frost Whelp",  kind: "pet", desc: "Small. Cold. Loyal.",     priceGems: 180, swatch: "oklch(0.4 0.1 250)",  tint: "var(--color-allies)", glyph: "🐉" },
  { id: "pet_owl",   name: "Spectral Owl", kind: "pet", desc: "Phases through the dark.",priceGems: 200, swatch: "oklch(0.5 0.02 280)", tint: "var(--color-arcane)", glyph: "🦉" },
];

export const COSMETIC_KIND_LABEL: Record<CosmeticKind, string> = {
  title: "Titles",
  portraitFrame: "Portrait Frames",
  namePlate: "Name Plates",
  weaponGlow: "Weapon Glows",
  damageSkin: "Damage Numbers",
  pet: "Pets",
};


export interface GemPack { id: string; gems: number; priceUsd: number; bonus?: number }
export const GEM_PACKS: GemPack[] = [
  { id: "gp_small", gems: 100,  priceUsd: 1.99 },
  { id: "gp_med",   gems: 550,  priceUsd: 9.99,  bonus: 50 },
  { id: "gp_large", gems: 1200, priceUsd: 19.99, bonus: 200 },
  { id: "gp_huge",  gems: 3500, priceUsd: 49.99, bonus: 1000 },
];

export const CHAMPION_PERKS: { icon: string; title: string; desc: string }[] = [
  { icon: "★", title: "+50% XP & Gold",           desc: "Every kill, every chest." },
  { icon: "✦", title: "Double Daily Quest Slots", desc: "Two extra quests on the board." },
  { icon: "⚖", title: "+10 Auction House Slots",  desc: "List more crafted goods at once." },
  { icon: "▩", title: "Larger Bag (40 → 80)",     desc: "Carry more gear out of dungeons." },
  { icon: "🦌", title: "Exclusive Monthly Mount", desc: "Starting with the Celestial Stag." },
  { icon: "♻", title: "Free Weekly Respec",       desc: "Try every spec, no gold cost." },
];

export const CHAMPION_PRICE_USD = 4.99;
export const RESPEC_GOLD_COST = 100;
export const BAG_SIZE_BASE = 40;
export const BAG_SIZE_CHAMPION = 80;

