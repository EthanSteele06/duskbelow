import type { Ability } from "@/game/data";
import { TALENT_TREES, type TalentEffect, type TalentPassiveHook, type AbilityTalentMod } from "@/game/talents";

export type { TalentPassiveHook, AbilityTalentMod, TalentEffect } from "@/game/talents";

export type TalentPassives = Partial<Record<TalentPassiveHook, number>>;

function learnedEffects(specId: string | null, learned: string[]): TalentEffect[] {
  if (!specId) return [];
  const tree = TALENT_TREES[specId];
  if (!tree) return [];
  return tree.filter((n) => learned.includes(n.id)).map((n) => n.effect);
}

export function getTalentPassives(specId: string | null, learned: string[]): TalentPassives {
  const out: TalentPassives = {};
  for (const ef of learnedEffects(specId, learned)) {
    if (ef.kind !== "passive") continue;
    out[ef.hook] = (out[ef.hook] ?? 0) + ef.power;
  }
  return out;
}

export function sumTalentStatBonuses(specId: string | null, learned: string[]) {
  const s = { atk: 0, mag: 0, maxHp: 0, crit: 0, dodge: 0 };
  for (const ef of learnedEffects(specId, learned)) {
    if (ef.kind !== "stat") continue;
    s.atk += ef.atk ?? 0;
    s.mag += ef.mag ?? 0;
    s.maxHp += ef.maxHp ?? 0;
    s.crit += ef.crit ?? 0;
    s.dodge += ef.dodge ?? 0;
  }
  // Combat passives that also affect sheet stats
  const passives = getTalentPassives(specId, learned);
  s.crit += passives.crit_bonus ?? 0;
  s.dodge += passives.dodge_bonus ?? 0;
  return s;
}

function applyModToAbility(ab: Ability, mod: AbilityTalentMod): Ability {
  const clone: Ability = JSON.parse(JSON.stringify(ab));
  if (mod.rename) clone.name = mod.rename;
  if (mod.descOverride) clone.desc = mod.descOverride;
  if (mod.cooldownDelta) clone.cooldown = Math.max(0, clone.cooldown + mod.cooldownDelta);

  const ef = clone.effect;
  if (ef.kind === "attack") {
    if (mod.multDelta) ef.mult += mod.multDelta;
    if (mod.multMult) ef.mult *= mod.multMult;
    if (mod.lifestealDelta) ef.lifesteal = (ef.lifesteal ?? 0) + mod.lifestealDelta;
    if (mod.bonusVsChillDelta) ef.bonusVsChill = (ef.bonusVsChill ?? 1) + mod.bonusVsChillDelta;
    if (mod.bonusVsBleedMult) (ef as Ability["effect"] & { bonusVsBleed?: number }).bonusVsBleed = mod.bonusVsBleedMult;
    if (mod.extraStatus) ef.applyStatus = mod.extraStatus;
    if (mod.statusAmp && ef.applyStatus?.kind === mod.statusAmp.kind) {
      if (mod.statusAmp.turnsDelta) ef.applyStatus.turns += mod.statusAmp.turnsDelta;
      if (mod.statusAmp.powerDelta) ef.applyStatus.power += mod.statusAmp.powerDelta;
    }
    if (mod.bonusCritPct) (ef as Ability["effect"] & { bonusCritPct?: number }).bonusCritPct = mod.bonusCritPct;
    if (mod.ignoreGuard) (ef as Ability["effect"] & { ignoreGuard?: boolean }).ignoreGuard = true;
  } else if (ef.kind === "shield") {
    if (mod.reduceDelta) ef.reduce = Math.min(0.95, ef.reduce + mod.reduceDelta);
    if (mod.healPctOnShield) ef.healPct = (ef.healPct ?? 0) + mod.healPctOnShield;
  } else if (ef.kind === "hot") {
    if (mod.hotPowerDelta) ef.healPerTurn += mod.hotPowerDelta;
    if (mod.hotTurnsDelta) ef.turns += mod.hotTurnsDelta;
  } else if (ef.kind === "heal") {
    if (mod.multDelta && ef.magMult) ef.magMult += mod.multDelta;
    if (mod.multMult && ef.magMult) ef.magMult *= mod.multMult;
  } else if (ef.kind === "buff_next") {
    if (mod.buffNextMultDelta) ef.mult += mod.buffNextMultDelta;
  } else if (ef.kind === "stun" && mod.healPctOnShield) {
    (ef as Ability["effect"] & { bonusHealPct?: number }).bonusHealPct = mod.healPctOnShield;
  }

  return clone;
}

export function resolveCombatAbilities(
  base: Ability[],
  specAbility: Ability | null,
  specId: string | null,
  learned: string[],
): Ability[] {
  const mods: AbilityTalentMod[] = [];
  for (const ef of learnedEffects(specId, learned)) {
    if (ef.kind === "ability") mods.push(ef.mod);
  }

  const resolveOne = (ab: Ability): Ability => {
    let out = ab;
    for (const mod of mods) {
      if (mod.abilityId === ab.id) out = applyModToAbility(out, mod);
    }
    return out;
  };

  const resolved = base.map(resolveOne);
  if (specAbility) resolved.push(resolveOne(specAbility));
  return resolved;
}

export function abilityBonusCrit(ab: Ability): number {
  if (ab.effect.kind !== "attack") return 0;
  return (ab.effect as Ability["effect"] & { bonusCritPct?: number }).bonusCritPct ?? 0;
}

export function abilityIgnoresGuard(ab: Ability): boolean {
  if (ab.effect.kind !== "attack") return false;
  return !!(ab.effect as Ability["effect"] & { ignoreGuard?: boolean }).ignoreGuard;
}

export function abilityBonusVsBleed(ab: Ability): number {
  if (ab.effect.kind !== "attack") return 1;
  return (ab.effect as Ability["effect"] & { bonusVsBleed?: number }).bonusVsBleed ?? 1;
}

export function stunBonusHealPct(ab: Ability): number {
  if (ab.effect.kind !== "stun") return 0;
  return (ab.effect as Ability["effect"] & { bonusHealPct?: number }).bonusHealPct ?? 0;
}
