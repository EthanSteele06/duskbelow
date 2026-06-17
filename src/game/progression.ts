/** Character level cap (account/Wanderer uses separate cap in meta.ts). */
export const CHARACTER_LEVEL_CAP = 60;

/** First level that grants a talent point each level-up. */
export const TALENT_UNLOCK_LEVEL = 3;

/** XP required to advance from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  if (level < 10) return level * 25;
  if (level < 30) return Math.floor(level * 35);
  if (level < 45) return Math.floor(level * 48);
  return Math.floor(level * 62);
}

/** Talent points granted when reaching this level (Option A: 1/level from 3–60). */
export function talentPointsOnLevelUp(level: number): number {
  return level >= TALENT_UNLOCK_LEVEL ? 1 : 0;
}

/** Flattened per-level base stat growth so power lives mostly in talents/gear. */
export function levelUpBaseStats() {
  return { baseMaxHp: 3, baseAtk: 1, baseMag: 0 };
}

export function xpProgressPct(xp: number, level: number): number {
  if (level >= CHARACTER_LEVEL_CAP) return 100;
  const need = xpForLevel(level);
  return need > 0 ? Math.min(100, (xp / need) * 100) : 0;
}
