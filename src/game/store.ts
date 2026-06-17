import { create } from "zustand";
import { playSfx } from "@/game/audio";
import type { ClassId, FactionId, Ability, ProfessionId, GearItem, GearSlot, TalentNode, BuffEffect, DungeonMode, AffixId, OathId } from "./data";
import {
  CLASSES, FACTIONS, VENDOR_ITEMS, QUESTS, TRAINERS, RECIPES, MATERIALS, SPECS, COSMETICS,
  BAG_SIZE_BASE, BAG_SIZE_CHAMPION, RESPEC_GOLD_COST, MAX_ACTIVE_QUESTS, MATERIAL_STACK_SIZE,
  gearSellPrice, profXpForLevel,
  IDLE_YIELDS, IDLE_SECONDS_PER_UNIT, IDLE_MAX_SECONDS,   rollAffixes, rollAscensionAffixes, rollGear, rollClassLegendary,
  DAILY_CONTRACTS, rollDailyContract, rollRelicListings,
  CHRONICLE_BOONS, activeClassTrial, maxDepthForMode, sumEquipmentBonuses,
} from "./data";
import type { MetaOptions } from "./meta";
import {
  type MetaState, type EchoNode, emptyMeta, loadMeta, saveMeta,
  echoStart, accountXpForLevel, ACCOUNT_LEVEL_CAP, stashCapacity, racialChargesForLevel,
  ECHO_TREE, hasEcho, DAILY_ROTATION_MS, hasClassTrialUnlocked, zoneModsForLevel,
} from "./meta";
import { TALENT_TREES } from "./talents";
import { sumTalentStatBonuses } from "./talentCombat";
import {
  clampResource, combatStartResource, computeMaxResource,
  energyRegenPerTurn, furyFromDamageDealt, furyFromDamageTaken,
  manaRegenBetweenRooms, manaRegenPerTurn, rageFromDamage,
  resourceDef, runeRegenPerTurn, type ResourceSnapshot,
} from "./resources";

export type Screen =
  | "title" | "intro" | "city"
  | "vendor" | "auction" | "auction_house" | "quests"
  | "trainer" | "talents" | "profession"
  | "equipment" | "shop" | "champion"
  | "dungeon"
  | "run_summary" | "echo" | "journal"
  | "wanderer" | "chronicle" | "daily";

export interface QuestState {
  id: string;
  progress: number;
  completed: boolean;
  turnedIn: boolean;
}

interface PlayerState {
  name: string;
  faction: FactionId | null;
  classId: ClassId | null;
  specId: string | null;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  atk: number;
  mag: number;
  crit: number;
  dodge: number;
  block: number;
  hpRegen: number;
  manaRegen: number;
  xpGainPct: number;
  armor: number;
  weaponMin: number;
  weaponMax: number;
  attackSpeed: number;
  /** Current class combat resource (rage, energy, mana, runes, fury) */
  resource: number;
  maxResource: number;
  baseMaxHp: number;
  baseAtk: number;
  baseMag: number;
  gold: number;
  gems: number;
  inventory: string[];
  questItems: Record<string, number>;
  dungeonDepth: number;
  skillPoints: number;
  learnedSkills: string[];
  talentPoints: number;
  learnedTalents: string[];
  earnedSkillForLevel: number;
  equipment: Partial<Record<GearSlot, GearItem>>;
  bag: GearItem[];
  profession: ProfessionId | null;
  profLevel: number;
  profXp: number;
  materials: Record<string, number>;
  knownRecipes: string[];
  /** When the active profession started accruing idle materials (Date.now ms). */
  profIdleSince: number;
  isChampion: boolean;
  ownedCosmetics: string[];
  equippedCosmetics: Partial<Record<string, string>>;
  /** racial charges used this run */
  racialUsed: number;
  /** total racial charges this run (derived from account level on dungeon enter) */
  racialMax: number;
  /** multiplier applied to the very next player attack, then consumed */
  nextAttackMult: number;
  /** lifetime kills this run, used for run summary */
  runKills: number;
  /** gold earned during the current run, used for run summary */
  runGold: number;
  /** XP earned during the current run, used for run summary */
  runXp: number;
  /** soul shards earned during the current run */
  runShards: number;
  /** blessings queued in town, baked in on enterDungeon, cleared on exit/finish */
  activeBuffs: BuffEffect[];
  /** transient bonus to gold multiplier from buffs (1.0 = none) */
  buffGoldMult: number;
  /** first hit each combat is an auto-crit (Echo of Light) — armed at fight start */
  firstHitCritArmed: boolean;
  /** Current run dungeon mode (normal or cursed). */
  dungeonMode: DungeonMode;
  /** Active affixes for the current cursed run. */
  affixes: AffixId[];
  /** Stacking weakness debuff turns remaining (reduces ATK/MAG by 25%). */
  weaknessTurns: number;
  /** Pre-descent Oaths active for this run. Cleared on finishRun/exitDungeon. */
  activeOaths: OathId[];
  /** Shrine buffs applied during the current descent. Cleared on exit/finish. */
  dungeonBuffs: BuffEffect[];
  /** Used the once-per-run elite retreat (floor 5 Bone Warden). */
  eliteRetreatUsed: boolean;
  /** Class/spec ability cooldowns — persist across rooms for the whole descent. */
  abilityCooldowns: Record<string, number>;
}

export interface RunSummary {
  outcome: "victory" | "defeat";
  floors: number;
  kills: number;
  gold: number;
  xp: number;
  shards: number;
  loreFound: string[];
  bag: GearItem[];
  /** snapshot of equipment at run end (also stashable) */
  equipment: GearItem[];
  /** Oaths sworn at the start of this run (for recap before they're cleared). */
  oaths: OathId[];
  /** Echo retention on defeat. */
  retainedGold?: number;
  hoarderKept?: GearItem;
  date: number;
  isFirstRun: boolean;
}

interface GameState {
  screen: Screen;
  player: PlayerState;
  log: string[];
  quests: QuestState[];
  meta: MetaState;
  /** populated when the player dies or wins; consumed by RunSummaryScreen */
  lastRun: RunSummary | null;
  /** active storyline id when screen === "chronicle" */
  chronicleStoryId: string | null;

  setScreen: (s: Screen) => void;
  openChronicle: (storyId: string) => void;
  startGame: (faction: FactionId, classId: ClassId, name: string) => void;
  pushLog: (msg: string) => void;
  damage: (n: number) => number;
  heal: (n: number) => void;
  rewardXp: (n: number) => void;
  rewardGold: (n: number) => void;
  rewardGems: (n: number) => void;
  addQuestItem: (id: string, count?: number) => void;
  addMaterial: (id: string, count?: number) => void;
  learnRecipe: (id: string) => void;
  acceptQuest: (id: string) => void;
  turnInQuest: (id: string) => void;
  turnInAllReady: () => void;
  buy: (itemId: string) => boolean;
  buyGem: (itemId: string) => boolean;
  use: (itemId: string) => void;
  enterDungeon: (mode?: DungeonMode, oaths?: OathId[], chronicleBoonId?: string) => void;
  armFirstHitCrit: () => void;
  consumeFirstHitCrit: () => boolean;
  exitDungeon: () => void;
  reset: () => void;
  pickSpec: (specId: string) => void;
  respec: () => boolean;
  learnTalent: (node: TalentNode) => boolean;
  learnSkill: (node: { id: string; cost: number; requires?: string; effect: { kind: string; atk?: number; mag?: number; maxHp?: number } & Record<string, unknown> }) => boolean;
  addToBag: (item: GearItem) => boolean;
  equip: (itemId: string) => void;
  unequip: (slot: GearSlot) => void;
  discardBagItem: (itemId: string) => void;
  sellBagItem: (itemId: string) => void;
  pickProfession: (id: ProfessionId) => void;
  switchProfession: (id: ProfessionId) => void;
  claimIdleProfession: () => { mat: string; gained: number } | null;
  craft: (recipeId: string) => boolean;
  sellMaterial: (id: string) => void;
  buyRecipe: (id: string) => boolean;
  toggleChampion: () => void;
  buyCosmetic: (id: string) => boolean;
  equipCosmetic: (id: string) => void;
  restoreBetweenRooms: () => void;
  useRacial: () => boolean;
  consumeNextAttackMult: () => void;
  armNextAttack: (mult: number) => void;
  applyWeakness: (turns: number) => void;
  tickWeakness: () => void;
  recordKill: (enemyId: string, opts?: { boss?: boolean; shardValue?: number; loreId?: string; itemDropId?: string }) => void;
  useHearthstone: () => boolean;
  stashItem: (itemId: string, fromEquipment?: GearSlot) => boolean;
  withdrawStash: (idx: number) => boolean;
  spendEcho: (nodeId: string) => boolean;
  respecEcho: () => void;
  wipeCharacter: () => void;
  finishRun: (outcome: "victory" | "defeat") => void;
  markSeenWipeIntro: () => void;
  markTutorialSeen: (id: string, all?: boolean) => void;
  hydrateMeta: () => void;
  unlockClass: (classId: ClassId, opts?: { devFree?: boolean }) => boolean;
  devGrantClassLegendary: () => boolean;
  devGrantRandomEpic: () => boolean;
  devGrantGold: (n: number) => void;
  devGrantAllMaterials: () => void;
  devUnlockDemonHunter: () => void;
  devGrantFelResidue: () => void;
  devResetChronicles: () => void;
  setOption: <K extends keyof MetaOptions>(key: K, value: MetaOptions[K]) => void;
  // ── Pass 4: contracts, relics, bosses ──
  ensureDailyRoll: () => void;
  acceptDailyContract: () => void;
  claimDailyContract: () => boolean;
  ensureRelicRoll: () => void;
  purchaseRelic: (idx: number) => boolean;
  markBossSeen: (bossId: string) => void;
  bumpDailyFloor: (floor: number) => void;
  applyDungeonBuff: (buff: BuffEffect) => void;
  markEliteRetreat: () => void;
  /** Tick all ability CDs down by 1; optionally arm one ability's full cooldown. */
  advanceAbilityCooldowns: (usedId?: string, turns?: number) => void;
  spendResource: (amount: number) => boolean;
  gainResource: (amount: number) => void;
  gainResourceFromDamageDealt: (amount: number, opts?: { spenderAbility?: boolean }) => void;
  tickResourceRegenTurn: () => void;
}

const emptyPlayer = (): PlayerState => ({
  name: "Wanderer", faction: null, classId: null, specId: null,
  level: 1, xp: 0, hp: 30, maxHp: 30, atk: 5, mag: 1, crit: 0, dodge: 0, block: 0,
  hpRegen: 0, manaRegen: 0, xpGainPct: 0, armor: 0, weaponMin: 0, weaponMax: 0, attackSpeed: 0,
  resource: 0, maxResource: 0,
  baseMaxHp: 30, baseAtk: 5, baseMag: 1,
  gold: 50, gems: 0, inventory: [], questItems: {}, dungeonDepth: 0,
  skillPoints: 0, learnedSkills: [], talentPoints: 0, learnedTalents: [], earnedSkillForLevel: 0,
  equipment: {}, bag: [],
  profession: null, profLevel: 1, profXp: 0, materials: {}, knownRecipes: [], profIdleSince: 0,
  isChampion: false, ownedCosmetics: [], equippedCosmetics: {},
  racialUsed: 0, racialMax: 1, nextAttackMult: 1,
  runKills: 0, runGold: 0, runXp: 0, runShards: 0,
  activeBuffs: [], buffGoldMult: 1, firstHitCritArmed: false,
  dungeonMode: "normal", affixes: [], weaknessTurns: 0,
  activeOaths: [],
  dungeonBuffs: [],
  eliteRetreatUsed: false,
  abilityCooldowns: {},
});

const xpForLevel = (lvl: number) => lvl * 25;

function sumGearStats(equipment: PlayerState["equipment"]) {
  return sumEquipmentBonuses(equipment);
}

function sumTalentStats(learnedIds: string[], specId: string | null) {
  return sumTalentStatBonuses(specId, learnedIds);
}

function sumBuffStats(buffs: BuffEffect[]) {
  const s = { atk: 0, mag: 0, maxHp: 0, crit: 0, dodge: 0 };
  for (const b of buffs) {
    s.atk += b.atk ?? 0;
    s.mag += b.mag ?? 0;
    s.maxHp += b.maxHp ?? 0;
    s.crit += b.crit ?? 0;
    s.dodge += b.dodge ?? 0;
  }
  return s;
}

function echoCombatBonuses(meta: MetaState | undefined, faction: FactionId | null) {
  if (!meta || !faction) return { crit: 0, dodge: 0 };
  const perFive = Math.floor(meta.account.level / 5);
  return {
    dodge: hasEcho(meta, "oath_bulwark") && faction === "allies" ? perFive : 0,
    crit: hasEcho(meta, "oath_warmarch") && faction === "brigade" ? perFive : 0,
  };
}

function resourceSnap(p: PlayerState): ResourceSnapshot {
  return {
    classId: p.classId,
    specId: p.specId,
    resource: p.resource,
    maxResource: p.maxResource,
    mag: p.mag,
    level: p.level,
    dungeonDepth: p.dungeonDepth,
  };
}

function recompute(p: PlayerState, meta?: MetaState): PlayerState {
  const gear = sumGearStats(p.equipment);
  const tal = sumTalentStats(p.learnedTalents, p.specId);
  const fp = p.faction ? FACTIONS.find((x) => x.id === p.faction)?.passives : undefined;
  const db = sumBuffStats(p.dungeonBuffs ?? []);
  const echo = echoCombatBonuses(meta, p.faction);
  const maxHp = p.baseMaxHp + gear.maxHp + tal.maxHp + db.maxHp;
  const atk = p.baseAtk + gear.atk + tal.atk + db.atk;
  const mag = p.baseMag + gear.mag + tal.mag + db.mag;
  const crit = Math.round((fp?.crit ?? 0) + gear.crit + tal.crit + db.crit + echo.crit);
  const dodge = Math.round((fp?.dodge ?? 0) + gear.dodge + tal.dodge + db.dodge + echo.dodge);
  const block = Math.round(gear.block);
  const partial = {
    ...p,
    maxHp,
    atk,
    mag,
    crit,
    dodge,
    block,
    hpRegen: gear.hpRegen,
    manaRegen: gear.manaRegen,
    xpGainPct: gear.xpGainPct,
    armor: Math.floor(gear.armor),
    weaponMin: gear.weaponMin,
    weaponMax: gear.weaponMax,
    attackSpeed: gear.attackSpeed,
    hp: Math.min(p.hp, maxHp),
  };
  const maxResource = computeMaxResource(resourceSnap({ ...partial, maxResource: 0 }));
  return {
    ...partial,
    maxResource,
    resource: clampResource(p.resource, maxResource),
  };
}

function bagCap(p: PlayerState, meta: MetaState) {
  const echo = echoStart(meta);
  return (p.isChampion ? BAG_SIZE_CHAMPION : BAG_SIZE_BASE) + echo.bonusBag;
}

/** Potions in inventory occupy bag slots (1 per draught). */
function potionSlotsUsed(p: PlayerState) {
  let slots = 0;
  for (const id of p.inventory) {
    const item = VENDOR_ITEMS.find((i) => i.id === id);
    if (item?.kind === "potion") slots += 1;
  }
  return slots;
}

/** Count how many bag slots are currently in use — gear + material stacks (every
 *  MATERIAL_STACK_SIZE units of a given material id occupies one slot) + potions. */
function bagSlotsUsed(p: PlayerState) {
  let used = p.bag.length + potionSlotsUsed(p);
  for (const n of Object.values(p.materials)) {
    if (n > 0) used += Math.ceil(n / MATERIAL_STACK_SIZE);
  }
  return used;
}

function bagFreeSlots(p: PlayerState, meta: MetaState) {
  return Math.max(0, bagCap(p, meta) - bagSlotsUsed(p));
}

/** Builds a fresh PlayerState for a given identity, applying faction passives,
 *  Echo Tree starting bonuses, and auto-equipping/bagging the heirloom stash. */
function buildFreshPlayer(
  faction: FactionId, classId: ClassId, name: string,
  meta: MetaState, prev?: PlayerState,
): PlayerState {
  const c = CLASSES.find((x) => x.id === classId)!;
  const f = FACTIONS.find((x) => x.id === faction)!;
  const fp = f.passives;
  const echo = echoStart(meta);

  // Heirlooms: auto-equip to empty slots, rest go to bag.
  const equipment: PlayerState["equipment"] = {};
  const bag: GearItem[] = [];
  for (const h of meta.stash) {
    if (!equipment[h.slot]) equipment[h.slot] = h;
    else bag.push(h);
  }
  if (meta.pendingHoarderItem) {
    bag.push(meta.pendingHoarderItem);
  }

  // Default starting purse is 50g for a brand-new character. If this is a
  // wipe-respawn and Buried Coin is learned, carry a fraction of the prior
  // gold instead — even if that's less than 50.
  const startGold = prev
    ? Math.floor(prev.gold * echo.retainGoldPct)
    : 50;

  const startLevel = echo.startLevel;
  const levelBonusHp = (startLevel - 1) * 6;
  const levelBonusAtk = startLevel - 1;
  const levelBonusMag = startLevel - 1;

  const base: PlayerState = {
    ...emptyPlayer(),
    name: name || "Wanderer",
    faction, classId,
    level: startLevel,
    baseMaxHp: c.hp + (fp.maxHp ?? 0) + echo.bonusMaxHp + levelBonusHp,
    baseAtk:   c.atk + (fp.atk ?? 0) + echo.bonusAtk + levelBonusAtk,
    baseMag:   c.mag + (fp.mag ?? 0) + levelBonusMag,
    hp:        c.hp + (fp.maxHp ?? 0) + echo.bonusMaxHp + levelBonusHp,
    maxHp:     c.hp + (fp.maxHp ?? 0) + echo.bonusMaxHp + levelBonusHp,
    atk:       c.atk + (fp.atk ?? 0) + echo.bonusAtk + levelBonusAtk,
    mag:       c.mag + (fp.mag ?? 0) + levelBonusMag,
    crit:      fp.crit ?? 0,
    dodge:     fp.dodge ?? 0,
    inventory: [...echo.startingPotions],
    gold:      startGold,
    gems:      prev?.gems ?? 0, // gems persist across wipes — they're a real-money proxy
    isChampion: prev?.isChampion ?? false,
    ownedCosmetics: prev?.ownedCosmetics ?? [],
    equippedCosmetics: prev?.equippedCosmetics ?? {},
    racialMax: racialChargesForLevel(meta.account.level),
    equipment, bag,
  };
  return recompute(base, meta);
}

function persistMeta(meta: MetaState) { saveMeta(meta); }

function grantAccountXp(meta: MetaState, n: number): MetaState {
  if (meta.account.level >= ACCOUNT_LEVEL_CAP) return meta;
  const prevLevel = meta.account.level;
  let { xp, level } = meta.account;
  xp += n;
  while (xp >= accountXpForLevel(level) && level < ACCOUNT_LEVEL_CAP) {
    xp -= accountXpForLevel(level);
    level += 1;
  }
  let echoRespecTokens = meta.echoRespecTokens ?? 0;
  if (prevLevel < 13 && level >= 13) echoRespecTokens += 1;
  return { ...meta, account: { xp, level }, echoRespecTokens };
}

// Start with emptyMeta on both server and first client render to avoid
// hydration mismatch; the real meta is loaded via hydrateMeta() in an effect.
export const useGame = create<GameState>((set, get) => ({
  screen: "title",
  player: emptyPlayer(),
  log: [],
  quests: [],
  meta: emptyMeta(),
  lastRun: null,
  chronicleStoryId: null,

  setScreen: (screen) => set({ screen }),
  openChronicle: (storyId) => set({ chronicleStoryId: storyId, screen: "chronicle" }),

  startGame: (faction, classId, name) => {
    const meta = get().meta;
    // Mark class as "ever played" so it stays unlocked even before account level catches up.
    const unlocked = meta.unlockedClasses.includes(classId)
      ? meta.unlockedClasses
      : [...meta.unlockedClasses, classId];
    // Codex tracking — first time playing this class / faction.
    const collection = {
      ...meta.collection,
      classesPlayed: meta.collection.classesPlayed.includes(classId)
        ? meta.collection.classesPlayed
        : [...meta.collection.classesPlayed, classId],
      factionsPlayed: meta.collection.factionsPlayed.includes(faction)
        ? meta.collection.factionsPlayed
        : [...meta.collection.factionsPlayed, faction],
    };
    // Consume heirloom stash: items are moved into the new character below,
    // so clear it from meta so the next wipe doesn't duplicate them.
    const player = buildFreshPlayer(faction, classId, name, meta);
    const nextMeta = {
      ...meta,
      unlockedClasses: unlocked,
      collection,
      stash: [],
      pendingHoarderItem: meta.pendingHoarderItem ? null : meta.pendingHoarderItem,
    };
    persistMeta(nextMeta);
    const f = FACTIONS.find((x) => x.id === faction)!;
    set({
      meta: nextMeta,
      screen: "intro",
      player,
      log: [`${player.name} arrives in the city. ${f.passiveLabel}`],
      quests: [],
      lastRun: null,
    });
  },

  pushLog: (msg) => set((s) => ({ log: [...s.log.slice(-40), msg] })),

  damage: (n) => {
    const p = get().player;
    if (p.dodge > 0 && Math.random() * 100 < p.dodge) {
      get().pushLog("✦ You dodge the blow!");
      return 0;
    }
    let dmg = n;
    if (p.block > 0 && Math.random() * 100 < p.block) {
      dmg = Math.max(1, Math.floor(dmg * 0.5));
      get().pushLog("⛨ Your shield blocks half the blow!");
    }
    const hpAfter = Math.max(0, p.hp - dmg);
    // Phoenix Feather intercept: if owned and damage would reach 0, consume one and revive at 50% maxHp.
    if (hpAfter <= 0) {
      const featherIdx = p.inventory.indexOf("phoenix");
      if (featherIdx !== -1) {
        const inv = [...p.inventory];
        inv.splice(featherIdx, 1);
        const revived = Math.max(1, Math.floor(p.maxHp * 0.5));
        set({ player: { ...p, hp: revived, inventory: inv } });
        get().pushLog("✦ Phoenix Feather ignites — you are pulled back from the dark.");
        // Report only the HP actually shed (the killing blow before the revive).
        return p.hp;
      }
    }
    set({ player: { ...p, hp: hpAfter } });
    const taken = p.hp - hpAfter;
    if (taken > 0 && p.dungeonDepth > 0 && p.classId) {
      const def = resourceDef(p.classId);
      if (def?.kind === "rage") {
        get().gainResource(rageFromDamage(taken));
      } else if (def?.kind === "fury" && p.specId === "vengeance") {
        get().gainResource(furyFromDamageTaken(taken));
      }
    }
    return taken;
  },
  heal: (n) => set((s) => ({ player: { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + n) } })),

  rewardGold: (n) => {
    const s = get();
    const champBonus = s.player.isChampion ? Math.floor(n * 0.5) : 0;
    const echo = echoStart(s.meta);
    const oathMult = s.player.activeOaths.includes("greedy") ? 1.3 : 1;
    const total = Math.floor((n + champBonus) * echo.goldMult * (s.player.buffGoldMult || 1) * oathMult);
    const nextMeta: MetaState = {
      ...s.meta,
      lifetime: { ...s.meta.lifetime, goldEarned: s.meta.lifetime.goldEarned + total },
    };
    persistMeta(nextMeta);
    set({
      meta: nextMeta,
      player: { ...s.player, gold: s.player.gold + total, runGold: s.player.runGold + total },
    });
  },
  rewardGems: (n) => set((s) => ({ player: { ...s.player, gems: s.player.gems + n } })),

  rewardXp: (n) => {
    const p = get().player;
    const meta = get().meta;
    const echo = echoStart(meta);
    const champBonus = p.isChampion ? Math.floor(n * 0.5) : 0;
    const oathXp = p.activeOaths.includes("deep") ? 1.2 : 1;
    const intXp = 1 + p.xpGainPct / 100;
    const total = Math.floor((n + champBonus) * echo.xpMult * oathXp * intXp);
    let xp = p.xp + total;
    let level = p.level;
    let baseMaxHp = p.baseMaxHp;
    let baseAtk = p.baseAtk;
    let baseMag = p.baseMag;
    let talentPoints = p.talentPoints;
    let earnedSkillForLevel = p.earnedSkillForLevel;
    while (xp >= xpForLevel(level) && level < 10) {
      xp -= xpForLevel(level);
      level += 1;
      baseMaxHp += 6;
      baseAtk += 1;
      baseMag += 1;
      get().pushLog(`★ Level up! Now level ${level}.`);
      if (level >= 3 && level > earnedSkillForLevel) {
        talentPoints += 1;
        earnedSkillForLevel = level;
        get().pushLog(`✦ Talent point earned — visit your trainer.`);
      }
    }
    const next = recompute({
      ...p, xp, level, baseMaxHp, baseAtk, baseMag, talentPoints, earnedSkillForLevel,
      hp: Math.min(p.hp + 5, baseMaxHp),
      runXp: p.runXp + total,
    }, meta);
    set({ player: next });
    // Account XP trickles in too
    const nextMeta = grantAccountXp(meta, Math.max(1, Math.floor(total * 0.25)));
    if (nextMeta !== meta) { persistMeta(nextMeta); set({ meta: nextMeta }); }
  },

  addQuestItem: (id, count = 1) => {
    const p = get().player;
    const nextItems = { ...p.questItems, [id]: (p.questItems[id] ?? 0) + count };
    set({ player: { ...p, questItems: nextItems } });
    const quests = get().quests.map((q) => {
      if (q.turnedIn || q.completed) return q;
      const def = QUESTS.find((d) => d.id === q.id)!;
      if (def.target.itemId !== id) return q;
      const progress = Math.min(def.target.count, q.progress + count);
      const completed = progress >= def.target.count;
      if (completed && !q.completed) get().pushLog(`✓ Quest ready to turn in: ${def.name}`);
      return { ...q, progress, completed };
    });
    set({ quests });
  },

  addMaterial: (id, count = 1) => {
    const p = get().player;
    const meta = get().meta;
    const cur = p.materials[id] ?? 0;
    const slotsBefore = Math.ceil(cur / MATERIAL_STACK_SIZE);
    // Cap by free bag space — only new SLOTS cost capacity, not new units within a stack.
    const free = bagFreeSlots(p, meta);
    let take = count;
    // Maximum we can add until the next slot tips over what's free.
    const maxByFree = (slotsBefore + free) * MATERIAL_STACK_SIZE - cur;
    if (take > maxByFree) {
      if (maxByFree <= 0) { get().pushLog(`Bag full — could not pick up ${MATERIALS[id]?.name ?? id}.`); return; }
      get().pushLog(`Bag full — only picked up ${maxByFree} of ${count}× ${MATERIALS[id]?.name ?? id}.`);
      take = maxByFree;
    }
    const nextCount = cur + take;
    const mats = { ...p.materials, [id]: nextCount };
    set({ player: { ...p, materials: mats } });
    const quests = get().quests.map((q) => {
      if (q.turnedIn || q.completed) return q;
      const def = QUESTS.find((d) => d.id === q.id)!;
      if (def.target.itemId !== id) return q;
      const progress = Math.min(def.target.count, q.progress + take);
      const completed = progress >= def.target.count;
      if (completed && !q.completed) get().pushLog(`✓ Quest ready to turn in: ${def.name}`);
      return { ...q, progress, completed };
    });
    set({ quests });
  },

  learnRecipe: (id) => {
    const p = get().player;
    if (p.knownRecipes.includes(id)) return;
    set({ player: { ...p, knownRecipes: [...p.knownRecipes, id] } });
    const r = RECIPES.find((x) => x.id === id);
    if (r) get().pushLog(`Recipe learned: ${r.name}`);
  },

  acceptQuest: (id) => {
    const exists = get().quests.find((q) => q.id === id);
    if (exists) return;
    const activeCount = get().quests.filter((q) => !q.turnedIn).length;
    if (activeCount >= MAX_ACTIVE_QUESTS) {
      get().pushLog(`Quest log full (${MAX_ACTIVE_QUESTS}/${MAX_ACTIVE_QUESTS}). Turn one in first.`);
      return;
    }
    const def = QUESTS.find((d) => d.id === id)!;
    // One chronicle at a time: if this quest is part of a story arc, refuse if
    // any other story arc has accepted-but-not-finished quests.
    if (def.storyId) {
      const blocking = get().quests.find((q) => {
        if (q.turnedIn) return false;
        const qd = QUESTS.find((d) => d.id === q.id);
        return qd?.storyId && qd.storyId !== def.storyId;
      });
      if (blocking) {
        const bd = QUESTS.find((d) => d.id === blocking.id);
        get().pushLog(`Another chronicle is already underway — finish "${bd?.name ?? "it"}" first.`);
        return;
      }
    }
    // Seed progress from anything the player is already carrying so collecting
    // items before accepting the quest still counts.
    const p = get().player;
    const carried = (p.questItems[def.target.itemId] ?? 0) + (p.materials[def.target.itemId] ?? 0);
    const progress = Math.min(def.target.count, carried);
    const completed = progress >= def.target.count;
    set((s) => ({ quests: [...s.quests, { id, progress, completed, turnedIn: false }] }));
    get().pushLog(`Quest accepted: ${def.name}`);
    if (completed) get().pushLog(`✓ Quest ready to turn in: ${def.name}`);
  },

  turnInQuest: (id) => {
    const q = get().quests.find((x) => x.id === id);
    if (!q || !q.completed || q.turnedIn) return;
    const def = QUESTS.find((d) => d.id === id)!;
    const p = get().player;
    const targetId = def.target.itemId;
    const need = def.target.count;
    const haveQuest = p.questItems[targetId] ?? 0;
    const haveMat = p.materials[targetId] ?? 0;
    if (haveQuest + haveMat < need) {
      get().pushLog(`You no longer have enough ${def.target.label}.`);
      return;
    }
    const items = { ...p.questItems };
    const mats = { ...p.materials };
    let remain = need;
    const fromQuest = Math.min(haveQuest, remain);
    if (fromQuest > 0) { items[targetId] = haveQuest - fromQuest; remain -= fromQuest; }
    if (remain > 0) { mats[targetId] = haveMat - remain; }
    set({
      player: { ...p, questItems: items, materials: mats },
      quests: get().quests.map((x) => x.id === id ? { ...x, turnedIn: true } : x),
    });
    get().rewardGold(def.rewardGold);
    get().rewardXp(def.rewardXp);
    get().pushLog(`Turned in ${def.name}. +${def.rewardGold}g +${def.rewardXp}xp`);
    if (def.unlocksClass) {
      const meta = get().meta;
      if (!meta.ownedClasses.includes(def.unlocksClass) && !meta.unlockedClasses.includes(def.unlocksClass)) {
        get().unlockClass(def.unlocksClass, { devFree: true });
        get().pushLog(`✦ A new path opens — return to the title screen to play the ${def.unlocksClass.toUpperCase()}.`);
      }
    }
    if (def.storyId) {
      const arcQuests = QUESTS.filter((q) => q.storyId === def.storyId);
      const maxStep = Math.max(...arcQuests.map((q) => q.storyStep ?? 0));
      if ((def.storyStep ?? 0) >= maxStep) {
        const meta = get().meta;
        if (!meta.completedChronicles.includes(def.storyId)) {
          const boon = CHRONICLE_BOONS.find((b) => b.storyId === def.storyId);
          const nextMeta = { ...meta, completedChronicles: [...meta.completedChronicles, def.storyId] };
          persistMeta(nextMeta);
          set({ meta: nextMeta });
          if (boon) get().pushLog(`✦ Chronicle complete — ${boon.name} available before your next descent.`);
        }
      }
    }
  },

  buy: (itemId) => {
    const item = VENDOR_ITEMS.find((i) => i.id === itemId);
    if (!item || item.gemPrice) return false;
    const p = get().player;
    if (p.gold < item.price) return false;
    // Buff items go into a queued blessings list; they bake in on enterDungeon.
    if (item.kind === "buff" && item.buff) {
      set({ player: { ...p, gold: p.gold - item.price, activeBuffs: [...p.activeBuffs, item.buff] } });
      get().pushLog(`Blessing queued: ${item.name}.`);
      return true;
    }
    if (item.kind === "potion" && bagFreeSlots(p, get().meta) <= 0) {
      get().pushLog("Bag full — no room for potions.");
      return false;
    }
    const next: PlayerState = { ...p, gold: p.gold - item.price, inventory: [...p.inventory, itemId] };
    if (item.kind === "weapon" && item.atk) next.baseAtk = p.baseAtk + item.atk;
    set({ player: recompute(next, get().meta) });
    get().pushLog(`Bought ${item.name}.`);
    return true;
  },

  buyGem: (itemId) => {
    const item = VENDOR_ITEMS.find((i) => i.id === itemId);
    if (!item || !item.gemPrice) return false;
    const p = get().player;
    if (p.gems < item.gemPrice) return false;
    if (item.kind === "potion" && bagFreeSlots(p, get().meta) <= 0) {
      get().pushLog("Bag full — no room for potions.");
      return false;
    }
    set({ player: { ...p, gems: p.gems - item.gemPrice, inventory: [...p.inventory, itemId] } });
    get().pushLog(`Acquired ${item.name}.`);
    return true;
  },

  use: (itemId) => {
    const item = VENDOR_ITEMS.find((i) => i.id === itemId);
    if (!item || item.kind !== "potion") return;
    const p = get().player;
    if (p.activeOaths.includes("silent") && p.dungeonDepth > 0) {
      get().pushLog("Silent Oath — potions are sealed.");
      return;
    }
    const idx = p.inventory.indexOf(itemId);
    if (idx === -1) return;
    const inv = [...p.inventory];
    inv.splice(idx, 1);
    set({ player: { ...p, inventory: inv, hp: Math.min(p.maxHp, p.hp + (item.heal ?? 0)) } });
    get().pushLog(`Drank ${item.name}. +${item.heal} HP.`);
  },

  enterDungeon: (mode = "normal", oaths = [], chronicleBoonId) => {
    set((s) => {
      const boonDef = chronicleBoonId
        ? CHRONICLE_BOONS.find((b) => b.id === chronicleBoonId)
        : undefined;
      const boonBuff = boonDef?.buff;
      const townBuffs = s.player.activeBuffs ?? [];
      const descentBuffs = boonBuff ? [...townBuffs, boonBuff] : townBuffs;
      const bAtk = descentBuffs.reduce((a, b) => a + (b.atk ?? 0), 0);
      const bMag = descentBuffs.reduce((a, b) => a + (b.mag ?? 0), 0);
      const bHp  = descentBuffs.reduce((a, b) => a + (b.maxHp ?? 0), 0);
      const bDodge = descentBuffs.reduce((a, b) => a + (b.dodge ?? 0), 0);
      const bGold = 1 + descentBuffs.reduce((a, b) => a + (b.goldMult ?? 0), 0);
      const ironWill = hasEcho(s.meta, "iron_will") ? 1 : 0;
      const affixes = mode === "cursed" ? rollAffixes(2)
        : mode === "ascension" ? rollAscensionAffixes()
        : [];
      const startDepth = oaths.includes("deep") ? 3 : 1;
      const p = recompute({
        ...s.player,
        dungeonDepth: startDepth,
        racialUsed: 0,
        racialMax: racialChargesForLevel(s.meta.account.level) + ironWill,
        nextAttackMult: 1,
        firstHitCritArmed: false,
        runKills: 0, runGold: 0, runXp: 0, runShards: 0,
        baseMaxHp: s.player.baseMaxHp + bHp,
        baseAtk:   s.player.baseAtk + bAtk,
        baseMag:   s.player.baseMag + bMag,
        hp:        s.player.hp + bHp,
        buffGoldMult: bGold,
        dungeonMode: mode,
        affixes,
        weaknessTurns: 0,
        activeOaths: oaths,
        dungeonBuffs: [],
        eliteRetreatUsed: false,
        abilityCooldowns: {},
        activeBuffs: townBuffs,
      }, s.meta);
      const withDodge = bDodge > 0 ? { ...p, dodge: p.dodge + bDodge } : p;
      const startResource = combatStartResource(resourceSnap(withDodge));
      let nextPlayer = { ...withDodge, resource: startResource };
      if (!s.meta.hasCompletedFirstRun && !withDodge.inventory.includes("hearth")) {
        nextPlayer = { ...withDodge, inventory: [...withDodge.inventory, "hearth"] };
      }
      return { screen: "dungeon", player: nextPlayer };
    });
    if (chronicleBoonId) {
      const boon = CHRONICLE_BOONS.find((b) => b.id === chronicleBoonId);
      if (boon) get().pushLog(`✦ Chronicle boon active: ${boon.name}.`);
    }
    if ((get().player.activeBuffs ?? []).length > 0) get().pushLog("✦ Town blessings infuse your gear.");
    if (!get().meta.hasCompletedFirstRun && get().player.inventory.includes("hearth")) {
      get().pushLog("✦ A Hearthstone Charm is pressed into your palm — use it to bail out if the descent turns sour.");
    }
    if (mode === "cursed") get().pushLog(`☠ Cursed Depths — affixes rolled: ${get().player.affixes.join(", ")}.`);
    if (mode === "ascension") get().pushLog(`☀ Ascension — lingering curses: ${get().player.affixes.join(", ")}.`);
    if (oaths.length > 0) get().pushLog(`✦ Oaths sworn: ${oaths.join(", ")}.`);
    get().pushLog("You descend into darkness...");
  },

  armFirstHitCrit: () => {
    const meta = get().meta;
    if (!echoStart(meta).echoLight) return;
    const p = get().player;
    if (p.firstHitCritArmed) return;
    set({ player: { ...p, firstHitCritArmed: true } });
  },

  consumeFirstHitCrit: () => {
    const p = get().player;
    if (!p.firstHitCritArmed) return false;
    set({ player: { ...p, firstHitCritArmed: false } });
    return true;
  },
  exitDungeon: () => {
    set((s) => {
      const buffs = s.player.activeBuffs ?? [];
      const bAtk = buffs.reduce((a, b) => a + (b.atk ?? 0), 0);
      const bMag = buffs.reduce((a, b) => a + (b.mag ?? 0), 0);
      const bHp  = buffs.reduce((a, b) => a + (b.maxHp ?? 0), 0);
      const p = recompute({
        ...s.player,
        dungeonDepth: 0,
        baseMaxHp: s.player.baseMaxHp - bHp,
        baseAtk:   s.player.baseAtk - bAtk,
        baseMag:   s.player.baseMag - bMag,
        hp:        Math.max(1, s.player.hp - bHp),
        activeBuffs: [],
        buffGoldMult: 1,
        activeOaths: [],
        dungeonBuffs: [],
        abilityCooldowns: {},
        resource: 0,
      });
      return { screen: "city", player: recompute(p, s.meta) };
    });
    get().pushLog("You return to the city.");
  },
  reset: () => set({ screen: "title", player: emptyPlayer(), log: [], quests: [], lastRun: null }),

  pickSpec: (specId) => {
    const p = get().player;
    if (p.specId) return;
    const def = SPECS.find((s) => s.id === specId);
    if (!def || def.classId !== p.classId) return;
    set({ player: { ...p, specId } });
    get().pushLog(`Specialization chosen: ${def.name}.`);
  },

  respec: () => {
    const p = get().player;
    if (!p.specId) return false;
    const cost = p.isChampion ? 0 : RESPEC_GOLD_COST;
    if (p.gold < cost) return false;
    const refund = p.learnedTalents.length;
    const next = recompute({
      ...p, gold: p.gold - cost, specId: null, learnedTalents: [],
      talentPoints: p.talentPoints + refund,
    }, get().meta);
    set({ player: next });
    get().pushLog(`Respec'd. ${refund} point${refund===1?"":"s"} refunded${cost ? ` for ${cost}g` : " (free)"}.`);
    return true;
  },

  learnTalent: (node) => {
    const p = get().player;
    if (!p.specId) return false;
    if (p.learnedTalents.includes(node.id)) return false;
    if (node.requires && !p.learnedTalents.includes(node.requires)) return false;
    if (p.talentPoints < 1) return false;
    // Capstones are mutually exclusive — only one per spec.
    if (node.capstone) {
      const tree = TALENT_TREES[p.specId];
      const hasCapstone = tree.some((n) => n.capstone && p.learnedTalents.includes(n.id));
      if (hasCapstone) { get().pushLog("Only one capstone may be chosen. Respec to change."); return false; }
    }
    const next = recompute({ ...p, talentPoints: p.talentPoints - 1, learnedTalents: [...p.learnedTalents, node.id] }, get().meta);
    set({ player: next });
    get().pushLog(`Learned talent: ${node.name}.`);
    return true;
  },

  learnSkill: (node) => {
    const p = get().player;
    if (p.learnedSkills.includes(node.id)) return false;
    if (node.requires && !p.learnedSkills.includes(node.requires)) return false;
    if (p.skillPoints < node.cost) return false;
    let { baseMaxHp, baseAtk, baseMag } = p;
    if (node.effect.kind === "stat") {
      baseMaxHp += (node.effect.maxHp as number) ?? 0;
      baseAtk += (node.effect.atk as number) ?? 0;
      baseMag += (node.effect.mag as number) ?? 0;
    }
    const next = recompute({
      ...p, skillPoints: p.skillPoints - node.cost,
      learnedSkills: [...p.learnedSkills, node.id], baseMaxHp, baseAtk, baseMag,
    }, get().meta);
    set({ player: next });
    const trainer = p.classId ? TRAINERS[p.classId] : null;
    get().pushLog(`Learned ${(node as { name?: string }).name ?? "skill"}${trainer ? ` from ${trainer.name}` : ""}.`);
    return true;
  },

  addToBag: (item) => {
    const p = get().player;
    const meta = get().meta;
    // Auto-sell common/junk if the option is on — bypasses bag pressure entirely.
    if (meta.options.autoSellCommon && item.rarity === "common") {
      const price = gearSellPrice(item);
      set({ player: { ...p, gold: p.gold + price } });
      get().pushLog(`Auto-sold ${item.name} for ${price}g.`);
      return true;
    }
    if (bagFreeSlots(p, meta) <= 0) { get().pushLog("Bag full."); return false; }
    // Lifetime tracking: legendaries (per-class collection + global counter).
    let nextMeta = meta;
    if (item.rarity === "legendary") {
      const legendaryClasses = p.classId && !meta.collection.legendaryClasses.includes(p.classId)
        ? [...meta.collection.legendaryClasses, p.classId]
        : meta.collection.legendaryClasses;
      nextMeta = {
        ...meta,
        lifetime: { ...meta.lifetime, legendariesFound: meta.lifetime.legendariesFound + 1 },
        collection: { ...meta.collection, legendaryClasses },
      };
      persistMeta(nextMeta);
    }
    set({ meta: nextMeta, player: { ...p, bag: [...p.bag, item] } });
    return true;
  },

  equip: (itemId) => {
    const p = get().player;
    const item = p.bag.find((b) => b.id === itemId);
    if (!item) return;
    const bag = p.bag.filter((b) => b.id !== itemId);
    const prev = p.equipment[item.slot];
    if (prev) bag.push(prev);
    const equipment = { ...p.equipment, [item.slot]: item };
    set({ player: recompute({ ...p, bag, equipment }, get().meta) });
    get().pushLog(`Equipped ${item.name}.`);
  },

  unequip: (slot) => {
    const p = get().player;
    const meta = get().meta;
    const item = p.equipment[slot];
    if (!item) return;
    if (bagFreeSlots(p, meta) <= 0) { get().pushLog("Bag full."); return; }
    const equipment = { ...p.equipment };
    delete equipment[slot];
    set({ player: recompute({ ...p, bag: [...p.bag, item], equipment }, get().meta) });
    get().pushLog(`Unequipped ${item.name}.`);
  },

  discardBagItem: (itemId) => set((s) => ({ player: { ...s.player, bag: s.player.bag.filter((b) => b.id !== itemId) } })),

  sellBagItem: (itemId) => {
    const p = get().player;
    const item = p.bag.find((b) => b.id === itemId);
    if (!item) return;
    const price = gearSellPrice(item);
    set({ player: { ...p, bag: p.bag.filter((b) => b.id !== itemId), gold: p.gold + price } });
    get().pushLog(`Sold ${item.name} for ${price}g.`);
  },

  pickProfession: (id) => {
    const p = get().player;
    if (p.profession) return;
    set({ player: { ...p, profession: id, profIdleSince: Date.now() } });
    get().pushLog(`Took up ${id}.`);
  },

  switchProfession: (id) => {
    const p = get().player;
    if (p.profession === id) return;
    set({ player: {
      ...p,
      profession: id,
      profLevel: 1, profXp: 0,
      materials: {}, knownRecipes: [],
      profIdleSince: Date.now(),
    } });
    get().pushLog(`Abandoned old craft. Took up ${id} — progress reset.`);
  },

  claimIdleProfession: () => {
    const p = get().player;
    if (!p.profession || !p.profIdleSince) {
      if (p.profession && !p.profIdleSince) set({ player: { ...p, profIdleSince: Date.now() } });
      return null;
    }
    const elapsed = Math.min(IDLE_MAX_SECONDS, Math.floor((Date.now() - p.profIdleSince) / 1000));
    const gained = Math.floor(elapsed / IDLE_SECONDS_PER_UNIT);
    if (gained <= 0) return null;
    const mat = IDLE_YIELDS[p.profession];
    const consumed = gained * IDLE_SECONDS_PER_UNIT * 1000;
    const mats = { ...p.materials, [mat]: (p.materials[mat] ?? 0) + gained };
    set({ player: { ...p, materials: mats, profIdleSince: p.profIdleSince + consumed } });
    get().pushLog(`✦ Idle craft: +${gained}× ${MATERIALS[mat]?.name ?? mat}.`);
    return { mat, gained };
  },

  craft: (recipeId) => {
    const r = RECIPES.find((x) => x.id === recipeId);
    if (!r) return false;
    const p = get().player;
    if (p.profession !== r.profession) return false;
    if (!p.knownRecipes.includes(recipeId)) return false;
    if (p.profLevel < r.levelReq) return false;
    for (const [m, c] of Object.entries(r.inputs)) if ((p.materials[m] ?? 0) < c) return false;
    const mats = { ...p.materials };
    for (const [m, c] of Object.entries(r.inputs)) mats[m] -= c;
    let inv = p.inventory;
    let gold = p.gold;
    const out = r.output;
    if (out.kind === "vendor") {
      const it = VENDOR_ITEMS.find((v) => v.id === out.itemId);
      if (it?.kind === "potion" && bagFreeSlots(p, get().meta) <= 0) {
        get().pushLog("Bag full — no room for potions.");
        return false;
      }
      inv = [...inv, out.itemId];
      get().pushLog(`Crafted ${it?.name ?? r.name}.`);
    } else {
      gold += out.gold;
      get().pushLog(`Crafted and sold ${r.name}. +${out.gold}g`);
    }
    let profXp = p.profXp + r.xp;
    let profLevel = p.profLevel;
    while (profXp >= profXpForLevel(profLevel) && profLevel < 10) {
      profXp -= profXpForLevel(profLevel);
      profLevel += 1;
      get().pushLog(`★ Profession reached level ${profLevel}!`);
    }
    set({ player: { ...get().player, materials: mats, inventory: inv, gold, profXp, profLevel } });
    return true;
  },

  sellMaterial: (id) => {
    const p = get().player;
    const have = p.materials[id] ?? 0;
    if (have <= 0) return;
    const def = MATERIALS[id];
    if (!def) return;
    const mats = { ...p.materials, [id]: have - 1 };
    set({ player: { ...p, materials: mats, gold: p.gold + def.sellPrice } });
    get().pushLog(`Sold 1× ${def.name} for ${def.sellPrice}g.`);
  },

  buyRecipe: (id) => {
    const r = RECIPES.find((x) => x.id === id);
    if (!r || !r.buyPrice) return false;
    const p = get().player;
    if (p.knownRecipes.includes(id)) return false;
    if (p.gold < r.buyPrice) return false;
    set({ player: { ...p, gold: p.gold - r.buyPrice, knownRecipes: [...p.knownRecipes, id] } });
    get().pushLog(`Bought recipe: ${r.name}.`);
    return true;
  },

  toggleChampion: () => {
    const p = get().player;
    const now = !p.isChampion;
    const owned = new Set(p.ownedCosmetics);
    if (now) { owned.add("title_oathbound"); owned.add("plate_celestial"); }
    set({ player: { ...p, isChampion: now, ownedCosmetics: [...owned] } });
    get().pushLog(now ? "★ Champion's Pass activated (preview)." : "Champion's Pass deactivated.");
  },

  buyCosmetic: (id) => {
    const def = COSMETICS.find((c) => c.id === id);
    if (!def) return false;
    const p = get().player;
    if (p.ownedCosmetics.includes(id)) return false;
    if (def.championExclusive && !p.isChampion) return false;
    if (p.gems < def.priceGems) return false;
    set({ player: { ...p, gems: p.gems - def.priceGems, ownedCosmetics: [...p.ownedCosmetics, id] } });
    get().pushLog(`Acquired cosmetic: ${def.name}.`);
    return true;
  },

  equipCosmetic: (id) => {
    const p = get().player;
    if (!id) return;
    const def = COSMETICS.find((c) => c.id === id);
    if (!def) return;
    if (!p.ownedCosmetics.includes(id)) return;
    const current = p.equippedCosmetics[def.kind];
    const nextEquipped = { ...p.equippedCosmetics };
    if (current === id) delete nextEquipped[def.kind];
    else nextEquipped[def.kind] = id;
    set({ player: { ...p, equippedCosmetics: nextEquipped } });
  },

  restoreBetweenRooms: () => {
    const p = get().player;
    const starved = p.affixes?.includes("starved") ? 0.5 : 1;
    const amt = Math.max(2, Math.floor(p.maxHp * 0.12 * starved)) + Math.floor(p.hpRegen);
    const hp = Math.min(p.maxHp, p.hp + amt);
    const cds: Record<string, number> = {};
    for (const [k, v] of Object.entries(p.abilityCooldowns ?? {})) {
      if (v > 1) cds[k] = v - 1;
    }
    let resource = p.resource;
    const def = resourceDef(p.classId);
    if (def?.kind === "mana") {
      const gain = manaRegenBetweenRooms(resourceSnap(p));
      resource = clampResource(p.resource + gain, p.maxResource);
    }
    const healed = hp - p.hp;
    set({ player: { ...p, hp, resource, abilityCooldowns: cds } });
    if (healed > 0) get().pushLog(`You catch your breath. +${healed} HP.`);
    if (def?.kind === "mana" && resource > p.resource) {
      get().pushLog(`Your mana steadies. +${resource - p.resource} ${def.label}.`);
    }
  },

  useRacial: () => {
    const p = get().player;
    if (p.racialUsed >= p.racialMax || !p.faction) return false;
    const f = FACTIONS.find((x) => x.id === p.faction)!;
    const r = f.racial;
    if (r.kind === "heal_pct") {
      const amt = Math.floor(p.maxHp * r.amount);
      const hp = Math.min(p.maxHp, p.hp + amt);
      set({ player: { ...p, hp, racialUsed: p.racialUsed + 1 } });
      get().pushLog(`${r.flavor.replace("{p}", p.name)} — +${hp - p.hp} HP.`);
    } else if (r.kind === "buff_dmg") {
      set({ player: { ...p, racialUsed: p.racialUsed + 1, nextAttackMult: r.amount } });
      get().pushLog(`${r.flavor.replace("{p}", p.name)} — next attack hits harder.`);
    }
    return true;
  },

  consumeNextAttackMult: () => {
    const p = get().player;
    if (p.nextAttackMult !== 1) set({ player: { ...p, nextAttackMult: 1 } });
  },

  armNextAttack: (mult) => {
    const p = get().player;
    set({ player: { ...p, nextAttackMult: mult } });
  },

  applyWeakness: (turns) => {
    const p = get().player;
    set({ player: { ...p, weaknessTurns: Math.max(p.weaknessTurns, turns) } });
  },

  tickWeakness: () => {
    const p = get().player;
    if (p.weaknessTurns > 0) set({ player: { ...p, weaknessTurns: p.weaknessTurns - 1 } });
  },

  // ── Pass 7: meta progression ───────────────────────────────────────────
  recordKill: (enemyId, opts) => {
    const meta = get().meta;
    const p = get().player;
    const echo = echoStart(meta);
    const baseShards = opts?.shardValue ?? (opts?.boss ? 3 : (Math.random() < 0.25 ? 1 : 0));
    const oathShardMult = p.activeOaths.includes("silent") ? 1.5 : 1;
    const shards = Math.max(0, Math.floor(baseShards * echo.shardMult * oathShardMult));
    const j = meta.journal;
    const enemyKills = { ...j.enemyKills, [enemyId]: (j.enemyKills[enemyId] ?? 0) + 1 };
    const bossesDowned = opts?.boss ? { ...j.bossesDowned, [enemyId]: (j.bossesDowned[enemyId] ?? 0) + 1 } : j.bossesDowned;
    const itemsFound = opts?.itemDropId ? { ...j.itemsFound, [opts.itemDropId]: (j.itemsFound[opts.itemDropId] ?? 0) + 1 } : j.itemsFound;
    const loreFound = opts?.loreId && !j.loreFound.includes(opts.loreId) ? [...j.loreFound, opts.loreId] : j.loreFound;
    // Daily contract progress (kill_enemy / kill_boss)
    let dailyContract = meta.dailyContract;
    if (dailyContract && dailyContract.accepted && !dailyContract.claimed) {
      const def = DAILY_CONTRACTS.find((c) => c.id === dailyContract!.defId);
      if (def) {
        if (def.objective.kind === "kill_enemy" && def.objective.enemyId === enemyId) {
          dailyContract = { ...dailyContract, progress: Math.min(def.objective.count, dailyContract.progress + 1) };
        } else if (def.objective.kind === "kill_boss" && opts?.boss) {
          dailyContract = { ...dailyContract, progress: Math.min(def.objective.count, dailyContract.progress + 1) };
        }
      }
    }
    let nextMeta: MetaState = {
      ...meta,
      shards: meta.shards + shards,
      journal: { ...j, enemyKills, bossesDowned, itemsFound, loreFound },
      lifetime: opts?.boss
        ? { ...meta.lifetime, bossesKilled: meta.lifetime.bossesKilled + 1 }
        : meta.lifetime,
      dailyContract,
    };
    // Account XP feed
    nextMeta = grantAccountXp(nextMeta, opts?.boss ? 30 : 2);
    persistMeta(nextMeta);
    set((s) => ({
      meta: nextMeta,
      player: {
        ...s.player,
        runKills: s.player.runKills + 1,
        runShards: s.player.runShards + shards,
      },
    }));
    if (shards > 0) { get().pushLog(`✦ +${shards} Soul Shard${shards>1?"s":""}.`); playSfx("shard"); }
    if (opts?.loreId && loreFound !== j.loreFound) get().pushLog("✦ A lore fragment is etched into your Journal.");
  },

  useHearthstone: () => {
    const p = get().player;
    const idx = p.inventory.indexOf("hearth");
    if (idx === -1) return false;
    const inv = [...p.inventory];
    inv.splice(idx, 1);
    set({ player: { ...p, inventory: inv } });
    get().pushLog("✦ Hearthstone Charm shatters — you are pulled to the city.");
    // Bailing out still counts as having descended — unlock shop / champion gate.
    const meta = get().meta;
    if (!meta.hasCompletedFirstRun) {
      const nextMeta: MetaState = { ...meta, hasCompletedFirstRun: true };
      persistMeta(nextMeta);
      set({ meta: nextMeta });
    }
    // Treat as a successful retreat — banks rewards, no character wipe, no run summary.
    get().exitDungeon();
    return true;
  },

  stashItem: (itemId, fromEquipment) => {
    const p = get().player;
    const meta = get().meta;
    const cap = stashCapacity(meta.account.level);
    if (meta.stash.length >= cap) return false;
    let item: GearItem | undefined;
    let nextEquipment = p.equipment;
    let nextBag = p.bag;
    if (fromEquipment) {
      item = p.equipment[fromEquipment];
      if (!item) return false;
      const e = { ...p.equipment }; delete e[fromEquipment]; nextEquipment = e;
    } else {
      item = p.bag.find((b) => b.id === itemId);
      if (!item) return false;
      nextBag = p.bag.filter((b) => b.id !== itemId);
    }
    const nextMeta: MetaState = { ...meta, stash: [...meta.stash, item] };
    persistMeta(nextMeta);
    // recompute so stats drop the stashed equipment immediately.
    set({ meta: nextMeta, player: recompute({ ...p, equipment: nextEquipment, bag: nextBag }, nextMeta) });
    return true;
  },

  withdrawStash: (idx) => {
    const meta = get().meta;
    const p = get().player;
    const item = meta.stash[idx];
    if (!item) return false;
    if (bagFreeSlots(p, meta) <= 0) { get().pushLog("Bag full — cannot withdraw."); return false; }
    const nextStash = meta.stash.filter((_, i) => i !== idx);
    const nextMeta: MetaState = { ...meta, stash: nextStash };
    persistMeta(nextMeta);
    set({ meta: nextMeta, player: { ...p, bag: [...p.bag, item] } });
    get().pushLog(`Withdrew ${item.name} to bag.`);
    return true;
  },

  spendEcho: (nodeId) => {
    const meta = get().meta;
    if (hasEcho(meta, nodeId)) return false;
    const node = ECHO_TREE.find((n) => n.id === nodeId) as EchoNode | undefined;
    if (!node) return false;
    if (node.requires && !hasEcho(meta, node.requires)) return false;
    if (meta.shards < node.cost) return false;
    // Class unlock nodes also add to unlockedClasses so they appear on the title screen.
    const unlocksClass: Partial<Record<string, ClassId>> = {
      unlock_mage: "mage",
      unlock_priest: "priest",
    };
    const grantClass = unlocksClass[nodeId];
    const nextUnlocked = grantClass && !meta.unlockedClasses.includes(grantClass)
      ? [...meta.unlockedClasses, grantClass]
      : meta.unlockedClasses;
    const nextMeta: MetaState = {
      ...meta,
      shards: meta.shards - node.cost,
      echoLearned: [...meta.echoLearned, nodeId],
      unlockedClasses: nextUnlocked,
    };
    persistMeta(nextMeta);
    set({ meta: nextMeta });
    if (grantClass) get().pushLog(`✦ ${grantClass.charAt(0).toUpperCase() + grantClass.slice(1)} class permanently unlocked.`);
    return true;
  },

  respecEcho: () => {
    const meta = get().meta;
    const refund = meta.echoLearned.reduce((sum, id) => {
      const n = ECHO_TREE.find((x) => x.id === id);
      return sum + (n?.cost ?? 0);
    }, 0);
    const nextMeta: MetaState = { ...meta, echoLearned: [], shards: meta.shards + refund };
    persistMeta(nextMeta);
    set({ meta: nextMeta });
  },

  wipeCharacter: () => {
    // Called from RunSummaryScreen's Continue button.
    //   Victory → keep the character, return to the city. Bag/equipment persist.
    //   Defeat  → character is lost; clear and bounce back to character select (title).
    const last = get().lastRun;
    if (last?.outcome === "victory") {
      set({ screen: "city", lastRun: null });
      get().pushLog("You return to the city, victorious.");
      return;
    }
    // Defeat path (or unknown): full reset.
    set({
      player: emptyPlayer(),
      screen: "title",
      log: ["A new wanderer steps forward — the last did not return."],
      quests: [],
      lastRun: null,
    });
  },

  finishRun: (outcome) => {
    const p = get().player;
    const meta = get().meta;
    const echo = echoStart(meta);
    const isFirstRun = !meta.hasCompletedFirstRun;
    const j = meta.journal;
    const newDeepest = Math.max(j.deepestFloor, p.dungeonDepth);
    const bestRun = !j.bestRun || p.dungeonDepth > j.bestRun.floors
      ? { floors: p.dungeonDepth, kills: p.runKills, gold: p.runGold, date: Date.now() }
      : j.bestRun;
    // Lifetime totals (separate from per-run journal stats — survive across characters).
    const lt = meta.lifetime;
    const lifetime = {
      ...lt,
      runs: lt.runs + 1,
      deepest: Math.max(lt.deepest, p.dungeonDepth),
      deepestCursed: p.dungeonMode === "cursed" ? Math.max(lt.deepestCursed, p.dungeonDepth) : lt.deepestCursed,
      deepestAscension: p.dungeonMode === "ascension" ? Math.max(lt.deepestAscension ?? 0, p.dungeonDepth) : (lt.deepestAscension ?? 0),
    };
    // Codex: track which classes have cleared a full run (any mode).
    const classesCleared = outcome === "victory" && p.classId && !meta.collection.classesCleared.includes(p.classId)
      ? [...meta.collection.classesCleared, p.classId]
      : meta.collection.classesCleared;

    let hoarderKept: GearItem | undefined;
    let pendingHoarderItem = meta.pendingHoarderItem;
    let retainedGold: number | undefined;
    if (outcome === "defeat") {
      if (echo.retainGoldPct > 0) retainedGold = Math.floor(p.gold * echo.retainGoldPct);
      if (hasEcho(meta, "hoarder")) {
        const pool = [
          ...p.bag,
          ...(Object.values(p.equipment).filter(Boolean) as GearItem[]),
        ];
        if (pool.length > 0) {
          hoarderKept = pool[Math.floor(Math.random() * pool.length)];
          pendingHoarderItem = hoarderKept;
        }
      }
    }

    let nextMeta: MetaState = {
      ...meta,
      hasCompletedFirstRun: true,
      hasClearedNormal: meta.hasClearedNormal || (outcome === "victory" && p.dungeonMode === "normal"),
      hasClearedAscension: meta.hasClearedAscension || (outcome === "victory" && p.dungeonMode === "ascension" && p.dungeonDepth >= maxDepthForMode("ascension")),
      journal: { ...j, deepestFloor: newDeepest, bestRun, runsCompleted: j.runsCompleted + 1 },
      lifetime,
      collection: { ...meta.collection, classesCleared },
      pendingHoarderItem,
    };
    // Victory bonus shards + account XP
    let victoryShards = 0;
    if (outcome === "victory") {
      victoryShards = Math.floor(15 * echo.shardMult);
      if (p.dungeonMode === "ascension") victoryShards += 25;
      if (hasClassTrialUnlocked(meta.account.level)) {
        const trial = activeClassTrial();
        const trialMet =
          (!trial.classId || p.classId === trial.classId) &&
          (!trial.specId || p.specId === trial.specId) &&
          (trial.id !== "trial_oath" || p.activeOaths.length > 0) &&
          (trial.id !== "trial_deep" || p.dungeonDepth >= 25);
        if (trialMet) victoryShards += trial.shardBonus;
      }
      nextMeta = grantAccountXp({ ...nextMeta, shards: nextMeta.shards + victoryShards }, 50);
    } else {
      nextMeta = grantAccountXp(nextMeta, Math.max(5, p.dungeonDepth * 3));
    }
    persistMeta(nextMeta);
    const summary: RunSummary = {
      outcome,
      floors: p.dungeonDepth,
      kills: p.runKills,
      gold: p.runGold,
      xp: p.runXp,
      shards: p.runShards + victoryShards,
      loreFound: j.loreFound,
      // On defeat, gear is lost in the dungeon — only escapees keep loot.
      bag: outcome === "victory" ? [...p.bag] : [],
      equipment: outcome === "victory"
        ? (Object.values(p.equipment).filter(Boolean) as GearItem[])
        : [],
      oaths: [...p.activeOaths],
      retainedGold,
      hoarderKept,
      date: Date.now(),
      isFirstRun,
    };
    // Strip buffs so they don't linger after the run summary returns to town.
    const buffs = p.activeBuffs ?? [];
    const bAtk = buffs.reduce((a, b) => a + (b.atk ?? 0), 0);
    const bMag = buffs.reduce((a, b) => a + (b.mag ?? 0), 0);
    const bHp  = buffs.reduce((a, b) => a + (b.maxHp ?? 0), 0);
    const cleanedPlayer = recompute({
      ...p,
      baseMaxHp: p.baseMaxHp - bHp,
      baseAtk:   p.baseAtk - bAtk,
      baseMag:   p.baseMag - bMag,
      hp:        Math.max(1, p.hp - bHp),
      activeBuffs: [],
      buffGoldMult: 1,
      activeOaths: [],
      dungeonBuffs: [],
      abilityCooldowns: {},
    }, meta);
    set({ meta: nextMeta, lastRun: summary, screen: "run_summary", player: cleanedPlayer });
  },

  markSeenWipeIntro: () => {
    const meta = get().meta;
    if (meta.seenWipeIntro) return;
    const nextMeta = { ...meta, seenWipeIntro: true };
    persistMeta(nextMeta);
    set({ meta: nextMeta });
  },

  markTutorialSeen: (id, all) => {
    const meta = get().meta;
    const cur = meta.tutorialSeen ?? {};
    const next = all
      ? { ...cur, __all: true }
      : { ...cur, [id]: true };
    const nextMeta = { ...meta, tutorialSeen: next };
    persistMeta(nextMeta);
    set({ meta: nextMeta });
  },

  hydrateMeta: () => {
    // Called from a client-only useEffect after mount. Idempotent.
    if (typeof window === "undefined") return;
    const loaded = loadMeta();
    set({ meta: loaded });
  },

  unlockClass: (classId, opts) => {
    const meta = get().meta;
    if (meta.ownedClasses.includes(classId) || meta.unlockedClasses.includes(classId)) return false;
    const def = CLASSES.find((c) => c.id === classId);
    if (!def) return false;
    const p = get().player;
    const devFree = opts?.devFree ?? false;
    const price = def.gemPrice ?? 0;
    if (!devFree && price > 0) {
      if (p.gems < price) return false;
      set({ player: { ...p, gems: p.gems - price } });
    }
    const nextMeta: MetaState = { ...meta, ownedClasses: [...meta.ownedClasses, classId] };
    persistMeta(nextMeta);
    set({ meta: nextMeta });
    get().pushLog(`✦ Unlocked hero: ${def.name}${devFree ? " (dev)" : ""}.`);
    return true;
  },

  devGrantClassLegendary: () => {
    const p = get().player;
    if (!p.classId) { get().pushLog("Dev: pick a class first."); return false; }
    const owns =
      Object.values(p.equipment).some((g) => g?.rarity === "legendary") ||
      p.bag.some((g) => g.rarity === "legendary");
    if (owns) { get().pushLog("Dev: you already own a legendary."); return false; }
    const legend = rollClassLegendary(p.classId, 30);
    if (!get().addToBag(legend)) { get().pushLog("Dev: bag full."); return false; }
    get().pushLog(`✦ Dev grant: ${legend.name}.`);
    return true;
  },

  devGrantRandomEpic: () => {
    const item = rollGear(15, { source: "major_boss", minRarity: "epic" });
    if (!get().addToBag(item)) { get().pushLog("Dev: bag full."); return false; }
    get().pushLog(`Dev grant: ${item.name}.`);
    return true;
  },

  devGrantGold: (n) => {
    const p = get().player;
    set({ player: { ...p, gold: p.gold + n } });
    get().pushLog(`Dev grant: +${n}g.`);
  },

  devGrantAllMaterials: () => {
    const p = get().player;
    const mats = { ...p.materials };
    for (const id of Object.keys(MATERIALS)) mats[id] = (mats[id] ?? 0) + 10;
    set({ player: { ...p, materials: mats } });
    get().pushLog("Dev grant: +10 of every material.");
  },

  turnInAllReady: () => {
    const ready = get().quests.filter((q) => q.completed && !q.turnedIn);
    if (ready.length === 0) { get().pushLog("No quests ready to turn in."); return; }
    for (const q of ready) get().turnInQuest(q.id);
  },

  devUnlockDemonHunter: () => {
    const meta = get().meta;
    if (meta.ownedClasses.includes("demonhunter") || meta.unlockedClasses.includes("demonhunter")) {
      get().pushLog("Dev: Demon Hunter already unlocked.");
      return;
    }
    get().unlockClass("demonhunter", { devFree: true });
    get().pushLog("✦ Dev: Demon Hunter unlocked. Return to title to play.");
  },

  devGrantFelResidue: () => {
    get().addMaterial("fel_residue", 10);
    get().pushLog("Dev grant: +10 Fel Residue.");
  },

  devResetChronicles: () => {
    set({ quests: get().quests.filter((q) => {
      const def = QUESTS.find((d) => d.id === q.id);
      return !def?.storyId;
    }) });
    get().pushLog("Dev: Chronicle progress reset.");
  },

  setOption: (key, value) => {
    const meta = get().meta;
    const nextMeta: MetaState = { ...meta, options: { ...meta.options, [key]: value } };
    persistMeta(nextMeta);
    set({ meta: nextMeta });
  },

  // ── Pass 4: contracts, relics, bosses ───────────────────────────────────
  ensureDailyRoll: () => {
    const meta = get().meta;
    const now = Date.now();
    if (meta.dailyContract && now - meta.dailyContract.rolledAt < DAILY_ROTATION_MS) return;
    const seed = Math.floor(now / DAILY_ROTATION_MS);
    const def = rollDailyContract(get().player.faction ?? null, seed);
    const nextMeta: MetaState = {
      ...meta,
      dailyContract: { defId: def.id, rolledAt: now, accepted: false, progress: 0, claimed: false },
    };
    persistMeta(nextMeta); set({ meta: nextMeta });
  },

  acceptDailyContract: () => {
    const meta = get().meta;
    if (!meta.dailyContract || meta.dailyContract.accepted) return;
    const nextMeta: MetaState = { ...meta, dailyContract: { ...meta.dailyContract, accepted: true } };
    persistMeta(nextMeta); set({ meta: nextMeta });
    get().pushLog("✦ Daily contract accepted.");
  },

  claimDailyContract: () => {
    const meta = get().meta;
    const dc = meta.dailyContract;
    if (!dc || !dc.accepted || dc.claimed) return false;
    const def = DAILY_CONTRACTS.find((c) => c.id === dc.defId);
    if (!def) return false;
    const need =
      def.objective.kind === "kill_enemy" ? def.objective.count :
      def.objective.kind === "kill_boss" ? def.objective.count :
      def.objective.kind === "turn_in_material" ? def.objective.count :
      def.objective.kind === "reach_floor" ? 1 : 1;
    if (dc.progress < need) return false;
    let nextMeta: MetaState = {
      ...meta,
      shards: meta.shards + def.rewardShards,
      dailyContract: { ...dc, claimed: true },
    };
    nextMeta = grantAccountXp(nextMeta, def.rewardAccountXp);
    persistMeta(nextMeta); set({ meta: nextMeta });
    get().pushLog(`✦ Contract complete — +${def.rewardShards} shards, +${def.rewardAccountXp} account XP.`);
    return true;
  },

  ensureRelicRoll: () => {
    const meta = get().meta;
    const now = Date.now();
    const faction = get().player.faction ?? null;
    const seed = Math.floor(now / DAILY_ROTATION_MS) + 1;
    const v = meta.relicVendor;
    if (v && now - v.rolledAt < DAILY_ROTATION_MS && v.entries.length === 3) return;
    const cycleSeed = v && now - v.rolledAt < DAILY_ROTATION_MS ? v.seed : seed;
    const entries = rollRelicListings(cycleSeed, faction);
    const nextMeta: MetaState = {
      ...meta,
      relicVendor: {
        rolledAt: v && now - v.rolledAt < DAILY_ROTATION_MS ? v.rolledAt : now,
        seed: cycleSeed,
        entries,
        sold: v && now - v.rolledAt < DAILY_ROTATION_MS ? (v.sold ?? []) : [],
      },
    };
    persistMeta(nextMeta); set({ meta: nextMeta });
  },

  purchaseRelic: (idx) => {
    const s = get();
    const v = s.meta.relicVendor;
    if (!v || !v.entries[idx]) return false;
    if (v.sold.includes(idx)) return false;
    const entry = v.entries[idx];
    if (s.player.gold < entry.price) { get().pushLog("Not enough gold."); return false; }
    if (!get().addToBag(entry.listing)) return false;
    const np = get().player;
    const nextMeta: MetaState = { ...s.meta, relicVendor: { ...v, sold: [...v.sold, idx] } };
    persistMeta(nextMeta);
    set({ meta: nextMeta, player: { ...np, gold: np.gold - entry.price } });
    get().pushLog(`Acquired ${entry.listing.name} for ${entry.price}g.`);
    return true;
  },

  markBossSeen: (bossId) => {
    const meta = get().meta;
    if (meta.seenBossIntros.includes(bossId)) return;
    const nextMeta: MetaState = { ...meta, seenBossIntros: [...meta.seenBossIntros, bossId] };
    persistMeta(nextMeta); set({ meta: nextMeta });
  },

  bumpDailyFloor: (floor) => {
    const meta = get().meta;
    const dc = meta.dailyContract;
    if (!dc || !dc.accepted || dc.claimed) return;
    const def = DAILY_CONTRACTS.find((c) => c.id === dc.defId);
    if (!def || def.objective.kind !== "reach_floor") return;
    if (floor < def.objective.floor) return;
    if (dc.progress >= 1) return;
    const nextMeta: MetaState = { ...meta, dailyContract: { ...dc, progress: 1 } };
    persistMeta(nextMeta); set({ meta: nextMeta });
  },

  applyDungeonBuff: (buff) => {
    const meta = get().meta;
    const p = get().player;
    const dungeonBuffs = [...(p.dungeonBuffs ?? []), buff];
    set({ player: recompute({ ...p, dungeonBuffs }, meta) });
  },

  markEliteRetreat: () => set((s) => ({ player: { ...s.player, eliteRetreatUsed: true } })),

  advanceAbilityCooldowns: (usedId, turns = 0) => {
    const p = get().player;
    const next: Record<string, number> = {};
    for (const [k, v] of Object.entries(p.abilityCooldowns ?? {})) {
      if (v > 1) next[k] = v - 1;
    }
    if (usedId && turns > 0) next[usedId] = turns;
    set({ player: { ...p, abilityCooldowns: next } });
  },

  spendResource: (amount) => {
    if (amount <= 0) return true;
    const p = get().player;
    if (p.resource < amount) return false;
    set({ player: { ...p, resource: p.resource - amount } });
    return true;
  },

  gainResource: (amount) => {
    if (amount <= 0) return;
    const p = get().player;
    const next = clampResource(p.resource + amount, p.maxResource);
    if (next === p.resource) return;
    set({ player: { ...p, resource: next } });
  },

  gainResourceFromDamageDealt: (amount, opts) => {
    if (amount <= 0 || opts?.spenderAbility) return;
    const p = get().player;
    if (p.dungeonDepth <= 0 || !p.classId) return;
    const def = resourceDef(p.classId);
    if (def?.kind === "rage") get().gainResource(rageFromDamage(amount));
    else if (def?.kind === "fury") get().gainResource(furyFromDamageDealt(amount));
  },

  tickResourceRegenTurn: () => {
    const p = get().player;
    if (p.dungeonDepth <= 0) return;
    const def = resourceDef(p.classId);
    if (!def) return;
    let gain = 0;
    if (def.kind === "energy") gain = energyRegenPerTurn(p.level);
    else if (def.kind === "mana") gain = manaRegenPerTurn(resourceSnap(p));
    else if (def.kind === "runes") gain = runeRegenPerTurn();
    else return;
    if (gain <= 0) return;
    const next = clampResource(p.resource + gain, p.maxResource);
    if (next === p.resource) return;
    set({ player: { ...p, resource: next } });
  },
}));

export { xpForLevel, bagCap, bagSlotsUsed, bagFreeSlots };
export type { Ability };
