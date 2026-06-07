import { create } from "zustand";
import type { ClassId, FactionId } from "./data";
import { CLASSES, VENDOR_ITEMS } from "./data";

export type Screen = "title" | "city" | "vendor" | "auction" | "dungeon" | "victory" | "defeat";

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
  inventory: string[]; // vendor item ids
  dungeonDepth: number;
}

interface GameState {
  screen: Screen;
  player: PlayerState;
  log: string[];
  setScreen: (s: Screen) => void;
  startGame: (faction: FactionId, classId: ClassId, name: string) => void;
  pushLog: (msg: string) => void;
  damage: (n: number) => void;
  heal: (n: number) => void;
  rewardXp: (n: number) => void;
  rewardGold: (n: number) => void;
  buy: (itemId: string) => boolean;
  use: (itemId: string) => void;
  enterDungeon: () => void;
  exitDungeon: () => void;
  reset: () => void;
}

const emptyPlayer: PlayerState = {
  name: "Wanderer", faction: null, classId: null,
  level: 1, xp: 0, hp: 30, maxHp: 30, atk: 5, mag: 1,
  gold: 50, inventory: [], dungeonDepth: 0,
};

const xpForLevel = (lvl: number) => lvl * 25;

export const useGame = create<GameState>((set, get) => ({
  screen: "title",
  player: { ...emptyPlayer },
  log: [],

  setScreen: (screen) => set({ screen }),

  startGame: (faction, classId, name) => {
    const c = CLASSES.find((x) => x.id === classId)!;
    set({
      screen: "city",
      player: {
        ...emptyPlayer,
        name: name || "Wanderer",
        faction,
        classId,
        hp: c.hp, maxHp: c.hp, atk: c.atk, mag: c.mag,
      },
      log: [`${name || "Wanderer"} arrives in the city.`],
    });
  },

  pushLog: (msg) => set((s) => ({ log: [...s.log.slice(-30), msg] })),

  damage: (n) => set((s) => ({ player: { ...s.player, hp: Math.max(0, s.player.hp - n) } })),
  heal: (n) => set((s) => ({ player: { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + n) } })),

  rewardGold: (n) => set((s) => ({ player: { ...s.player, gold: s.player.gold + n } })),

  rewardXp: (n) => {
    const p = get().player;
    let xp = p.xp + n;
    let level = p.level;
    let maxHp = p.maxHp;
    let atk = p.atk;
    let mag = p.mag;
    while (xp >= xpForLevel(level) && level < 10) {
      xp -= xpForLevel(level);
      level += 1;
      maxHp += 6;
      atk += 1;
      mag += 1;
      get().pushLog(`Level up! Now level ${level}.`);
    }
    set({ player: { ...p, xp, level, maxHp, atk, mag, hp: Math.min(p.hp + 5, maxHp) } });
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

  reset: () => set({ screen: "title", player: { ...emptyPlayer }, log: [] }),
}));

export { xpForLevel };
