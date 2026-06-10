import type { ClassId, FactionId, GearItem } from "./data";

// ── Daily Contract + Rotating Relics ─────────────────────────────────────────

export interface DailyContractState {
  /** Contract definition id (from DAILY_CONTRACTS in data.ts) */
  defId: string;
  /** ms timestamp the day's roll was generated */
  rolledAt: number;
  /** has the player accepted the contract this cycle */
  accepted: boolean;
  /** progress counter, contract-specific semantics */
  progress: number;
  /** has the reward been claimed (locks the contract until rotation) */
  claimed: boolean;
}

export interface RelicVendorState {
  rolledAt: number;
  /** seed used so the listings are deterministic for the cycle */
  seed: number;
  /** ids of listings the player has already purchased this cycle */
  sold: string[];
}

export const DAILY_ROTATION_MS = 24 * 60 * 60 * 1000;

// ── Persistent meta state (survives character wipes) ─────────────────────────

export interface AccountState {
  xp: number;
  level: number;
}

export interface JournalState {
  enemyKills: Record<string, number>;
  bossesDowned: Record<string, number>;
  itemsFound: Record<string, number>;
  deepestFloor: number;
  bestRun?: { floors: number; kills: number; gold: number; date: number };
  loreFound: string[];
  runsCompleted: number;
}

export interface LifetimeStats {
  runs: number;
  bossesKilled: number;
  goldEarned: number;
  deepest: number;
  deepestCursed: number;
  legendariesFound: number;
}

export interface CollectionState {
  classesPlayed: ClassId[];
  classesCleared: ClassId[];
  factionsPlayed: FactionId[];
  legendaryClasses: ClassId[];
}

export interface MetaOptions {
  autoSellCommon: boolean;
}

export interface MetaState {
  version: number;
  account: AccountState;
  shards: number;
  echoLearned: string[];
  hasCompletedFirstRun: boolean;
  /** Did the player ever clear floor 30 in normal mode? Gates Cursed Depths. */
  hasClearedNormal: boolean;
  unlockedClasses: ClassId[];
  /** Premium classes the player has purchased (or test-unlocked). */
  ownedClasses: ClassId[];
  journal: JournalState;
  stash: GearItem[];
  /** Did we already show the first-wipe explainer? */
  seenWipeIntro: boolean;
  /** Per-step tutorial dismissal map. */
  tutorialSeen: Record<string, boolean>;
  lifetime: LifetimeStats;
  collection: CollectionState;
  options: MetaOptions;
  /** Per-cycle daily contract slot. Null until first rotation. */
  dailyContract: DailyContractState | null;
  /** Per-cycle rotating relic vendor state. Null until first rotation. */
  relicVendor: RelicVendorState | null;
  /** Boss ids whose first-encounter intro banner has already been shown. */
  seenBossIntros: string[];
}

export const META_VERSION = 1;
export const META_STORAGE_KEY = "duskbelow.meta.v1";

export const emptyMeta = (): MetaState => ({
  version: META_VERSION,
  account: { xp: 0, level: 1 },
  shards: 0,
  echoLearned: [],
  hasCompletedFirstRun: false,
  hasClearedNormal: false,
  unlockedClasses: ["warrior", "rogue"],
  ownedClasses: [],
  journal: {
    enemyKills: {}, bossesDowned: {}, itemsFound: {},
    deepestFloor: 0, loreFound: [], runsCompleted: 0,
  },
  stash: [],
  seenWipeIntro: false,
  tutorialSeen: {},
  lifetime: { runs: 0, bossesKilled: 0, goldEarned: 0, deepest: 0, deepestCursed: 0, legendariesFound: 0 },
  collection: { classesPlayed: [], classesCleared: [], factionsPlayed: [], legendaryClasses: [] },
  options: { autoSellCommon: false },
  dailyContract: null,
  relicVendor: null,
  seenBossIntros: [],
});

// ── Account leveling ─────────────────────────────────────────────────────────

export const accountXpForLevel = (lvl: number) => 60 + lvl * 80;
export const ACCOUNT_LEVEL_CAP = 30;

// ── Unlock table ─────────────────────────────────────────────────────────────

export type UnlockKind =
  | { kind: "class"; classId: ClassId }
  | { kind: "stashSlot" }
  | { kind: "zone"; name: string }
  | { kind: "racialCharge" }
  | { kind: "echoNode" };

export interface AccountUnlock {
  level: number;
  label: string;
  effect: UnlockKind;
}

export const ACCOUNT_UNLOCKS: AccountUnlock[] = [
  { level: 3, label: "Heirloom Stash slot 1",      effect: { kind: "stashSlot" } },
  { level: 5, label: "Zone — The Bone Halls",      effect: { kind: "zone", name: "The Bone Halls" } },
  { level: 7, label: "Heirloom Stash slot 2",      effect: { kind: "stashSlot" } },
  { level: 8, label: "Second racial charge",       effect: { kind: "racialCharge" } },
  { level: 10, label: "Zone — Void Sanctum",       effect: { kind: "zone", name: "Void Sanctum" } },
  { level: 12, label: "Heirloom Stash slot 3",     effect: { kind: "stashSlot" } },
];

export function unlockedAtLevel<T extends UnlockKind["kind"]>(
  level: number, kind: T,
): Array<Extract<UnlockKind, { kind: T }>> {
  return ACCOUNT_UNLOCKS
    .filter((u) => u.level <= level && u.effect.kind === kind)
    .map((u) => u.effect as Extract<UnlockKind, { kind: T }>);
}

export function stashCapacity(level: number): number {
  return unlockedAtLevel(level, "stashSlot").length;
}

export function racialChargesForLevel(level: number): number {
  return 1 + unlockedAtLevel(level, "racialCharge").length;
}

export function unlockedClassesFor(level: number, baseUnlocks: ClassId[]): ClassId[] {
  const set = new Set<ClassId>(baseUnlocks);
  for (const u of unlockedAtLevel(level, "class")) set.add(u.classId);
  return Array.from(set);
}

export function nextUnlock(level: number): AccountUnlock | null {
  return ACCOUNT_UNLOCKS.find((u) => u.level > level) ?? null;
}

// ── Echo Tree (persistent passive nodes) ─────────────────────────────────────

export interface EchoNode {
  id: string;
  name: string;
  desc: string;
  cost: number;
  requires?: string;
  /** Only show this node to players of a specific faction. */
  requiresFaction?: FactionId;
}

export const ECHO_TREE: EchoNode[] = [
  // Tier 1 — cheap starters
  { id: "start_hp",     name: "Lingering Vigor",  desc: "Start each run with +8 Max HP.",          cost: 1 },
  { id: "start_atk",    name: "Sharper Memory",   desc: "Start each run with +1 ATK.",             cost: 1 },
  { id: "start_potion", name: "Pocket Apothecary",desc: "Start each run with 1 Lesser Potion.",    cost: 1 },
  // Tier 2 — economy
  { id: "gold_bonus",   name: "Soul Tithe",       desc: "Earn +10% gold from kills & chests.",     cost: 2, requires: "start_atk" },
  { id: "xp_bonus",     name: "Echoes of Battle", desc: "Earn +10% XP.",                           cost: 2, requires: "start_hp" },
  { id: "bag_slot",     name: "Wider Pack",       desc: "+10 bag slots.",                          cost: 2, requires: "start_potion" },
  { id: "grave_robber", name: "Grave Robber",     desc: "Chests appear more often in dungeons.",   cost: 3, requires: "gold_bonus" },
  // Tier 3 — heavier
  { id: "retain_gold",  name: "Buried Coin",      desc: "Keep 25% of your gold through a wipe.",   cost: 3, requires: "gold_bonus" },
  { id: "shard_bonus",  name: "Soul Resonance",   desc: "+25% Soul Shards from runs.",             cost: 3, requires: "xp_bonus" },
  { id: "second_pot",   name: "Field Surgeon",    desc: "Also start with 1 Greater Potion.",       cost: 3, requires: "bag_slot" },
  { id: "echo_light",   name: "Echo of Light",    desc: "Your first hit each fight is a guaranteed crit.", cost: 4, requires: "xp_bonus" },
  { id: "iron_will",    name: "Iron Will",        desc: "Begin every run with +1 racial charge.",  cost: 4, requires: "start_hp" },
  { id: "hoarder",      name: "Hoarder",          desc: "Keep 1 random bag item through a wipe.",  cost: 4, requires: "retain_gold" },
  // Class unlocks — shard-gated only path to the casters
  { id: "unlock_mage",   name: "Awaken the Mage",   desc: "Permanently unlock the Mage class on the title screen.",   cost: 6, requires: "xp_bonus" },
  { id: "unlock_priest", name: "Awaken the Priest", desc: "Permanently unlock the Priest class on the title screen.", cost: 10, requires: "unlock_mage" },
  // Capstone
  { id: "ascendance",   name: "Ascendance",       desc: "New characters begin at level 2.",        cost: 8, requires: "shard_bonus" },
  // Capstone
  { id: "ascendance",   name: "Ascendance",       desc: "New characters begin at level 2.",        cost: 8, requires: "shard_bonus" },
  // ── Faction echoes (only visible to the matching banner) ──
  { id: "oath_bulwark", name: "Oathbound Bulwark", desc: "Allies-only. +1 dodge for every 5 Wanderer levels.", cost: 4, requiresFaction: "allies" },
  { id: "oath_warmarch", name: "Warmarch", desc: "Brigade-only. +1 crit for every 5 Wanderer levels.", cost: 4, requiresFaction: "brigade" },
];

export function hasEcho(meta: MetaState, id: string) { return meta.echoLearned.includes(id); }

export interface EchoStart {
  bonusMaxHp: number;
  bonusAtk: number;
  bonusBag: number;
  startingPotions: string[];
  goldMult: number;
  xpMult: number;
  shardMult: number;
  retainGoldPct: number;
}

export function echoStart(meta: MetaState): EchoStart {
  const has = (id: string) => hasEcho(meta, id);
  const pots: string[] = [];
  if (has("start_potion")) pots.push("p1");
  if (has("second_pot"))   pots.push("p2");
  return {
    bonusMaxHp:    has("start_hp") ? 8 : 0,
    bonusAtk:      has("start_atk") ? 1 : 0,
    bonusBag:      has("bag_slot") ? 10 : 0,
    startingPotions: pots,
    goldMult:      has("gold_bonus") ? 1.10 : 1.0,
    xpMult:        has("xp_bonus") ? 1.10 : 1.0,
    shardMult:     has("shard_bonus") ? 1.25 : 1.0,
    retainGoldPct: has("retain_gold") ? 0.25 : 0,
  };
}

// ── Lore fragments ───────────────────────────────────────────────────────────

export interface LoreFragment {
  id: string;
  title: string;
  source: string;
  text: string;
}

export const LORE_FRAGMENTS: LoreFragment[] = [
  { id: "lore_seals",   source: "cultist",  title: "On the Cracking of Seals", text: "The old wards were not made to last forever. They were made to last until someone with a shovel got curious." },
  { id: "lore_wraith",  source: "wraith",   title: "Wails Without Throats",     text: "The wraiths remember a city that stood where the dungeon now mouths open. They are still angry about it." },
  { id: "lore_ogre",    source: "ogre",     title: "Lord of the Lower Halls",   text: "Before the brutes were brutes, they were jailers. The chains rusted; their grip did not." },
  { id: "lore_dragon",  source: "dragon",   title: "The Heart, Beating",        text: "Below the last stair, a heart the size of a barn pumps black ichor through the stone. They say it was once a god." },
  { id: "lore_brigade", source: "skeleton", title: "Conscript's Marker",        text: "Endless Brigade tags scratched into a femur. The march ended here. The names did not." },
];

// ── Persistence ──────────────────────────────────────────────────────────────

export function loadMeta(): MetaState {
  if (typeof window === "undefined") return emptyMeta();
  try {
    const raw = window.localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return emptyMeta();
    const parsed = JSON.parse(raw) as Partial<MetaState>;
    if (!parsed || parsed.version !== META_VERSION) return emptyMeta();
    // Merge in case of new fields
    const base = emptyMeta();
    // Migration: if save predates rogue-at-start, fold it in.
    const baseUnlocks = parsed.unlockedClasses ?? base.unlockedClasses;
    const mergedUnlocks = baseUnlocks.includes("rogue") ? baseUnlocks : [...baseUnlocks, "rogue" as ClassId];
    return {
      ...base, ...parsed,
      account: { ...base.account, ...(parsed.account ?? {}) },
      journal: { ...base.journal, ...(parsed.journal ?? {}) },
      echoLearned: parsed.echoLearned ?? [],
      unlockedClasses: mergedUnlocks,
      ownedClasses: parsed.ownedClasses ?? [],
      stash: parsed.stash ?? [],
      lifetime: { ...base.lifetime, ...(parsed.lifetime ?? {}) },
      collection: { ...base.collection, ...(parsed.collection ?? {}) },
      options: { ...base.options, ...(parsed.options ?? {}) },
    };
  } catch { return emptyMeta(); }
}

export function saveMeta(meta: MetaState) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta)); } catch { /* noop */ }
}
