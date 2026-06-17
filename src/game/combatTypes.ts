import type { EnemyDef, StatusEffect, EnemyIntent, ThreatTier } from "@/game/data";

export interface CombatFoe {
  enemy: EnemyDef;
  hp: number;
  maxHp: number;
  stunnedTurns: number;
  guardPct: number;
  parryActive: boolean;
  effects: StatusEffect[];
  nextIntent: EnemyIntent;
  bossPhase: 1 | 2;
}

export interface CombatEnc {
  kind: "combat";
  depth: number;
  foes: CombatFoe[];
  focusIndex: number;
  shieldReduce: number;
  playerEffects: StatusEffect[];
  threatHpScale: number;
  threatTier: ThreatTier;
  combatTurns: number;
  turnEnrageAnnounced: number;
  isPack: boolean;
}

export function livingFoeIndices(e: CombatEnc): number[] {
  return e.foes.map((f, i) => (f.hp > 0 ? i : -1)).filter((i) => i >= 0);
}

export function livingFoes(e: CombatEnc): CombatFoe[] {
  return e.foes.filter((f) => f.hp > 0);
}

export function allFoesDead(e: CombatEnc): boolean {
  return e.foes.every((f) => f.hp <= 0);
}

export function normalizeFocus(e: CombatEnc): CombatEnc {
  if (e.foes[e.focusIndex]?.hp > 0) return e;
  const idx = e.foes.findIndex((f) => f.hp > 0);
  return idx >= 0 ? { ...e, focusIndex: idx } : e;
}

export function focusFoe(e: CombatEnc): CombatFoe {
  const norm = normalizeFocus(e);
  return norm.foes[norm.focusIndex] ?? norm.foes[0];
}

export function getFocusIndex(e: CombatEnc): number {
  return normalizeFocus(e).focusIndex;
}

export function primaryFoe(e: CombatEnc): CombatFoe {
  return e.foes[0];
}

export function primaryEnemy(e: CombatEnc): EnemyDef {
  return primaryFoe(e).enemy;
}

export function totalEnemyHp(e: CombatEnc): number {
  return e.foes.reduce((s, f) => s + Math.max(0, f.hp), 0);
}

export function totalEnemyMaxHp(e: CombatEnc): number {
  return e.foes.reduce((s, f) => s + f.maxHp, 0);
}

export function mapFoes(e: CombatEnc, fn: (f: CombatFoe, i: number) => CombatFoe): CombatEnc {
  return { ...e, foes: e.foes.map(fn) };
}

export function updateFoeAt(e: CombatEnc, index: number, patch: Partial<CombatFoe>): CombatEnc {
  return {
    ...e,
    foes: e.foes.map((f, i) => (i === index ? { ...f, ...patch } : f)),
  };
}

export function updateFocusFoe(e: CombatEnc, patch: Partial<CombatFoe>): CombatEnc {
  return updateFoeAt(e, getFocusIndex(e), patch);
}

export function encRoomCombatKey(e: CombatEnc): string {
  return `combat-${e.depth}-${e.foes.map((f) => f.enemy.id).join("+")}`;
}
