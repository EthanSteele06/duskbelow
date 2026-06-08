import { create } from "zustand";
import type { ClassId, FactionId, Ability, ProfessionId, GearItem, GearSlot, TalentNode } from "./data";
import {
  CLASSES, FACTIONS, VENDOR_ITEMS, QUESTS, TRAINERS, RECIPES, MATERIALS, SPECS, TALENT_TREES, COSMETICS,
  BAG_SIZE_BASE, BAG_SIZE_CHAMPION, RESPEC_GOLD_COST, gearSellPrice, profXpForLevel,
} from "./data";
import {
  type MetaState, type EchoNode, emptyMeta, loadMeta, saveMeta,
  echoStart, accountXpForLevel, ACCOUNT_LEVEL_CAP, stashCapacity, racialChargesForLevel,
  ECHO_TREE, hasEcho,
} from "./meta";

export type Screen =
  | "title" | "intro" | "city"
  | "vendor" | "auction" | "quests"
  | "trainer" | "talents" | "profession"
  | "equipment" | "shop" | "champion"
  | "dungeon" | "victory" | "defeat"
  | "run_summary" | "echo" | "journal";

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
  /** floors cleared this run */
  runFloors: number;
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

  setScreen: (s: Screen) => void;
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
  buy: (itemId: string) => boolean;
  buyGem: (itemId: string) => boolean;
  use: (itemId: string) => void;
  enterDungeon: () => void;
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
  craft: (recipeId: string) => boolean;
  sellMaterial: (id: string) => void;
  buyRecipe: (id: string) => boolean;
  toggleChampion: () => void;
  buyCosmetic: (id: string) => boolean;
  equipCosmetic: (id: string) => void;
  restoreBetweenRooms: () => void;
  useRacial: () => boolean;
  consumeNextAttackMult: () => void;
  // Pass 7
  recordKill: (enemyId: string, opts?: { boss?: boolean; shardValue?: number; loreId?: string; itemDropId?: string }) => void;
  useHearthstone: () => boolean;
  stashItem: (itemId: string, fromEquipment?: GearSlot) => boolean;
  unstashItem: (idx: number) => void;
  spendEcho: (nodeId: string) => boolean;
  respecEcho: () => void;
  wipeCharacter: () => void;
  finishRun: (outcome: "victory" | "defeat") => void;
  markSeenWipeIntro: () => void;
}

const emptyPlayer = (): PlayerState => ({
  name: "Wanderer", faction: null, classId: null, specId: null,
  level: 1, xp: 0, hp: 30, maxHp: 30, atk: 5, mag: 1, crit: 0, dodge: 0,
  baseMaxHp: 30, baseAtk: 5, baseMag: 1,
  gold: 50, gems: 0, inventory: [], questItems: {}, dungeonDepth: 0,
  skillPoints: 0, learnedSkills: [], talentPoints: 0, learnedTalents: [], earnedSkillForLevel: 0,
  equipment: {}, bag: [],
  profession: null, profLevel: 1, profXp: 0, materials: {}, knownRecipes: [],
  isChampion: false, ownedCosmetics: [], equippedCosmetics: {},
  racialUsed: 0, racialMax: 1, nextAttackMult: 1,
  runKills: 0, runGold: 0, runXp: 0, runShards: 0, runFloors: 0,
});

const xpForLevel = (lvl: number) => lvl * 25;

function sumGearStats(equipment: PlayerState["equipment"]) {
  const s = { atk: 0, mag: 0, maxHp: 0, crit: 0, dodge: 0 };
  for (const slot of Object.values(equipment)) {
    if (!slot) continue;
    s.atk += slot.stats.atk ?? 0;
    s.mag += slot.stats.mag ?? 0;
    s.maxHp += slot.stats.maxHp ?? 0;
    s.crit += slot.stats.crit ?? 0;
    s.dodge += slot.stats.dodge ?? 0;
  }
  return s;
}

function sumTalentStats(learnedIds: string[], specId: string | null) {
  const s = { atk: 0, mag: 0, maxHp: 0, crit: 0, dodge: 0 };
  if (!specId) return s;
  const tree = TALENT_TREES[specId];
  if (!tree) return s;
  for (const n of tree) {
    if (!learnedIds.includes(n.id)) continue;
    s.atk += n.effect.atk ?? 0;
    s.mag += n.effect.mag ?? 0;
    s.maxHp += n.effect.maxHp ?? 0;
    s.crit += n.effect.crit ?? 0;
    s.dodge += n.effect.dodge ?? 0;
  }
  return s;
}

function recompute(p: PlayerState): PlayerState {
  const gear = sumGearStats(p.equipment);
  const tal = sumTalentStats(p.learnedTalents, p.specId);
  const maxHp = p.baseMaxHp + gear.maxHp + tal.maxHp;
  const atk = p.baseAtk + gear.atk + tal.atk;
  const mag = p.baseMag + gear.mag + tal.mag;
  const crit = gear.crit + tal.crit;
  const dodge = gear.dodge + tal.dodge;
  return { ...p, maxHp, atk, mag, crit, dodge, hp: Math.min(p.hp, maxHp) };
}

function bagCap(p: PlayerState, meta: MetaState) {
  const echo = echoStart(meta);
  return (p.isChampion ? BAG_SIZE_CHAMPION : BAG_SIZE_BASE) + echo.bonusBag;
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

  const startGold = Math.max(50, Math.floor((prev?.gold ?? 0) * echo.retainGoldPct) || 50);

  const base: PlayerState = {
    ...emptyPlayer(),
    name: name || "Wanderer",
    faction, classId,
    baseMaxHp: c.hp + (fp.maxHp ?? 0) + echo.bonusMaxHp,
    baseAtk:   c.atk + (fp.atk ?? 0) + echo.bonusAtk,
    baseMag:   c.mag + (fp.mag ?? 0),
    hp:        c.hp + (fp.maxHp ?? 0) + echo.bonusMaxHp,
    maxHp:     c.hp + (fp.maxHp ?? 0) + echo.bonusMaxHp,
    atk:       c.atk + (fp.atk ?? 0) + echo.bonusAtk,
    mag:       c.mag + (fp.mag ?? 0),
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
  return recompute(base);
}

function persistMeta(meta: MetaState) { saveMeta(meta); }

function grantAccountXp(meta: MetaState, n: number): MetaState {
  if (meta.account.level >= ACCOUNT_LEVEL_CAP) return meta;
  let { xp, level } = meta.account;
  xp += n;
  while (xp >= accountXpForLevel(level) && level < ACCOUNT_LEVEL_CAP) {
    xp -= accountXpForLevel(level);
    level += 1;
  }
  return { ...meta, account: { xp, level } };
}

const initialMeta = loadMeta();

export const useGame = create<GameState>((set, get) => ({
  screen: "title",
  player: emptyPlayer(),
  log: [],
  quests: [],
  meta: initialMeta,
  lastRun: null,

  setScreen: (screen) => set({ screen }),

  startGame: (faction, classId, name) => {
    const meta = get().meta;
    // Mark class as "ever played" so it stays unlocked even before account level catches up.
    const unlocked = meta.unlockedClasses.includes(classId)
      ? meta.unlockedClasses
      : [...meta.unlockedClasses, classId];
    const nextMeta = { ...meta, unlockedClasses: unlocked };
    persistMeta(nextMeta);
    const player = buildFreshPlayer(faction, classId, name, nextMeta);
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
    let hp = Math.max(0, p.hp - n);
    // Phoenix Feather intercept: if owned and damage would reach 0, consume one and revive at 50% maxHp.
    if (hp <= 0) {
      const featherIdx = p.inventory.indexOf("phoenix");
      if (featherIdx !== -1) {
        const inv = [...p.inventory];
        inv.splice(featherIdx, 1);
        hp = Math.max(1, Math.floor(p.maxHp * 0.5));
        set({ player: { ...p, hp, inventory: inv } });
        get().pushLog("✦ Phoenix Feather ignites — you are pulled back from the dark.");
        return n;
      }
    }
    set({ player: { ...p, hp } });
    return n;
  },
  heal: (n) => set((s) => ({ player: { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + n) } })),

  rewardGold: (n) => set((s) => {
    const champBonus = s.player.isChampion ? Math.floor(n * 0.5) : 0;
    const echo = echoStart(s.meta);
    const total = Math.floor((n + champBonus) * echo.goldMult);
    return { player: { ...s.player, gold: s.player.gold + total, runGold: s.player.runGold + total } };
  }),
  rewardGems: (n) => set((s) => ({ player: { ...s.player, gems: s.player.gems + n } })),

  rewardXp: (n) => {
    const p = get().player;
    const meta = get().meta;
    const echo = echoStart(meta);
    const champBonus = p.isChampion ? Math.floor(n * 0.5) : 0;
    const total = Math.floor((n + champBonus) * echo.xpMult);
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
    });
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
    const mats = { ...p.materials, [id]: (p.materials[id] ?? 0) + count };
    set({ player: { ...p, materials: mats } });
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
    set((s) => ({ quests: [...s.quests, { id, progress: 0, completed: false, turnedIn: false }] }));
    const def = QUESTS.find((d) => d.id === id)!;
    get().pushLog(`Quest accepted: ${def.name}`);
  },

  turnInQuest: (id) => {
    const q = get().quests.find((x) => x.id === id);
    if (!q || !q.completed || q.turnedIn) return;
    const def = QUESTS.find((d) => d.id === id)!;
    get().rewardGold(def.rewardGold);
    get().rewardXp(def.rewardXp);
    const p = get().player;
    const items = { ...p.questItems };
    const mats = { ...p.materials };
    const targetId = def.target.itemId;
    if ((items[targetId] ?? 0) >= def.target.count) items[targetId] = Math.max(0, items[targetId] - def.target.count);
    else if ((mats[targetId] ?? 0) >= def.target.count) mats[targetId] = Math.max(0, mats[targetId] - def.target.count);
    set({
      player: { ...get().player, questItems: items, materials: mats },
      quests: get().quests.map((x) => x.id === id ? { ...x, turnedIn: true } : x),
    });
    get().pushLog(`Turned in ${def.name}. +${def.rewardGold}g +${def.rewardXp}xp`);
  },

  buy: (itemId) => {
    const item = VENDOR_ITEMS.find((i) => i.id === itemId);
    if (!item || item.gemPrice) return false;
    const p = get().player;
    if (p.gold < item.price) return false;
    const next: PlayerState = { ...p, gold: p.gold - item.price, inventory: [...p.inventory, itemId] };
    if (item.kind === "weapon" && item.atk) next.baseAtk = p.baseAtk + item.atk;
    set({ player: recompute(next) });
    get().pushLog(`Bought ${item.name}.`);
    return true;
  },

  buyGem: (itemId) => {
    const item = VENDOR_ITEMS.find((i) => i.id === itemId);
    if (!item || !item.gemPrice) return false;
    const p = get().player;
    if (p.gems < item.gemPrice) return false;
    set({ player: { ...p, gems: p.gems - item.gemPrice, inventory: [...p.inventory, itemId] } });
    get().pushLog(`Acquired ${item.name}.`);
    return true;
  },

  use: (itemId) => {
    const item = VENDOR_ITEMS.find((i) => i.id === itemId);
    if (!item || item.kind !== "potion") return;
    const p = get().player;
    const idx = p.inventory.indexOf(itemId);
    if (idx === -1) return;
    const inv = [...p.inventory];
    inv.splice(idx, 1);
    set({ player: { ...p, inventory: inv, hp: Math.min(p.maxHp, p.hp + (item.heal ?? 0)) } });
    get().pushLog(`Drank ${item.name}. +${item.heal} HP.`);
  },

  enterDungeon: () => {
    set((s) => ({
      screen: "dungeon",
      player: {
        ...s.player,
        dungeonDepth: 1,
        racialUsed: 0,
        racialMax: racialChargesForLevel(s.meta.account.level),
        nextAttackMult: 1,
        runKills: 0, runGold: 0, runXp: 0, runShards: 0, runFloors: 0,
      },
    }));
    get().pushLog("You descend into darkness...");
  },
  exitDungeon: () => {
    set((s) => ({ screen: "city", player: { ...s.player, dungeonDepth: 0 } }));
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
    });
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
    const next = recompute({ ...p, talentPoints: p.talentPoints - 1, learnedTalents: [...p.learnedTalents, node.id] });
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
    });
    set({ player: next });
    const trainer = p.classId ? TRAINERS[p.classId] : null;
    get().pushLog(`Learned ${(node as { name?: string }).name ?? "skill"}${trainer ? ` from ${trainer.name}` : ""}.`);
    return true;
  },

  addToBag: (item) => {
    const p = get().player;
    const meta = get().meta;
    if (p.bag.length >= bagCap(p, meta)) return false;
    set({ player: { ...p, bag: [...p.bag, item] } });
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
    set({ player: recompute({ ...p, bag, equipment }) });
    get().pushLog(`Equipped ${item.name}.`);
  },

  unequip: (slot) => {
    const p = get().player;
    const meta = get().meta;
    const item = p.equipment[slot];
    if (!item) return;
    if (p.bag.length >= bagCap(p, meta)) { get().pushLog("Bag full."); return; }
    const equipment = { ...p.equipment };
    delete equipment[slot];
    set({ player: recompute({ ...p, bag: [...p.bag, item], equipment }) });
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
    set({ player: { ...p, profession: id } });
    get().pushLog(`Took up ${id}.`);
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
      inv = [...inv, out.itemId];
      const it = VENDOR_ITEMS.find((v) => v.id === out.itemId);
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
    const amt = Math.max(2, Math.floor(p.maxHp * 0.10));
    const hp = Math.min(p.maxHp, p.hp + amt);
    if (hp > p.hp) {
      set({ player: { ...p, hp, runFloors: p.runFloors + 1 } });
      get().pushLog(`You catch your breath. +${hp - p.hp} HP.`);
    } else {
      set({ player: { ...p, runFloors: p.runFloors + 1 } });
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

  // ── Pass 7: meta progression ───────────────────────────────────────────
  recordKill: (enemyId, opts) => {
    const meta = get().meta;
    const echo = echoStart(meta);
    const baseShards = opts?.shardValue ?? (opts?.boss ? 8 : 1);
    const shards = Math.max(0, Math.floor(baseShards * echo.shardMult));
    const j = meta.journal;
    const enemyKills = { ...j.enemyKills, [enemyId]: (j.enemyKills[enemyId] ?? 0) + 1 };
    const bossesDowned = opts?.boss ? { ...j.bossesDowned, [enemyId]: (j.bossesDowned[enemyId] ?? 0) + 1 } : j.bossesDowned;
    const itemsFound = opts?.itemDropId ? { ...j.itemsFound, [opts.itemDropId]: (j.itemsFound[opts.itemDropId] ?? 0) + 1 } : j.itemsFound;
    const loreFound = opts?.loreId && !j.loreFound.includes(opts.loreId) ? [...j.loreFound, opts.loreId] : j.loreFound;
    let nextMeta: MetaState = {
      ...meta,
      shards: meta.shards + shards,
      journal: { ...j, enemyKills, bossesDowned, itemsFound, loreFound },
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
    if (shards > 0) get().pushLog(`✦ +${shards} Soul Shard${shards>1?"s":""}.`);
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
    set({ meta: nextMeta, player: { ...p, equipment: nextEquipment, bag: nextBag } });
    return true;
  },

  unstashItem: (idx) => {
    const meta = get().meta;
    const nextStash = meta.stash.filter((_, i) => i !== idx);
    const nextMeta: MetaState = { ...meta, stash: nextStash };
    persistMeta(nextMeta);
    set({ meta: nextMeta });
  },

  spendEcho: (nodeId) => {
    const meta = get().meta;
    if (hasEcho(meta, nodeId)) return false;
    const node = ECHO_TREE.find((n) => n.id === nodeId) as EchoNode | undefined;
    if (!node) return false;
    if (node.requires && !hasEcho(meta, node.requires)) return false;
    if (meta.shards < node.cost) return false;
    const nextMeta: MetaState = { ...meta, shards: meta.shards - node.cost, echoLearned: [...meta.echoLearned, nodeId] };
    persistMeta(nextMeta);
    set({ meta: nextMeta });
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
    const p = get().player;
    if (!p.faction || !p.classId) { get().reset(); return; }
    const meta = get().meta;
    const fresh = buildFreshPlayer(p.faction, p.classId, p.name, meta, p);
    set({ player: fresh, screen: "city", log: [`${p.name} wakes in the city — bones intact, memory shorter.`] , quests: [], lastRun: null });
  },

  finishRun: (outcome) => {
    const p = get().player;
    const meta = get().meta;
    const isFirstRun = !meta.hasCompletedFirstRun;
    const j = meta.journal;
    const newDeepest = Math.max(j.deepestFloor, p.dungeonDepth);
    const bestRun = !j.bestRun || p.dungeonDepth > j.bestRun.floors
      ? { floors: p.dungeonDepth, kills: p.runKills, gold: p.runGold, date: Date.now() }
      : j.bestRun;
    let nextMeta: MetaState = {
      ...meta,
      hasCompletedFirstRun: true,
      journal: { ...j, deepestFloor: newDeepest, bestRun, runsCompleted: j.runsCompleted + 1 },
    };
    // Victory bonus shards + account XP
    if (outcome === "victory") {
      const echo = echoStart(meta);
      const bonus = Math.floor(15 * echo.shardMult);
      nextMeta = grantAccountXp({ ...nextMeta, shards: nextMeta.shards + bonus }, 50);
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
      shards: p.runShards + (outcome === "victory" ? Math.floor(15 * echoStart(meta).shardMult) : 0),
      loreFound: j.loreFound,
      bag: [...p.bag],
      equipment: Object.values(p.equipment).filter(Boolean) as GearItem[],
      date: Date.now(),
      isFirstRun,
    };
    set({ meta: nextMeta, lastRun: summary, screen: "run_summary" });
  },

  markSeenWipeIntro: () => {
    const meta = get().meta;
    if (meta.seenWipeIntro) return;
    const nextMeta = { ...meta, seenWipeIntro: true };
    persistMeta(nextMeta);
    set({ meta: nextMeta });
  },
}));

export { xpForLevel, bagCap };
export type { Ability };
