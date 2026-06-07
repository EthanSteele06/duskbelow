import { create } from "zustand";
import type { ClassId, FactionId, Ability, ProfessionId, SkillNode } from "./data";
import { CLASSES, VENDOR_ITEMS, QUESTS, TRAINERS, RECIPES, MATERIALS, profXpForLevel } from "./data";

export type Screen =
  | "title" | "intro" | "city"
  | "vendor" | "auction" | "quests"
  | "trainer" | "profession"
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
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  atk: number;
  mag: number;
  gold: number;
  inventory: string[];
  questItems: Record<string, number>;
  dungeonDepth: number;
  // skills
  skillPoints: number;
  learnedSkills: string[];
  earnedSkillForLevel: number; // highest level we awarded a point at
  // profession
  profession: ProfessionId | null;
  profLevel: number;
  profXp: number;
  materials: Record<string, number>;
  knownRecipes: string[];
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
  // skills
  learnSkill: (node: SkillNode) => boolean;
  // professions
  pickProfession: (id: ProfessionId) => void;
  craft: (recipeId: string) => boolean;
  sellMaterial: (id: string) => void;
  buyRecipe: (id: string) => boolean;
}

const emptyPlayer: PlayerState = {
  name: "Wanderer", faction: null, classId: null,
  level: 1, xp: 0, hp: 30, maxHp: 30, atk: 5, mag: 1,
  gold: 50, inventory: [], questItems: {}, dungeonDepth: 0,
  skillPoints: 0, learnedSkills: [], earnedSkillForLevel: 0,
  profession: null, profLevel: 1, profXp: 0, materials: {}, knownRecipes: [],
};

const xpForLevel = (lvl: number) => lvl * 25;

export const useGame = create<GameState>((set, get) => ({
  screen: "title",
  player: { ...emptyPlayer },
  log: [],
  quests: [],

  setScreen: (screen) => set({ screen }),

  startGame: (faction, classId, name) => {
    const c = CLASSES.find((x) => x.id === classId)!;
    set({
      screen: "intro",
      player: {
        ...emptyPlayer,
        name: name || "Wanderer",
        faction, classId,
        hp: c.hp, maxHp: c.hp, atk: c.atk, mag: c.mag,
      },
      log: [`${name || "Wanderer"} arrives in the city.`],
      quests: [],
    });
  },

  pushLog: (msg) => set((s) => ({ log: [...s.log.slice(-40), msg] })),

  damage: (n) => {
    const p = get().player;
    const hp = Math.max(0, p.hp - n);
    set({ player: { ...p, hp } });
    return n;
  },
  heal: (n) => set((s) => ({ player: { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + n) } })),

  rewardGold: (n) => set((s) => ({ player: { ...s.player, gold: s.player.gold + n } })),

  rewardXp: (n) => {
    const p = get().player;
    let xp = p.xp + n;
    let level = p.level;
    let maxHp = p.maxHp;
    let atk = p.atk;
    let mag = p.mag;
    let skillPoints = p.skillPoints;
    let earnedSkillForLevel = p.earnedSkillForLevel;
    while (xp >= xpForLevel(level) && level < 10) {
      xp -= xpForLevel(level);
      level += 1;
      maxHp += 6;
      atk += 1;
      mag += 1;
      get().pushLog(`★ Level up! Now level ${level}.`);
      if (level >= 3 && level > earnedSkillForLevel) {
        skillPoints += 1;
        earnedSkillForLevel = level;
        get().pushLog(`✦ Skill point earned — visit your trainer.`);
      }
    }
    set({ player: { ...p, xp, level, maxHp, atk, mag, hp: Math.min(p.hp + 5, maxHp), skillPoints, earnedSkillForLevel } });
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
    // material may also satisfy class quests (their target is a material id)
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
    // remove from whichever bag holds it
    const items = { ...p.questItems };
    const mats = { ...p.materials };
    const targetId = def.target.itemId;
    if ((items[targetId] ?? 0) >= def.target.count) {
      items[targetId] = Math.max(0, items[targetId] - def.target.count);
    } else if ((mats[targetId] ?? 0) >= def.target.count) {
      mats[targetId] = Math.max(0, mats[targetId] - def.target.count);
    }
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
    if (item.kind === "weapon" && item.atk) next.atk = p.atk + item.atk;
    set({ player: next });
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
    set((s) => ({ screen: "dungeon", player: { ...s.player, dungeonDepth: 1 } }));
    get().pushLog("You descend into darkness...");
  },

  exitDungeon: () => {
    set((s) => ({ screen: "city", player: { ...s.player, dungeonDepth: 0 } }));
    get().pushLog("You return to the city.");
  },

  reset: () => set({ screen: "title", player: { ...emptyPlayer }, log: [], quests: [] }),

  learnSkill: (node) => {
    const p = get().player;
    if (p.learnedSkills.includes(node.id)) return false;
    if (node.requires && !p.learnedSkills.includes(node.requires)) return false;
    if (p.skillPoints < node.cost) return false;
    let { maxHp, atk, mag, hp } = p;
    if (node.effect.kind === "stat") {
      maxHp += node.effect.maxHp ?? 0;
      atk += node.effect.atk ?? 0;
      mag += node.effect.mag ?? 0;
      hp = Math.min(maxHp, hp + (node.effect.maxHp ?? 0));
    }
    set({
      player: {
        ...p,
        skillPoints: p.skillPoints - node.cost,
        learnedSkills: [...p.learnedSkills, node.id],
        maxHp, atk, mag, hp,
      },
    });
    const trainer = p.classId ? TRAINERS[p.classId] : null;
    get().pushLog(`Learned ${node.name}${trainer ? ` from ${trainer.name}` : ""}.`);
    return true;
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
    // check materials
    for (const [m, c] of Object.entries(r.inputs)) {
      if ((p.materials[m] ?? 0) < c) return false;
    }
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
}));

export { xpForLevel };
export type { Ability };
