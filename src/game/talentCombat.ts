import type { Ability } from "@/game/data";
import { TALENT_TREES, type TalentEffect, type TalentPassiveHook, type AbilityTalentMod, type TalentNode } from "@/game/talents";

export type { TalentPassiveHook, AbilityTalentMod, TalentEffect } from "@/game/talents";

export type TalentPassives = Partial<Record<TalentPassiveHook, number>>;
export type TalentRanks = Record<string, number>;

function scaleAbilityMod(mod: AbilityTalentMod, rank: number): AbilityTalentMod {
  if (rank <= 1) return mod;
  const out: AbilityTalentMod = { ...mod };
  if (mod.multDelta) out.multDelta = mod.multDelta * rank;
  if (mod.multMult) out.multMult = 1 + (mod.multMult - 1) * rank;
  if (mod.cooldownDelta) out.cooldownDelta = mod.cooldownDelta * rank;
  if (mod.lifestealDelta) out.lifestealDelta = mod.lifestealDelta * rank;
  if (mod.bonusVsChillDelta) out.bonusVsChillDelta = mod.bonusVsChillDelta * rank;
  if (mod.bonusVsBleedMult) out.bonusVsBleedMult = 1 + (mod.bonusVsBleedMult - 1) * rank;
  if (mod.healPctOnShield) out.healPctOnShield = mod.healPctOnShield * rank;
  if (mod.reduceDelta) out.reduceDelta = mod.reduceDelta * rank;
  if (mod.hotPowerDelta) out.hotPowerDelta = mod.hotPowerDelta * rank;
  if (mod.hotTurnsDelta) out.hotTurnsDelta = mod.hotTurnsDelta * rank;
  if (mod.buffNextMultDelta) out.buffNextMultDelta = mod.buffNextMultDelta * rank;
  if (mod.bonusCritPct) out.bonusCritPct = mod.bonusCritPct * rank;
  if (mod.statusAmp) {
    out.statusAmp = {
      kind: mod.statusAmp.kind,
      turnsDelta: mod.statusAmp.turnsDelta ? mod.statusAmp.turnsDelta * rank : undefined,
      powerDelta: mod.statusAmp.powerDelta ? mod.statusAmp.powerDelta * rank : undefined,
    };
  }
  return out;
}

function effectForRank(node: TalentNode, rank: number): TalentEffect | null {
  const ef = node.effect;
  const scale = node.scalePerRank !== false;
  if (ef.kind === "passive") {
    return scale ? { ...ef, power: ef.power * rank } : ef;
  }
  if (ef.kind === "stat") {
    return scale
      ? {
          kind: "stat",
          atk: (ef.atk ?? 0) * rank,
          mag: (ef.mag ?? 0) * rank,
          maxHp: (ef.maxHp ?? 0) * rank,
          crit: (ef.crit ?? 0) * rank,
          dodge: (ef.dodge ?? 0) * rank,
        }
      : ef;
  }
  if (ef.kind === "ability") {
    return { kind: "ability", mod: scale ? scaleAbilityMod(ef.mod, rank) : ef.mod };
  }
  return ef;
}

function learnedEffects(specId: string | null, talentRanks: TalentRanks): TalentEffect[] {
  if (!specId) return [];
  const tree = TALENT_TREES[specId];
  if (!tree) return [];
  const out: TalentEffect[] = [];
  for (const node of tree) {
    const rank = talentRanks[node.id] ?? 0;
    if (rank <= 0) continue;
    const ef = effectForRank(node, rank);
    if (ef) out.push(ef);
  }
  return out;
}

/** @deprecated Use talentRanks directly. */
export function ranksFromLegacyIds(learned: string[]): TalentRanks {
  const ranks: TalentRanks = {};
  for (const id of learned) ranks[id] = (ranks[id] ?? 0) + 1;
  return ranks;
}

export function getTalentPassives(specId: string | null, talentRanks: TalentRanks): TalentPassives {
  const out: TalentPassives = {};
  for (const ef of learnedEffects(specId, talentRanks)) {
    if (ef.kind !== "passive") continue;
    out[ef.hook] = (out[ef.hook] ?? 0) + ef.power;
  }
  return out;
}

export function sumTalentStatBonuses(specId: string | null, talentRanks: TalentRanks) {
  const s = { atk: 0, mag: 0, maxHp: 0, crit: 0, dodge: 0 };
  for (const ef of learnedEffects(specId, talentRanks)) {
    if (ef.kind !== "stat") continue;
    s.atk += ef.atk ?? 0;
    s.mag += ef.mag ?? 0;
    s.maxHp += ef.maxHp ?? 0;
    s.crit += ef.crit ?? 0;
    s.dodge += ef.dodge ?? 0;
  }
  const passives = getTalentPassives(specId, talentRanks);
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
  talentRanks: TalentRanks,
): Ability[] {
  const mods: AbilityTalentMod[] = [];
  for (const ef of learnedEffects(specId, talentRanks)) {
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
