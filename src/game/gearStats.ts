import type { GearSlot, Rarity } from "./data";

export type PrimaryStatId = "str" | "agi" | "sta" | "int" | "spi";

export type PrimaryStats = Partial<Record<PrimaryStatId, number>>;

/** Minimal gear shape for stat math — avoids circular imports with data.ts. */
export interface GearStatItem {
  slot: GearSlot;
  baseId: string;
  attrs?: PrimaryStats;
  stats?: { atk?: number; mag?: number; maxHp?: number; crit?: number; dodge?: number };
  armor?: number;
  weaponMin?: number;
  weaponMax?: number;
  attackSpeed?: number;
}

export const PRIMARY_LABEL: Record<PrimaryStatId, string> = {
  str: "STR",
  agi: "AGI",
  sta: "STA",
  int: "INT",
  spi: "SPI",
};

const ALL_STATS: PrimaryStatId[] = ["str", "agi", "sta", "int", "spi"];

/** Dagger uses AGI for physical attack; staff adds weapon damage to MAG. */
export const AGI_WEAPON_BASE_IDS = new Set(["dagger"]);

export const MAG_WEAPON_BASE_IDS = new Set(["staff", "tome"]);

export interface GearCombatBonuses {
  atk: number;
  mag: number;
  maxHp: number;
  crit: number;
  dodge: number;
  block: number;
  maxMana: number;
  hpRegen: number;
  manaRegen: number;
  xpGainPct: number;
  /** Flat reduction to ability resource costs (from SPI on gear). */
  abilityCostReduction: number;
  armor: number;
  weaponMin: number;
  weaponMax: number;
  attackSpeed: number;
  primary: PrimaryStats;
}

const EMPTY_BONUSES: GearCombatBonuses = {
  atk: 0,
  mag: 0,
  maxHp: 0,
  crit: 0,
  dodge: 0,
  block: 0,
  maxMana: 0,
  hpRegen: 0,
  manaRegen: 0,
  xpGainPct: 0,
  abilityCostReduction: 0,
  armor: 0,
  weaponMin: 0,
  weaponMax: 0,
  attackSpeed: 0,
  primary: {},
};

type AttrTier = "low" | "medium" | "high" | "veryHigh";

function tierRoll(tier: AttrTier, ilvl: number, rnd: () => number): number {
  const scale = 0.85 + ilvl * 0.12;
  const bands: Record<AttrTier, [number, number]> = {
    low: [1, 3],
    medium: [3, 6],
    high: [6, 10],
    veryHigh: [10, 16],
  };
  const [lo, hi] = bands[tier];
  const min = Math.max(1, Math.round(lo * scale));
  const max = Math.max(min, Math.round(hi * scale));
  return min + Math.floor(rnd() * (max - min + 1));
}

function pickStat(preferred: PrimaryStatId[], exclude: PrimaryStatId[], rnd: () => number): PrimaryStatId {
  const pool = preferred.filter((s) => !exclude.includes(s));
  const source = pool.length > 0 && rnd() < 0.72 ? pool : ALL_STATS;
  return source[Math.floor(rnd() * source.length)];
}

function assignAttr(out: PrimaryStats, stat: PrimaryStatId, value: number) {
  out[stat] = (out[stat] ?? 0) + value;
}

/** Roll primary attributes by rarity band (Phase A tables). */
export function rollPrimaryAttrs(
  rarity: Rarity,
  ilvl: number,
  preferred: PrimaryStatId[] = ALL_STATS,
  rnd: () => number = Math.random,
): PrimaryStats {
  const attrs: PrimaryStats = {};
  const used: PrimaryStatId[] = [];

  const rollOne = (tier: AttrTier) => {
    const stat = pickStat(preferred, used, rnd);
    used.push(stat);
    assignAttr(attrs, stat, tierRoll(tier, ilvl, rnd));
  };

  switch (rarity) {
    case "common":
      if (rnd() < 0.65) return attrs;
      rollOne("low");
      break;
    case "uncommon": {
      const count = rnd() < 0.45 ? 1 : 2;
      rollOne(count === 1 ? "medium" : "low");
      if (count === 2) rollOne("medium");
      break;
    }
    case "rare": {
      const tiers: AttrTier[] = ["high", "medium", "low"];
      const count = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < count; i++) rollOne(tiers[i] ?? "low");
      break;
    }
    case "epic": {
      const tiers: AttrTier[] = ["veryHigh", "high", "medium"];
      const count = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < count; i++) rollOne(tiers[i] ?? "medium");
      break;
    }
    case "legendary":
      for (const tier of ["veryHigh", "high", "medium"] as AttrTier[]) rollOne(tier);
      break;
  }

  return attrs;
}

function sumPrimary(items: PrimaryStats[]): PrimaryStats {
  const out: PrimaryStats = {};
  for (const item of items) {
    for (const id of ALL_STATS) {
      const v = item[id];
      if (v) out[id] = (out[id] ?? 0) + v;
    }
  }
  return out;
}

function legacyItemBonuses(item: GearStatItem): GearCombatBonuses {
  const s = item.stats ?? {};
  return {
    ...EMPTY_BONUSES,
    atk: s.atk ?? 0,
    mag: s.mag ?? 0,
    maxHp: s.maxHp ?? 0,
    crit: s.crit ?? 0,
    dodge: s.dodge ?? 0,
  };
}

function deriveFromPrimary(primary: PrimaryStats, weapon?: GearStatItem): Pick<
  GearCombatBonuses,
  "atk" | "mag" | "maxHp" | "crit" | "dodge" | "block" | "maxMana" | "hpRegen" | "manaRegen" | "xpGainPct" | "abilityCostReduction"
> {
  const str = primary.str ?? 0;
  const agi = primary.agi ?? 0;
  const sta = primary.sta ?? 0;
  const intel = primary.int ?? 0;
  const spi = primary.spi ?? 0;

  let atk = str * 2;
  let mag = intel * 2;

  if (weapon?.weaponMin != null && weapon.weaponMax != null) {
    const avg = Math.floor((weapon.weaponMin + weapon.weaponMax) / 2);
    if (MAG_WEAPON_BASE_IDS.has(weapon.baseId)) mag += avg;
    else {
      atk += avg;
      if (AGI_WEAPON_BASE_IDS.has(weapon.baseId)) atk += agi * 2;
    }
  }

  return {
    atk,
    mag,
    maxHp: sta * 8,
    crit: agi * 0.5 + intel * 0.3,
    dodge: agi * 0.4,
    block: str * 0.5,
    maxMana: intel * 5,
    hpRegen: spi * 0.5,
    manaRegen: spi * 0.3,
    xpGainPct: intel * 1,
    abilityCostReduction: Math.floor(spi / 12),
  };
}

export function bonusesForItem(item: GearStatItem): GearCombatBonuses {
  if (!item.attrs && item.stats) return legacyItemBonuses(item);

  const primary = { ...(item.attrs ?? {}) };
  const fromAttrs = deriveFromPrimary(primary, item.slot === "weapon" ? item : undefined);

  return {
    atk: fromAttrs.atk,
    mag: fromAttrs.mag,
    maxHp: fromAttrs.maxHp,
    crit: fromAttrs.crit,
    dodge: fromAttrs.dodge,
    block: fromAttrs.block,
    maxMana: fromAttrs.maxMana,
    hpRegen: fromAttrs.hpRegen,
    manaRegen: fromAttrs.manaRegen,
    xpGainPct: fromAttrs.xpGainPct,
    abilityCostReduction: fromAttrs.abilityCostReduction,
    armor: item.armor ?? 0,
    weaponMin: item.weaponMin ?? 0,
    weaponMax: item.weaponMax ?? 0,
    attackSpeed: item.attackSpeed ?? 0,
    primary,
  };
}

export function sumEquipmentBonuses(
  equipment: Partial<Record<GearSlot, GearStatItem>>,
): GearCombatBonuses {
  const items = Object.values(equipment).filter(Boolean) as GearStatItem[];
  if (items.length === 0) return { ...EMPTY_BONUSES };

  const hasLegacy = items.some((i) => !i.attrs && i.stats);
  if (hasLegacy) {
    return items.reduce((acc, item) => {
      const b = bonusesForItem(item);
      return {
        atk: acc.atk + b.atk,
        mag: acc.mag + b.mag,
        maxHp: acc.maxHp + b.maxHp,
        crit: acc.crit + b.crit,
        dodge: acc.dodge + b.dodge,
        block: acc.block + b.block,
        maxMana: acc.maxMana + b.maxMana,
        hpRegen: acc.hpRegen + b.hpRegen,
        manaRegen: acc.manaRegen + b.manaRegen,
        xpGainPct: acc.xpGainPct + b.xpGainPct,
        abilityCostReduction: acc.abilityCostReduction + b.abilityCostReduction,
        armor: acc.armor + b.armor,
        weaponMin: Math.max(acc.weaponMin, b.weaponMin),
        weaponMax: Math.max(acc.weaponMax, b.weaponMax),
        attackSpeed: Math.max(acc.attackSpeed, b.attackSpeed),
        primary: sumPrimary([acc.primary, b.primary]),
      };
    }, { ...EMPTY_BONUSES });
  }

  const weapon = equipment.weapon;
  const primaries = items.map((i) => i.attrs ?? {});
  const primary = sumPrimary(primaries);
  const derived = deriveFromPrimary(primary, weapon);

  let armor = 0;
  let weaponMin = 0;
  let weaponMax = 0;
  let attackSpeed = 0;
  for (const item of items) {
    armor += item.armor ?? 0;
    if (item.slot === "weapon") {
      weaponMin = item.weaponMin ?? 0;
      weaponMax = item.weaponMax ?? 0;
      attackSpeed = item.attackSpeed ?? 0;
    }
  }

  return {
    ...derived,
    armor,
    weaponMin,
    weaponMax,
    attackSpeed,
    primary,
  };
}

export function gearScore(item: GearStatItem): number {
  if (!item.attrs && item.stats) {
    const s = item.stats;
    return (s.atk ?? 0) * 2 + (s.mag ?? 0) * 2 + (s.maxHp ?? 0) + (s.crit ?? 0) + (s.dodge ?? 0);
  }
  const b = bonusesForItem(item);
  const p = b.primary;
  const attrSum =
    (p.str ?? 0) + (p.agi ?? 0) + (p.sta ?? 0) + (p.int ?? 0) + (p.spi ?? 0);
  const weaponScore = b.weaponMin + b.weaponMax;
  return Math.floor(attrSum * 3 + weaponScore * 2 + b.armor * 0.5 + b.maxHp * 0.25);
}

export function formatGearStatsLine(item: GearStatItem): string {
  if (!item.attrs && item.stats) {
    const s = item.stats;
    const parts: string[] = [];
    if (s.atk) parts.push(`+${s.atk} ATK`);
    if (s.mag) parts.push(`+${s.mag} MAG`);
    if (s.maxHp) parts.push(`+${s.maxHp} HP`);
    if (s.crit) parts.push(`+${s.crit}% crit`);
    if (s.dodge) parts.push(`+${s.dodge}% dodge`);
    return parts.join(" · ");
  }

  const parts: string[] = [];
  if (item.weaponMin != null && item.weaponMax != null) {
    parts.push(`${item.weaponMin}–${item.weaponMax} dmg`);
    if (item.attackSpeed) parts.push(`${item.attackSpeed.toFixed(1)} spd`);
  }
  if (item.armor) parts.push(`${item.armor} armor`);

  for (const id of ALL_STATS) {
    const v = item.attrs?.[id];
    if (v) parts.push(`+${v} ${PRIMARY_LABEL[id]}`);
  }
  return parts.join(" · ");
}
