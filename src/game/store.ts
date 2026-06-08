import { create } from "zustand";
import type { ClassId, FactionId, Ability, ProfessionId, GearItem, GearSlot, TalentNode } from "./data";
import {
  CLASSES, FACTIONS, VENDOR_ITEMS, QUESTS, TRAINERS, RECIPES, MATERIALS, SPECS, TALENT_TREES, COSMETICS,
  BAG_SIZE_BASE, BAG_SIZE_CHAMPION, RESPEC_GOLD_COST, gearSellPrice, profXpForLevel,
} from "./data";

export type Screen =
  | "title" | "intro" | "city"
  | "vendor" | "auction" | "quests"
  | "trainer" | "talents" | "profession"
  | "equipment" | "shop" | "champion"
  | "dungeon" | "victory" | "defeat";

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
  // Derived totals (kept on player so existing reads keep working).
  // baseMax/baseAtk/baseMag store the pre-gear, pre-talent values from class+level.
  maxHp: number;
  atk: number;
  mag: number;
  crit: number;     // percent
  dodge: number;    // percent
  baseMaxHp: number;
  baseAtk: number;
  baseMag: number;
  gold: number;
  gems: number;
  inventory: string[];
  questItems: Record<string, number>;
  dungeonDepth: number;
  // talents
  skillPoints: number;       // legacy old trainer (kept harmless)
  learnedSkills: string[];   // legacy
  talentPoints: number;
  learnedTalents: string[];
  earnedSkillForLevel: number;
  // gear
  equipment: Partial<Record<GearSlot, GearItem>>;
  bag: GearItem[];
  // profession
  profession: ProfessionId | null;
  profLevel: number;
  profXp: number;
  materials: Record<string, number>;
  knownRecipes: string[];
  // monetization
  isChampion: boolean;
  ownedCosmetics: string[];
  equippedCosmetics: Partial<Record<string, string>>; // kind -> cosmeticId
  // faction racial (once per run)
  racialUsed: boolean;
  /** multiplier applied to the very next player attack (Frenzy), then consumed */
  nextAttackMult: number;
}

interface GameState {
  screen: Screen;
  player: PlayerState;
  log: string[];
  quests: QuestState[];

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
  use: (itemId: string) => void;
  enterDungeon: () => void;
  exitDungeon: () => void;
  reset: () => void;
  // talents
  pickSpec: (specId: string) => void;
  respec: () => boolean;
  learnTalent: (node: TalentNode) => boolean;
  // legacy skills
  learnSkill: (node: { id: string; cost: number; requires?: string; effect: { kind: string; atk?: number; mag?: number; maxHp?: number } & Record<string, unknown> }) => boolean;
  // gear
  addToBag: (item: GearItem) => boolean;
  equip: (itemId: string) => void;
  unequip: (slot: GearSlot) => void;
  discardBagItem: (itemId: string) => void;
  sellBagItem: (itemId: string) => void;
  // professions
  pickProfession: (id: ProfessionId) => void;
  craft: (recipeId: string) => boolean;
  sellMaterial: (id: string) => void;
  buyRecipe: (id: string) => boolean;
  // monetization
  toggleChampion: () => void;
  buyCosmetic: (id: string) => boolean;
  equipCosmetic: (id: string) => void;
  // combat / run helpers
  restoreBetweenRooms: () => void;
  useRacial: () => boolean;
  consumeNextAttackMult: () => void;
}

const emptyPlayer: PlayerState = {
  name: "Wanderer", faction: null, classId: null, specId: null,
  level: 1, xp: 0, hp: 30, maxHp: 30, atk: 5, mag: 1, crit: 0, dodge: 0,
  baseMaxHp: 30, baseAtk: 5, baseMag: 1,
  gold: 50, gems: 500, inventory: [], questItems: {}, dungeonDepth: 0,
  skillPoints: 0, learnedSkills: [], talentPoints: 0, learnedTalents: [], earnedSkillForLevel: 0,
  equipment: {}, bag: [],
  profession: null, profLevel: 1, profXp: 0, materials: {}, knownRecipes: [],
  isChampion: false, ownedCosmetics: [], equippedCosmetics: {},
  racialUsed: false, nextAttackMult: 1,
};

const xpForLevel = (lvl: number) => lvl * 25;

// ── Helpers ────────────────────────────────────────────────────────────────
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

function bagCap(p: PlayerState) { return p.isChampion ? BAG_SIZE_CHAMPION : BAG_SIZE_BASE; }

export const useGame = create<GameState>((set, get) => ({
  screen: "title",
  player: { ...emptyPlayer },
  log: [],
  quests: [],

  setScreen: (screen) => set({ screen }),

  startGame: (faction, classId, name) => {
    const c = CLASSES.find((x) => x.id === classId)!;
    const f = FACTIONS.find((x) => x.id === faction)!;
    const fp = f.passives;
    const base: PlayerState = {
      ...emptyPlayer,
      name: name || "Wanderer",
      faction, classId,
      baseMaxHp: c.hp + (fp.maxHp ?? 0),
      baseAtk:   c.atk + (fp.atk ?? 0),
      baseMag:   c.mag + (fp.mag ?? 0),
      hp:        c.hp + (fp.maxHp ?? 0),
      maxHp:     c.hp + (fp.maxHp ?? 0),
      atk:       c.atk + (fp.atk ?? 0),
      mag:       c.mag + (fp.mag ?? 0),
      crit:      fp.crit ?? 0,
      dodge:     fp.dodge ?? 0,
    };
    set({ screen: "intro", player: recompute(base), log: [`${name || "Wanderer"} arrives in the city. ${f.passiveLabel}`], quests: [] });
  },

  pushLog: (msg) => set((s) => ({ log: [...s.log.slice(-40), msg] })),

  damage: (n) => {
    const p = get().player;
    // dodge check
    if (p.dodge > 0 && Math.random() * 100 < p.dodge) {
      get().pushLog("✦ You dodge the blow!");
      return 0;
    }
    const hp = Math.max(0, p.hp - n);
    set({ player: { ...p, hp } });
    return n;
  },
  heal: (n) => set((s) => ({ player: { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + n) } })),

  rewardGold: (n) => set((s) => {
    const bonus = s.player.isChampion ? Math.floor(n * 0.5) : 0;
    return { player: { ...s.player, gold: s.player.gold + n + bonus } };
  }),
  rewardGems: (n) => set((s) => ({ player: { ...s.player, gems: s.player.gems + n } })),

  rewardXp: (n) => {
    const p = get().player;
    const bonus = p.isChampion ? Math.floor(n * 0.5) : 0;
    let xp = p.xp + n + bonus;
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
    const next = recompute({ ...p, xp, level, baseMaxHp, baseAtk, baseMag, talentPoints, earnedSkillForLevel, hp: Math.min(p.hp + 5, baseMaxHp) });
    set({ player: next });
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
    if (!item) return false;
    const p = get().player;
    if (p.gold < item.price) return false;
    const next: PlayerState = { ...p, gold: p.gold - item.price, inventory: [...p.inventory, itemId] };
    if (item.kind === "weapon" && item.atk) {
      next.baseAtk = p.baseAtk + item.atk;
    }
    set({ player: recompute(next) });
    get().pushLog(`Bought ${item.name}.`);
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
    set((s) => ({ screen: "dungeon", player: { ...s.player, dungeonDepth: 1, racialUsed: false, nextAttackMult: 1 } }));
    get().pushLog("You descend into darkness...");
  },
  exitDungeon: () => {
    set((s) => ({ screen: "city", player: { ...s.player, dungeonDepth: 0 } }));
    get().pushLog("You return to the city.");
  },
  reset: () => set({ screen: "title", player: { ...emptyPlayer }, log: [], quests: [] }),

  // ── Talents ────────────────────────────────────────────────────────────
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
      ...p,
      gold: p.gold - cost,
      specId: null,
      learnedTalents: [],
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
    const next = recompute({
      ...p,
      talentPoints: p.talentPoints - 1,
      learnedTalents: [...p.learnedTalents, node.id],
    });
    set({ player: next });
    get().pushLog(`Learned talent: ${node.name}.`);
    return true;
  },

  // legacy skill (kept for back-compat — no longer surfaced)
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
      ...p,
      skillPoints: p.skillPoints - node.cost,
      learnedSkills: [...p.learnedSkills, node.id],
      baseMaxHp, baseAtk, baseMag,
    });
    set({ player: next });
    const trainer = p.classId ? TRAINERS[p.classId] : null;
    get().pushLog(`Learned ${(node as { name?: string }).name ?? "skill"}${trainer ? ` from ${trainer.name}` : ""}.`);
    return true;
  },

  // ── Gear ───────────────────────────────────────────────────────────────
  addToBag: (item) => {
    const p = get().player;
    if (p.bag.length >= bagCap(p)) return false;
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
    const item = p.equipment[slot];
    if (!item) return;
    if (p.bag.length >= bagCap(p)) { get().pushLog("Bag full."); return; }
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

  // ── Professions ────────────────────────────────────────────────────────
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

  // ── Monetization ───────────────────────────────────────────────────────
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
    // Empty id unequips all currently-equipped cosmetics whose kind matches any owned-but-not-passed id.
    // For simple "unequip <kind>" callers should pass the equipped id again to toggle, but we also
    // support the convention: passing an id that isn't owned no-ops; passing "" clears nothing.
    if (!id) return;
    const def = COSMETICS.find((c) => c.id === id);
    if (!def) return;
    if (!p.ownedCosmetics.includes(id)) return;
    const current = p.equippedCosmetics[def.kind];
    const nextEquipped = { ...p.equippedCosmetics };
    if (current === id) delete nextEquipped[def.kind]; // toggle off
    else nextEquipped[def.kind] = id;
    set({ player: { ...p, equippedCosmetics: nextEquipped } });
  },
}));

export { xpForLevel, bagCap };
export type { Ability };
