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
  cooldown: number; // 0 = always available
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
  attackLines: string[];
}

export const ENEMIES: Record<string, EnemyDef> = {
  rat: {
    id: "rat", name: "Plague Rat", image: ratImg,
    hpBase: 8, atkBase: 2, questItemId: "rat_tail",
    attackLines: ["The {n} lunges and bites for {d}!", "The {n} claws at your shins for {d}!", "Mangy teeth tear in for {d}!"],
  },
  skeleton: {
    id: "skeleton", name: "Risen Skeleton", image: skeletonImg,
    hpBase: 14, atkBase: 4,
    attackLines: ["The {n} swings a rusted sword for {d}!", "Bone fingers rake you for {d}!", "{n} brings the blade down for {d}!"],
  },
  cultist: {
    id: "cultist", name: "Robed Cultist", image: cultistImg,
    hpBase: 20, atkBase: 6, questItemId: "cult_mask",
    attackLines: ["The {n} chants and slashes for {d}!", "A jagged dagger bites for {d}!", "The {n} murmurs and strikes for {d}!"],
  },
  wraith: {
    id: "wraith", name: "Wailing Wraith", image: wraithImg,
    hpBase: 26, atkBase: 7,
    attackLines: ["The {n} drains your soul for {d}!", "A spectral wail crushes you for {d}!", "Cold hands phase through you for {d}!"],
  },
  ogre: {
    id: "ogre", name: "Ogre Brute", image: ogreImg,
    hpBase: 38, atkBase: 9,
    attackLines: ["The {n} smashes a club down for {d}!", "{n} bellows and clubs you for {d}!", "The {n} stomps for {d}!"],
  },
  dragon: {
    id: "dragon", name: "Black Dragon", image: dragonImg,
    hpBase: 80, atkBase: 12,
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
  label: string;
}

export function rollChest(depth: number): ChestPreview {
  const labels = ["A reinforced iron chest", "A small wooden coffer", "A rune-etched strongbox", "A dusty chest, faintly humming"];
  const drop = Math.random() < 0.35 ? "sealed_scroll" : undefined;
  return {
    goldRange: [5 + depth * 4, 12 + depth * 8],
    xpRange: [4 + depth * 2, 8 + depth * 4],
    questItemId: drop,
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
}

export const QUESTS: QuestDef[] = [
  { id: "q1", name: "Pest Control",      desc: "The smith hates rats. Bring proof.",                       target: { itemId: "rat_tail",     count: 3, label: "Rat Tail" },     rewardGold: 40,  rewardXp: 25 },
  { id: "q2", name: "Forbidden Pages",   desc: "A scribe pays well for sealed scrolls from the deep.",     target: { itemId: "sealed_scroll",count: 2, label: "Sealed Scroll" },rewardGold: 80,  rewardXp: 40 },
  { id: "q3", name: "Unmasked",          desc: "Bring back masks worn by the cultists below.",             target: { itemId: "cult_mask",    count: 2, label: "Cultist Mask" }, rewardGold: 140, rewardXp: 70 },
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
