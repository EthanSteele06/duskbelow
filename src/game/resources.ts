import type { ClassId, Ability } from "./data";

export type ClassResourceKind = "rage" | "energy" | "mana" | "runes" | "fury";

export interface ClassResourceDef {
  kind: ClassResourceKind;
  label: string;
  barClass: string;
  combatStart: number | "max";
  baseMax: number;
  manaBonus?: number;
}

export const CLASS_RESOURCE: Record<ClassId, ClassResourceDef> = {
  warrior:     { kind: "rage",   label: "Rage",   barClass: "bg-blood",   combatStart: 0,   baseMax: 100 },
  rogue:       { kind: "energy", label: "Energy", barClass: "bg-gold",    combatStart: "max", baseMax: 100 },
  mage:        { kind: "mana",   label: "Mana",   barClass: "bg-arcane",  combatStart: "max", baseMax: 60,  manaBonus: 50 },
  priest:      { kind: "mana",   label: "Mana",   barClass: "bg-divine",  combatStart: "max", baseMax: 60,  manaBonus: 15 },
  druid:       { kind: "mana",   label: "Mana",   barClass: "bg-allies",  combatStart: "max", baseMax: 60,  manaBonus: 30 },
  deathknight: { kind: "runes",  label: "Runes",  barClass: "bg-arcane",  combatStart: "max", baseMax: 6 },
  demonhunter: { kind: "fury",   label: "Fury",   barClass: "bg-ember",   combatStart: 0,   baseMax: 100 },
};

export interface ResourceSnapshot {
  classId: ClassId | null;
  specId: string | null;
  resource: number;
  maxResource: number;
  mag: number;
  level: number;
  dungeonDepth: number;
}

export function resourceDef(classId: ClassId | null): ClassResourceDef | null {
  if (!classId) return null;
  return CLASS_RESOURCE[classId];
}

export function computeMaxResource(p: ResourceSnapshot): number {
  const def = resourceDef(p.classId);
  if (!def) return 0;
  if (def.kind === "mana") {
    return def.baseMax + (def.manaBonus ?? 0) + Math.floor(p.mag * 2) + Math.floor(p.level * 2);
  }
  return def.baseMax;
}

export function combatStartResource(p: ResourceSnapshot): number {
  const max = computeMaxResource(p);
  const def = resourceDef(p.classId);
  if (!def) return 0;
  if (def.combatStart === "max") return max;
  return Math.min(def.combatStart, max);
}

export function abilityCost(ab: Ability): number {
  return ab.cost ?? 0;
}

/** Mana/rune/fury cost after gear reductions (talent costDelta is baked into resolved abilities). */
export function effectiveAbilityCost(ab: Ability, costReduction = 0): number {
  return Math.max(0, abilityCost(ab) - costReduction);
}

export function spendsResource(ab: Ability): boolean {
  return abilityCost(ab) > 0;
}

export function clampResource(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

export function rageFromDamage(amount: number): number {
  return Math.max(1, Math.floor(amount * 0.5));
}

export function furyFromDamageDealt(amount: number): number {
  return Math.max(1, Math.floor(amount * 0.45));
}

export function furyFromDamageTaken(amount: number): number {
  return Math.max(1, Math.floor(amount * 0.35));
}

export function energyRegenPerTurn(level: number): number {
  const base = 8 + Math.floor(level * 0.6);
  const jitter = Math.floor(Math.random() * 5);
  return Math.min(20, base + jitter);
}

export function runeRegenPerTurn(): number {
  return Math.floor(Math.random() * 3);
}

export function manaRegenPerTurn(p: ResourceSnapshot): number {
  return Math.max(1, Math.floor(p.mag * 0.25 + p.level * 0.5));
}

export function manaRegenBetweenRooms(p: ResourceSnapshot): number {
  const max = computeMaxResource(p);
  return Math.max(3, Math.floor(p.mag * 0.4 + max * 0.12));
}

export function resourceBarPct(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

export function resourceCostLabel(ab: Ability, def: ClassResourceDef | null, costReduction = 0): string | null {
  const cost = effectiveAbilityCost(ab, costReduction);
  if (cost <= 0 || !def) return null;
  if (def.kind === "runes") return `${cost} Rune${cost === 1 ? "" : "s"}`;
  return `${cost} ${def.label}`;
}
