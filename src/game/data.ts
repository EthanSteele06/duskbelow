import warriorImg from "@/assets/class-warrior.jpg";
import rogueImg from "@/assets/class-rogue.jpg";
import mageImg from "@/assets/class-mage.jpg";
import priestImg from "@/assets/class-priest.jpg";
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

export type ClassId = "warrior" | "rogue" | "mage" | "priest";
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
}

export const CLASSES: ClassDef[] = [
  { id: "warrior", name: "Warrior", tagline: "Steel and fury.", hp: 40, atk: 9, mag: 1, portrait: warriorImg, color: "var(--color-ember)" },
  { id: "rogue",   name: "Rogue",   tagline: "Strike from shadow.", hp: 28, atk: 7, mag: 3, portrait: rogueImg, color: "oklch(0.7 0.18 150)" },
  { id: "mage",    name: "Mage",    tagline: "Bend the arcane.", hp: 22, atk: 3, mag: 10, portrait: mageImg, color: "var(--color-arcane)" },
  { id: "priest",  name: "Priest",  tagline: "Light against the dark.", hp: 32, atk: 5, mag: 7, portrait: priestImg, color: "var(--color-divine)" },
];

export interface FactionDef {
  id: FactionId;
  name: string;
  motto: string;
  sigil: string;
  color: string;
}

export const FACTIONS: FactionDef[] = [
  { id: "allies",  name: "Kingdom of Allies", motto: "Bound by oath. Forged in light.", sigil: alliesSigil,  color: "var(--color-allies)" },
  { id: "brigade", name: "Endless Brigade",   motto: "We march. We do not stop.",       sigil: brigadeSigil, color: "var(--color-brigade)" },
];

// ── Abilities ────────────────────────────────────────────────────────────────

export type AbilityEffect =
  | { kind: "attack"; mult: number; useMag?: boolean; flavor: string }
  | { kind: "heal"; amount: number; flavor: string }
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
    { id: "strike", name: "Strike",     desc: "A clean swing. ATK damage.",            cooldown: 0, effect: { kind: "attack", mult: 1.0, flavor: "{p} cleaves with their blade" } },
    { id: "cleave", name: "Cleave",     desc: "A heavy two-hander. 1.7× ATK.",        cooldown: 2, effect: { kind: "attack", mult: 1.7, flavor: "{p} swings a wide cleave" } },
    { id: "wall",   name: "Shield Wall", desc: "Brace. Cut next hit by 70%.",          cooldown: 3, effect: { kind: "shield", reduce: 0.7, flavor: "{p} raises a shield wall" } },
  ],
  rogue: [
    { id: "slash",   name: "Slash",     desc: "Twin daggers. ATK damage.",             cooldown: 0, effect: { kind: "attack", mult: 1.0, flavor: "{p} slashes with twin daggers" } },
    { id: "backstab",name: "Backstab",  desc: "Surgical kill. 2.5× ATK.",              cooldown: 3, effect: { kind: "attack", mult: 2.5, flavor: "{p} drives a dagger through a weak point" } },
    { id: "smoke",   name: "Smoke Bomb",desc: "Vanish. Guaranteed flee.",              cooldown: 4, effect: { kind: "flee", flavor: "{p} disappears in a curl of smoke" } },
  ],
  mage: [
    { id: "bolt",    name: "Arcane Bolt",desc: "MAG damage at range.",                 cooldown: 0, effect: { kind: "attack", mult: 1.0, useMag: true, flavor: "{p} hurls an arcane bolt" } },
    { id: "fireball",name: "Fireball",   desc: "Roaring flame. 1.8× MAG.",             cooldown: 2, effect: { kind: "attack", mult: 1.8, useMag: true, flavor: "{p} casts a roaring fireball" } },
    { id: "nova",    name: "Frost Nova", desc: "Freeze the foe. Skip its turn.",       cooldown: 3, effect: { kind: "stun", flavor: "{p} unleashes a frost nova" } },
  ],
  priest: [
    { id: "smite",   name: "Smite",      desc: "Holy MAG damage.",                     cooldown: 0, effect: { kind: "attack", mult: 1.0, useMag: true, flavor: "{p} smites the foe with holy light" } },
    { id: "heal",    name: "Lay on Hands",desc: "Restore HP equal to 2× MAG.",         cooldown: 2, effect: { kind: "heal", amount: 0, flavor: "{p} lays on hands, wreathed in light" } },
    { id: "wrath",   name: "Wrath",      desc: "MAG damage and a small heal.",         cooldown: 3, effect: { kind: "attack", mult: 1.4, useMag: true, flavor: "{p} calls down righteous wrath" } },
  ],
};

// ── Enemies ──────────────────────────────────────────────────────────────────

export interface EnemyDef {
  id: string;
  name: string;
  image: string;
  hpBase: number;
  atkBase: number;
  questItemId?: string;
  materialDrop?: { id: string; chance: number };
  attackLines: string[];
}

export const ENEMIES: Record<string, EnemyDef> = {
  rat: {
    id: "rat", name: "Plague Rat", image: ratImg,
    hpBase: 8, atkBase: 2, questItemId: "rat_tail",
    materialDrop: { id: "rough_pelt", chance: 0.5 },
    attackLines: ["The {n} lunges and bites for {d}!", "The {n} claws at your shins for {d}!", "Mangy teeth tear in for {d}!"],
  },
  skeleton: {
    id: "skeleton", name: "Risen Skeleton", image: skeletonImg,
    hpBase: 14, atkBase: 4,
    materialDrop: { id: "bone_dust", chance: 0.55 },
    attackLines: ["The {n} swings a rusted sword for {d}!", "Bone fingers rake you for {d}!", "{n} brings the blade down for {d}!"],
  },
  cultist: {
    id: "cultist", name: "Robed Cultist", image: cultistImg,
    hpBase: 20, atkBase: 6, questItemId: "cult_mask",
    materialDrop: { id: "dark_thread", chance: 0.5 },
    attackLines: ["The {n} chants and slashes for {d}!", "A jagged dagger bites for {d}!", "The {n} murmurs and strikes for {d}!"],
  },
  wraith: {
    id: "wraith", name: "Wailing Wraith", image: wraithImg,
    hpBase: 26, atkBase: 7,
    materialDrop: { id: "ghost_essence", chance: 0.4 },
    attackLines: ["The {n} drains your soul for {d}!", "A spectral wail crushes you for {d}!", "Cold hands phase through you for {d}!"],
  },
  ogre: {
    id: "ogre", name: "Ogre Brute", image: ogreImg,
    hpBase: 38, atkBase: 9,
    materialDrop: { id: "iron_scrap", chance: 0.6 },
    attackLines: ["The {n} smashes a club down for {d}!", "{n} bellows and clubs you for {d}!", "The {n} stomps for {d}!"],
  },
  dragon: {
    id: "dragon", name: "Black Dragon", image: dragonImg,
    hpBase: 80, atkBase: 12,
    materialDrop: { id: "dragon_scale", chance: 1.0 },
    attackLines: ["The {n} breathes searing flame for {d}!", "{n} bites with iron jaws for {d}!", "A wing sweep crushes you for {d}!"],
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
  kind: "weapon" | "potion" | "trinket";
  atk?: number;
  heal?: number;
}

export const VENDOR_ITEMS: VendorItem[] = [
  { id: "p1", name: "Lesser Healing Draught", desc: "Restores 15 HP.", price: 12, kind: "potion", heal: 15 },
  { id: "p2", name: "Greater Healing Draught", desc: "Restores 35 HP.", price: 30, kind: "potion", heal: 35 },
  { id: "w1", name: "Ironbite Blade", desc: "+2 ATK.", price: 45, kind: "weapon", atk: 2 },
  { id: "w2", name: "Runed Cleaver", desc: "+4 ATK.", price: 110, kind: "weapon", atk: 4 },
  { id: "t1", name: "Ember Charm", desc: "Pulses with dungeon heat.", price: 25, kind: "trinket" },
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
