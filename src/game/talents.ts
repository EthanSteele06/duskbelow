import type { StatusEffectKind } from "@/game/data";
import { ARMS_TREE_V2 } from "@/game/talents/arms";

export type TalentPassiveHook =
  | "dot_amp_bleed"
  | "dot_amp_burn"
  | "dot_amp_chill"
  | "vs_bleeding"
  | "vs_burning"
  | "vs_chilled"
  | "crit_dot_bleed"
  | "crit_dot_burn"
  | "pass_cd_tick"
  | "hot_amp"
  | "lifesteal_boost"
  | "low_hp_dmg"
  | "kill_frenzy"
  | "crit_bonus"
  | "dodge_bonus";

export interface AbilityTalentMod {
  abilityId: string;
  multDelta?: number;
  multMult?: number;
  cooldownDelta?: number;
  lifestealDelta?: number;
  bonusVsChillDelta?: number;
  bonusVsBleedMult?: number;
  extraStatus?: { kind: StatusEffectKind; turns: number; power: number };
  statusAmp?: { kind: StatusEffectKind; turnsDelta?: number; powerDelta?: number };
  healPctOnShield?: number;
  reduceDelta?: number;
  hotPowerDelta?: number;
  hotTurnsDelta?: number;
  buffNextMultDelta?: number;
  bonusCritPct?: number;
  ignoreGuard?: boolean;
  rename?: string;
  descOverride?: string;
}

export type TalentEffect =
  | { kind: "stat"; atk?: number; mag?: number; maxHp?: number; crit?: number; dodge?: number }
  | { kind: "passive"; hook: TalentPassiveHook; power: number }
  | { kind: "ability"; mod: AbilityTalentMod };

export interface TalentNode {
  id: string;
  name: string;
  desc: string;
  /** Per-rank tooltip lines (falls back to desc). */
  rankDescs?: string[];
  /** Defaults to 1. */
  maxRank?: number;
  /** Grid position for v2 tree UI. */
  row?: number;
  col?: number;
  /** Parent node ids — all must be at least rank 1. */
  requires?: string | string[];
  /** Total points spent in this tree before this node unlocks. */
  requiresPoints?: number;
  /** Only one node per group may have ranks. */
  choiceGroup?: string;
  /** Legacy tier band (v1 UI). */
  tier?: 1 | 2 | 3 | 4 | 5;
  /** Legacy single-parent capstone trees. */
  capstone?: boolean;
  /** When true, passive/stat power scales by rank; ability numeric deltas scale by rank. */
  scalePerRank?: boolean;
  effect: TalentEffect;
}

type RawNode = Omit<TalentNode, "id" | "requires" | "maxRank"> & { key: string; tier: 1 | 2 | 3 | 4 | 5 };

function branchRequires(prefix: string, key: string): string | undefined {
  const map: Record<string, string> = {
    "1": "",
    "2a": `${prefix}_1`, "2b": `${prefix}_1`,
    "3a": `${prefix}_2a`, "3b": `${prefix}_2b`,
    "4a": `${prefix}_3a`, "4b": `${prefix}_3b`,
    "5a": `${prefix}_4a`, "5b": `${prefix}_4b`, "5c": `${prefix}_4a`,
  };
  const req = map[key];
  return req === "" ? undefined : req;
}

function buildTree(prefix: string, nodes: (RawNode & { tier: 1 | 2 | 3 | 4 | 5 })[]): TalentNode[] {
  return nodes.map((n) => ({
    id: `${prefix}_${n.key}`,
    name: n.name,
    desc: n.desc,
    tier: n.tier,
    capstone: n.capstone,
    maxRank: 1,
    requires: branchRequires(prefix, n.key),
    effect: n.effect,
  }));
}

// ── Warrior ─────────────────────────────────────────────────────────────────

const fury = buildTree("fury", [
  { key: "1", tier: 1, name: "Bloodthirsty", desc: "All attacks leech +8% life.", effect: { kind: "passive", hook: "lifesteal_boost", power: 8 } },
  { key: "2a", tier: 2, name: "Enrage", desc: "Below 40% HP, deal +20% damage.", effect: { kind: "passive", hook: "low_hp_dmg", power: 20 } },
  { key: "2b", tier: 2, name: "Meat Cleaver", desc: "Cleave cooldown −1.", effect: { kind: "ability", mod: { abilityId: "cleave", cooldownDelta: -1 } } },
  { key: "3a", tier: 3, name: "Rampage", desc: "Strike hits bleeding foes for +35%.", effect: { kind: "ability", mod: { abilityId: "strike", bonusVsBleedMult: 1.35 } } },
  { key: "3b", tier: 3, name: "Cruelty", desc: "Burn ticks deal +2 damage.", effect: { kind: "passive", hook: "dot_amp_burn", power: 2 } },
  { key: "4a", tier: 4, name: "Dragon Roar", desc: "Cleave applies Burn (3t).", effect: { kind: "ability", mod: { abilityId: "cleave", extraStatus: { kind: "burn", turns: 3, power: 4 } } } },
  { key: "4b", tier: 4, name: "Recklessness", desc: "+12% crit chance.", effect: { kind: "passive", hook: "crit_bonus", power: 12 } },
  { key: "5a", tier: 5, name: "Bloodthirst", capstone: true, desc: "★ Strike becomes Bloodthirst: 1.4× ATK, 35% lifesteal.", effect: { kind: "ability", mod: { abilityId: "strike", multDelta: 0.4, lifestealDelta: 0.35, rename: "Bloodthirst", descOverride: "Ravenous strike. 1.4× ATK, heal 35% of damage." } } },
  { key: "5b", tier: 5, name: "Raging Blow", capstone: true, desc: "★ Cleave hits twice as hard: 2.4× ATK.", effect: { kind: "ability", mod: { abilityId: "cleave", multDelta: 0.8, rename: "Raging Blow", descOverride: "Twin cleave. 2.4× ATK + bleed." } } },
  { key: "5c", tier: 5, name: "Victory Rush", capstone: true, desc: "★ Kills with Strike heal 15% Max HP.", effect: { kind: "ability", mod: { abilityId: "strike", lifestealDelta: 0.5, multDelta: 0.2, rename: "Victory Rush", descOverride: "Finishing strike. 1.2× ATK, massive lifesteal on kill." } } },
]);

const protection = buildTree("protection", [
  { key: "1", tier: 1, name: "Tough as Nails", desc: "+8 Max HP, +2% dodge.", effect: { kind: "stat", maxHp: 8, dodge: 2 } },
  { key: "2a", tier: 2, name: "Shield Mastery", desc: "Shield Wall blocks 10% more.", effect: { kind: "ability", mod: { abilityId: "wall", reduceDelta: 0.1 } } },
  { key: "2b", tier: 2, name: "Thunder Clap", desc: "Cleave applies Chill (2t).", effect: { kind: "ability", mod: { abilityId: "cleave", extraStatus: { kind: "chill", turns: 2, power: 1.25 } } } },
  { key: "3a", tier: 3, name: "Last Stand", desc: "Shield Wall heals 12% Max HP.", effect: { kind: "ability", mod: { abilityId: "wall", healPctOnShield: 0.12 } } },
  { key: "3b", tier: 3, name: "Devastate", desc: "Strike applies bleed (3t).", effect: { kind: "ability", mod: { abilityId: "strike", extraStatus: { kind: "bleed", turns: 3, power: 3 } } } },
  { key: "4a", tier: 4, name: "Bastion", desc: "+4% dodge.", effect: { kind: "passive", hook: "dodge_bonus", power: 4 } },
  { key: "4b", tier: 4, name: "Heavy Repercussions", desc: "Strike hits 25% harder.", effect: { kind: "ability", mod: { abilityId: "strike", multDelta: 0.25 } } },
  { key: "5a", tier: 5, name: "Shield Slam", capstone: true, desc: "★ Strike becomes Shield Slam: 1.5× ATK, ignores guard.", effect: { kind: "ability", mod: { abilityId: "strike", multDelta: 0.5, ignoreGuard: true, rename: "Shield Slam", descOverride: "Shield bash. 1.5× ATK, pierces guard." } } },
  { key: "5b", tier: 5, name: "Avatar", capstone: true, desc: "★ Shield Wall: 90% block + heal 25% Max HP.", effect: { kind: "ability", mod: { abilityId: "wall", reduceDelta: 0.2, healPctOnShield: 0.25, rename: "Avatar", descOverride: "Unbreakable. Block 90% next hit, heal 25% Max HP." } } },
  { key: "5c", tier: 5, name: "Revenge", capstone: true, desc: "★ Cleave after blocking: 2.0× ATK, +50% lifesteal.", effect: { kind: "ability", mod: { abilityId: "cleave", multDelta: 0.4, lifestealDelta: 0.5, rename: "Revenge", descOverride: "Vengeful cleave. 2.0× ATK, heavy lifesteal." } } },
]);

// ── Rogue ───────────────────────────────────────────────────────────────────

const assassination = buildTree("assassin", [
  { key: "1", tier: 1, name: "Venomous Wounds", desc: "Bleed ticks deal +2 damage.", effect: { kind: "passive", hook: "dot_amp_bleed", power: 2 } },
  { key: "2a", tier: 2, name: "Exsanguinate", desc: "+25% damage vs bleeding foes.", effect: { kind: "passive", hook: "vs_bleeding", power: 25 } },
  { key: "2b", tier: 2, name: "Cold Blood", desc: "+10% crit chance.", effect: { kind: "passive", hook: "crit_bonus", power: 10 } },
  { key: "3a", tier: 3, name: "Hemorrhage", desc: "Slash applies bleed (3t).", effect: { kind: "ability", mod: { abilityId: "slash", extraStatus: { kind: "bleed", turns: 3, power: 4 } } } },
  { key: "3b", tier: 3, name: "Seal Fate", desc: "Crits apply 4 bleed.", effect: { kind: "passive", hook: "crit_dot_bleed", power: 4 } },
  { key: "4a", tier: 4, name: "Rupture Mastery", desc: "Eviscerate bleed +2 power, +2 turns.", effect: { kind: "ability", mod: { abilityId: "eviscerate", statusAmp: { kind: "bleed", powerDelta: 2, turnsDelta: 2 } } } },
  { key: "4b", tier: 4, name: "Vendetta", desc: "Backstab +0.4× vs bleeding.", effect: { kind: "ability", mod: { abilityId: "backstab", bonusVsBleedMult: 1.4 } } },
  { key: "5a", tier: 5, name: "Mutilate", capstone: true, desc: "★ Slash becomes Mutilate: 1.3× ATK, vicious bleed.", effect: { kind: "ability", mod: { abilityId: "slash", multDelta: 0.3, statusAmp: { kind: "bleed", powerDelta: 3, turnsDelta: 2 }, rename: "Mutilate", descOverride: "Twin puncture. 1.3× ATK, crippling bleed (7/t, 6t)." } } },
  { key: "5b", tier: 5, name: "Envenom", capstone: true, desc: "★ Eviscerate becomes Envenom: 2.2× ATK poison burst.", effect: { kind: "ability", mod: { abilityId: "eviscerate", multDelta: 0.4, extraStatus: { kind: "burn", turns: 4, power: 5 }, rename: "Envenom", descOverride: "Toxic finisher. 2.2× ATK + poison burn." } } },
  { key: "5c", tier: 5, name: "Deathmark", capstone: true, desc: "★ Backstab executes bleeds: 3.0× vs bleeding.", effect: { kind: "ability", mod: { abilityId: "backstab", bonusVsBleedMult: 2.0, multDelta: 0.3, rename: "Deathmark", descOverride: "Marked for death. 3.0× ATK (×2 vs bleeding)." } } },
]);

const outlaw = buildTree("outlaw", [
  { key: "1", tier: 1, name: "Restless Blades", desc: "Pass Turn ticks ability CDs twice.", effect: { kind: "passive", hook: "pass_cd_tick", power: 1 } },
  { key: "2a", tier: 2, name: "Opportunity", desc: "+15% crit chance.", effect: { kind: "passive", hook: "crit_bonus", power: 15 } },
  { key: "2b", tier: 2, name: "Dirty Tricks", desc: "Slash applies bleed (2t).", effect: { kind: "ability", mod: { abilityId: "slash", extraStatus: { kind: "bleed", turns: 2, power: 3 } } } },
  { key: "3a", tier: 3, name: "Alacrity", desc: "Eviscerate CD −1.", effect: { kind: "ability", mod: { abilityId: "eviscerate", cooldownDelta: -1 } } },
  { key: "3b", tier: 3, name: "Gunpowder Plot", desc: "Burn ticks +2 damage.", effect: { kind: "passive", hook: "dot_amp_burn", power: 2 } },
  { key: "4a", tier: 4, name: "Blade Flurry", desc: "Slash hits 20% harder.", effect: { kind: "ability", mod: { abilityId: "slash", multDelta: 0.2 } } },
  { key: "4b", tier: 4, name: "Killing Spree", desc: "Kills empower next hit (+25%).", effect: { kind: "passive", hook: "kill_frenzy", power: 25 } },
  { key: "5a", tier: 5, name: "Pistol Shot", capstone: true, desc: "★ Slash becomes Pistol Shot: 1.2× ATK, always crits bleeding.", effect: { kind: "ability", mod: { abilityId: "slash", multDelta: 0.2, bonusCritPct: 25, bonusVsBleedMult: 1.5, rename: "Pistol Shot", descOverride: "Quick draw. 1.2× ATK, +25% crit, bonus vs bleed." } } },
  { key: "5b", tier: 5, name: "Between the Eyes", capstone: true, desc: "★ Backstab: 2.8× ATK, +20% crit.", effect: { kind: "ability", mod: { abilityId: "backstab", multDelta: 0.3, bonusCritPct: 20, rename: "Between the Eyes", descOverride: "Precision shot. 2.8× ATK, +20% crit." } } },
  { key: "5c", tier: 5, name: "Roll the Bones", capstone: true, desc: "★ Eviscerate: 2.0× ATK, vicious bleed.", effect: { kind: "ability", mod: { abilityId: "eviscerate", multDelta: 0.2, statusAmp: { kind: "bleed", powerDelta: 2, turnsDelta: 1 }, rename: "Roll the Bones", descOverride: "Lucky cut. 2.0× ATK, deeper bleed." } } },
]);

const subtlety = buildTree("subtle", [
  { key: "1", tier: 1, name: "Find Weakness", desc: "+20% damage vs chilled foes.", effect: { kind: "passive", hook: "vs_chilled", power: 20 } },
  { key: "2a", tier: 2, name: "Shadow Focus", desc: "Backstab CD −1.", effect: { kind: "ability", mod: { abilityId: "backstab", cooldownDelta: -1 } } },
  { key: "2b", tier: 2, name: "Premeditation", desc: "+12% crit chance.", effect: { kind: "passive", hook: "crit_bonus", power: 12 } },
  { key: "3a", tier: 3, name: "Nightblade", desc: "Slash applies Chill (2t).", effect: { kind: "ability", mod: { abilityId: "slash", extraStatus: { kind: "chill", turns: 2, power: 1.35 } } } },
  { key: "3b", tier: 3, name: "Shadow Dance", desc: "Chill potency +0.1 (foes take more dmg).", effect: { kind: "passive", hook: "dot_amp_chill", power: 1 } },
  { key: "4a", tier: 4, name: "Eviscerate from Shadows", desc: "Eviscerate +0.3× damage.", effect: { kind: "ability", mod: { abilityId: "eviscerate", multDelta: 0.3 } } },
  { key: "4b", tier: 4, name: "Cloakwork", desc: "+3% dodge.", effect: { kind: "passive", hook: "dodge_bonus", power: 3 } },
  { key: "5a", tier: 5, name: "Shadowstrike", capstone: true, desc: "★ Backstab becomes Shadowstrike: 2.8× ATK from stealth.", effect: { kind: "ability", mod: { abilityId: "backstab", multDelta: 0.3, rename: "Shadowstrike", descOverride: "Ambush from shadow. 2.8× ATK." } } },
  { key: "5b", tier: 5, name: "Black Powder", capstone: true, desc: "★ Eviscerate: 2.4× ATK + burn.", effect: { kind: "ability", mod: { abilityId: "eviscerate", multDelta: 0.6, extraStatus: { kind: "burn", turns: 3, power: 5 }, rename: "Black Powder", descOverride: "Shadow bomb. 2.4× ATK + burn." } } },
  { key: "5c", tier: 5, name: "Symbols of Death", capstone: true, desc: "★ Slash: 1.4× ATK, applies chill.", effect: { kind: "ability", mod: { abilityId: "slash", multDelta: 0.4, extraStatus: { kind: "chill", turns: 2, power: 1.35 }, rename: "Symbols of Death", descOverride: "Rune-carved cut. 1.4× ATK + chill." } } },
]);

// ── Mage ────────────────────────────────────────────────────────────────────

const frost = buildTree("frost", [
  { key: "1", tier: 1, name: "Shatter", desc: "+30% damage vs chilled foes.", effect: { kind: "passive", hook: "vs_chilled", power: 30 } },
  { key: "2a", tier: 2, name: "Permafrost", desc: "Chill lasts 1 turn longer.", effect: { kind: "ability", mod: { abilityId: "frostbolt", statusAmp: { kind: "chill", turnsDelta: 1 } } } },
  { key: "2b", tier: 2, name: "Brain Freeze", desc: "Frost Nova CD −1.", effect: { kind: "ability", mod: { abilityId: "nova", cooldownDelta: -1 } } },
  { key: "3a", tier: 3, name: "Ice Floes", desc: "Frostbolt chill is stronger (+0.15).", effect: { kind: "passive", hook: "dot_amp_chill", power: 1 } },
  { key: "3b", tier: 3, name: "Thermal Void", desc: "Fireball +0.3× vs chilled.", effect: { kind: "ability", mod: { abilityId: "fireball", bonusVsChillDelta: 0.5 } } },
  { key: "4a", tier: 4, name: "Glacial Spike", desc: "Frostbolt +0.25× damage.", effect: { kind: "ability", mod: { abilityId: "frostbolt", multDelta: 0.25 } } },
  { key: "4b", tier: 4, name: "Winter's Chill", desc: "Crits apply chill.", effect: { kind: "passive", hook: "crit_dot_burn", power: 2 } },
  { key: "5a", tier: 5, name: "Flurry", capstone: true, desc: "★ Frostbolt becomes Flurry: 1.4× MAG, always chills.", effect: { kind: "ability", mod: { abilityId: "frostbolt", multDelta: 0.4, statusAmp: { kind: "chill", turnsDelta: 1, powerDelta: 0.15 }, rename: "Flurry", descOverride: "Rapid ice. 1.4× MAG, heavy chill (3t)." } } },
  { key: "5b", tier: 5, name: "Frozen Orb", capstone: true, desc: "★ Fireball: 1.8× MAG, spreads chill.", effect: { kind: "ability", mod: { abilityId: "fireball", multDelta: 0.3, extraStatus: { kind: "chill", turns: 2, power: 1.3 }, rename: "Frozen Orb", descOverride: "Orb of frost. 1.8× MAG + chill." } } },
  { key: "5c", tier: 5, name: "Ice Barrier", capstone: true, desc: "★ Frost Nova freezes 2 turns.", effect: { kind: "ability", mod: { abilityId: "nova", cooldownDelta: -1, rename: "Ice Barrier", descOverride: "Deep freeze. Skip 2 enemy turns. CD 2." } } },
]);

const fire = buildTree("fire", [
  { key: "1", tier: 1, name: "Ignite", desc: "Burn ticks deal +2 damage.", effect: { kind: "passive", hook: "dot_amp_burn", power: 2 } },
  { key: "2a", tier: 2, name: "Pyromaniac", desc: "+25% damage vs burning foes.", effect: { kind: "passive", hook: "vs_burning", power: 25 } },
  { key: "2b", tier: 2, name: "Hot Streak", desc: "+10% crit chance.", effect: { kind: "passive", hook: "crit_bonus", power: 10 } },
  { key: "3a", tier: 3, name: "Living Bomb", desc: "Fireball burn +2 power.", effect: { kind: "ability", mod: { abilityId: "fireball", statusAmp: { kind: "burn", powerDelta: 2 } } } },
  { key: "3b", tier: 3, name: "Combustion", desc: "Crits ignite for 4 burn.", effect: { kind: "passive", hook: "crit_dot_burn", power: 4 } },
  { key: "4a", tier: 4, name: "Kindling", desc: "Fireball CD −1.", effect: { kind: "ability", mod: { abilityId: "fireball", cooldownDelta: -1 } } },
  { key: "4b", tier: 4, name: "Flame On", desc: "Frostbolt applies burn (2t).", effect: { kind: "ability", mod: { abilityId: "frostbolt", extraStatus: { kind: "burn", turns: 2, power: 4 } } } },
  { key: "5a", tier: 5, name: "Pyroblast", capstone: true, desc: "★ Fireball becomes Pyroblast: 2.0× MAG, brutal burn.", effect: { kind: "ability", mod: { abilityId: "fireball", multDelta: 0.5, statusAmp: { kind: "burn", powerDelta: 3, turnsDelta: 1 }, rename: "Pyroblast", descOverride: "Massive fireball. 2.0× MAG, heavy burn." } } },
  { key: "5b", tier: 5, name: "Phoenix Flames", capstone: true, desc: "★ Frostbolt: 1.2× MAG, CD 0, applies burn.", effect: { kind: "ability", mod: { abilityId: "frostbolt", multDelta: 0.2, cooldownDelta: -99, extraStatus: { kind: "burn", turns: 3, power: 4 }, rename: "Phoenix Flames", descOverride: "Reborn flame. 1.2× MAG + burn, no CD." } } },
  { key: "5c", tier: 5, name: "Meteor", capstone: true, desc: "★ Frost Nova also scorches: heavy burn (4t).", effect: { kind: "ability", mod: { abilityId: "nova", extraStatus: { kind: "burn", turns: 4, power: 6 }, rename: "Meteor", descOverride: "Meteor freeze. Stun + heavy burn (4t)." } } },
]);

const arcane = buildTree("arcane", [
  { key: "1", tier: 1, name: "Arcane Familiar", desc: "Pass Turn ticks CDs twice.", effect: { kind: "passive", hook: "pass_cd_tick", power: 1 } },
  { key: "2a", tier: 2, name: "Nether Precision", desc: "Frostbolt +0.2× damage.", effect: { kind: "ability", mod: { abilityId: "frostbolt", multDelta: 0.2 } } },
  { key: "2b", tier: 2, name: "Concentration", desc: "+8% crit chance.", effect: { kind: "passive", hook: "crit_bonus", power: 8 } },
  { key: "3a", tier: 3, name: "Arcane Missiles", desc: "Fireball CD −1.", effect: { kind: "ability", mod: { abilityId: "fireball", cooldownDelta: -1 } } },
  { key: "3b", tier: 3, name: "Mana Adept", desc: "+3 MAG.", effect: { kind: "stat", mag: 3 } },
  { key: "4a", tier: 4, name: "Touch of the Magi", desc: "Fireball +0.4× damage.", effect: { kind: "ability", mod: { abilityId: "fireball", multDelta: 0.4 } } },
  { key: "4b", tier: 4, name: "Arcane Echo", desc: "Kills empower next hit (+20%).", effect: { kind: "passive", hook: "kill_frenzy", power: 20 } },
  { key: "5a", tier: 5, name: "Arcane Blast", capstone: true, desc: "★ Frostbolt becomes Arcane Blast: 1.8× MAG, CD 1.", effect: { kind: "ability", mod: { abilityId: "frostbolt", multDelta: 0.8, cooldownDelta: 1, rename: "Arcane Blast", descOverride: "Pure mana bolt. 1.8× MAG, CD 1." } } },
  { key: "5b", tier: 5, name: "Arcane Barrage", capstone: true, desc: "★ Fireball: 2.2× MAG, ignores guard.", effect: { kind: "ability", mod: { abilityId: "fireball", multDelta: 0.7, ignoreGuard: true, rename: "Arcane Barrage", descOverride: "Arcane salvo. 2.2× MAG, pierces guard." } } },
  { key: "5c", tier: 5, name: "Presence of Mind", capstone: true, desc: "★ Frostbolt: 1.6× MAG after you freeze a foe.", effect: { kind: "ability", mod: { abilityId: "frostbolt", multDelta: 0.6, rename: "Presence of Mind", descOverride: "Focused bolt. 1.6× MAG." } } },
]);

// ── Priest ──────────────────────────────────────────────────────────────────

const discipline = buildTree("disc", [
  { key: "1", tier: 1, name: "Atonement", desc: "Smite heals you for 8% of damage.", effect: { kind: "passive", hook: "lifesteal_boost", power: 8 } },
  { key: "2a", tier: 2, name: "Power Word: Barrier", desc: "Renew heals +2 per tick.", effect: { kind: "passive", hook: "hot_amp", power: 2 } },
  { key: "2b", tier: 2, name: "Twin Disciplines", desc: "Smite +0.2× damage.", effect: { kind: "ability", mod: { abilityId: "smite", multDelta: 0.2 } } },
  { key: "3a", tier: 3, name: "Evangelism", desc: "SW:Pain burn +2 power.", effect: { kind: "ability", mod: { abilityId: "swp", statusAmp: { kind: "burn", powerDelta: 2 } } } },
  { key: "3b", tier: 3, name: "Borrowed Time", desc: "Renew lasts +2 turns.", effect: { kind: "ability", mod: { abilityId: "renew", hotTurnsDelta: 2 } } },
  { key: "4a", tier: 4, name: "Shield Discipline", desc: "+3% dodge.", effect: { kind: "passive", hook: "dodge_bonus", power: 3 } },
  { key: "4b", tier: 4, name: "Mindbender", desc: "SW:Pain +0.3× damage.", effect: { kind: "ability", mod: { abilityId: "swp", multDelta: 0.3 } } },
  { key: "5a", tier: 5, name: "Penance", capstone: true, desc: "★ Smite becomes Penance: 1.5× MAG, heals 25% dmg.", effect: { kind: "ability", mod: { abilityId: "smite", multDelta: 0.5, lifestealDelta: 0.25, rename: "Penance", descOverride: "Channeled bolts. 1.5× MAG, heal 25% dealt." } } },
  { key: "5b", tier: 5, name: "Power Word: Barrier", capstone: true, desc: "★ Renew: +3 heal/tick, +3 turns.", effect: { kind: "ability", mod: { abilityId: "renew", hotPowerDelta: 3, hotTurnsDelta: 3, rename: "Barrier Renew", descOverride: "Shielded renewal. Heavy HoT for 7 turns." } } },
  { key: "5c", tier: 5, name: "Pain Suppression", capstone: true, desc: "★ SW:Pain: 1.6× MAG, long burn.", effect: { kind: "ability", mod: { abilityId: "swp", multDelta: 0.4, statusAmp: { kind: "burn", turnsDelta: 2, powerDelta: 3 }, rename: "Pain Suppression", descOverride: "Agonizing word. 1.6× MAG, brutal burn." } } },
]);

const holy = buildTree("holy", [
  { key: "1", tier: 1, name: "Renewed Faith", desc: "Renew heals +3 per tick.", effect: { kind: "passive", hook: "hot_amp", power: 3 } },
  { key: "2a", tier: 2, name: "Guardian Spirit", desc: "Below 40% HP, heals +25% effective.", effect: { kind: "passive", hook: "low_hp_dmg", power: 25 } },
  { key: "2b", tier: 2, name: "Holy Fire", desc: "Smite applies burn (3t).", effect: { kind: "ability", mod: { abilityId: "smite", extraStatus: { kind: "burn", turns: 3, power: 4 } } } },
  { key: "3a", tier: 3, name: "Sanctified Prayers", desc: "Renew +2 turns.", effect: { kind: "ability", mod: { abilityId: "renew", hotTurnsDelta: 2 } } },
  { key: "3b", tier: 3, name: "Divine Fury", desc: "+4 MAG.", effect: { kind: "stat", mag: 4 } },
  { key: "4a", tier: 4, name: "Holy Word: Chastise", desc: "Smite +0.35× damage.", effect: { kind: "ability", mod: { abilityId: "smite", multDelta: 0.35 } } },
  { key: "4b", tier: 4, name: "Serendipity", desc: "Pass Turn ticks CDs twice.", effect: { kind: "passive", hook: "pass_cd_tick", power: 1 } },
  { key: "5a", tier: 5, name: "Holy Word: Serenity", capstone: true, desc: "★ Renew: 9 HP/tick, 6 turns.", effect: { kind: "ability", mod: { abilityId: "renew", hotPowerDelta: 6, hotTurnsDelta: 2, rename: "Holy Word: Serenity", descOverride: "Powerful renewal. 9+ HP/tick for 6 turns." } } },
  { key: "5b", tier: 5, name: "Holy Word: Salvation", capstone: true, desc: "★ Smite: 1.4× MAG, heals 40% dealt.", effect: { kind: "ability", mod: { abilityId: "smite", multDelta: 0.4, lifestealDelta: 0.4, rename: "Holy Word: Salvation", descOverride: "Holy smite. 1.4× MAG, heal 40% damage." } } },
  { key: "5c", tier: 5, name: "Apotheosis", capstone: true, desc: "★ SW:Pain: 1.5× MAG, longer burn.", effect: { kind: "ability", mod: { abilityId: "swp", multDelta: 0.3, statusAmp: { kind: "burn", turnsDelta: 2, powerDelta: 2 }, rename: "Apotheosis", descOverride: "1.5× MAG, prolonged agony burn." } } },
]);

const shadow = buildTree("shadow", [
  { key: "1", tier: 1, name: "Shadow Weaving", desc: "Burn ticks +2 damage.", effect: { kind: "passive", hook: "dot_amp_burn", power: 2 } },
  { key: "2a", tier: 2, name: "Misery", desc: "+25% damage vs burning foes.", effect: { kind: "passive", hook: "vs_burning", power: 25 } },
  { key: "2b", tier: 2, name: "Dark Enlightenment", desc: "+10% crit.", effect: { kind: "passive", hook: "crit_bonus", power: 10 } },
  { key: "3a", tier: 3, name: "Void Torrent", desc: "SW:Pain +0.4× damage.", effect: { kind: "ability", mod: { abilityId: "swp", multDelta: 0.4 } } },
  { key: "3b", tier: 3, name: "Vampiric Touch", desc: "Smite leeches 15% life.", effect: { kind: "ability", mod: { abilityId: "smite", lifestealDelta: 0.15 } } },
  { key: "4a", tier: 4, name: "Insanity", desc: "SW:Pain burn +2 turns.", effect: { kind: "ability", mod: { abilityId: "swp", statusAmp: { kind: "burn", turnsDelta: 2 } } } },
  { key: "4b", tier: 4, name: "Death and Madness", desc: "Kills empower next hit (+30%).", effect: { kind: "passive", hook: "kill_frenzy", power: 30 } },
  { key: "5a", tier: 5, name: "Mind Blast", capstone: true, desc: "★ Smite becomes Mind Blast: 1.8× MAG.", effect: { kind: "ability", mod: { abilityId: "smite", multDelta: 0.8, rename: "Mind Blast", descOverride: "Psychic blast. 1.8× MAG shadow damage." } } },
  { key: "5b", tier: 5, name: "Void Eruption", capstone: true, desc: "★ SW:Pain: 1.8× MAG, spreads burn.", effect: { kind: "ability", mod: { abilityId: "swp", multDelta: 0.6, statusAmp: { kind: "burn", powerDelta: 4 }, rename: "Void Eruption", descOverride: "Void burst. 1.8× MAG, devastating burn." } } },
  { key: "5c", tier: 5, name: "Shadow Crash", capstone: true, desc: "★ Smite: 1.6× MAG, heavy shadow burn.", effect: { kind: "ability", mod: { abilityId: "smite", multDelta: 0.6, extraStatus: { kind: "burn", turns: 5, power: 5 }, rename: "Shadow Crash", descOverride: "Shadow crash. 1.6× MAG + brutal burn." } } },
]);

// ── Druid ───────────────────────────────────────────────────────────────────

const balance = buildTree("balance", [
  { key: "1", tier: 1, name: "Eclipse", desc: "Burn ticks +2 damage.", effect: { kind: "passive", hook: "dot_amp_burn", power: 2 } },
  { key: "2a", tier: 2, name: "Shooting Stars", desc: "+25% vs burning foes.", effect: { kind: "passive", hook: "vs_burning", power: 25 } },
  { key: "2b", tier: 2, name: "Nature's Grace", desc: "Wrath +0.25× damage.", effect: { kind: "ability", mod: { abilityId: "wrath", multDelta: 0.25 } } },
  { key: "3a", tier: 3, name: "Sunfire", desc: "Moonfire burn +2 power.", effect: { kind: "ability", mod: { abilityId: "moonfire", statusAmp: { kind: "burn", powerDelta: 2 } } } },
  { key: "3b", tier: 3, name: "Starlord", desc: "+10% crit.", effect: { kind: "passive", hook: "crit_bonus", power: 10 } },
  { key: "4a", tier: 4, name: "Celestial Alignment", desc: "Moonfire +0.3× damage.", effect: { kind: "ability", mod: { abilityId: "moonfire", multDelta: 0.3 } } },
  { key: "4b", tier: 4, name: "Astral Influence", desc: "+4 MAG.", effect: { kind: "stat", mag: 4 } },
  { key: "5a", tier: 5, name: "Starsurge", capstone: true, desc: "★ Wrath becomes Starsurge: 1.8× MAG + burn.", effect: { kind: "ability", mod: { abilityId: "wrath", multDelta: 0.8, extraStatus: { kind: "burn", turns: 3, power: 5 }, rename: "Starsurge", descOverride: "Celestial strike. 1.8× MAG + burn." } } },
  { key: "5b", tier: 5, name: "Fury of Elune", capstone: true, desc: "★ Moonfire: 1.8× MAG, long burn.", effect: { kind: "ability", mod: { abilityId: "moonfire", multDelta: 0.6, statusAmp: { kind: "burn", turnsDelta: 2, powerDelta: 3 }, rename: "Fury of Elune", descOverride: "Lunar wrath. 1.8× MAG, long burn." } } },
  { key: "5c", tier: 5, name: "New Moon", capstone: true, desc: "★ Wrath: 1.5× MAG, lunar burst.", effect: { kind: "ability", mod: { abilityId: "wrath", multDelta: 0.5, rename: "New Moon", descOverride: "New moon wrath. 1.5× MAG." } } },
]);

const feral = buildTree("feral", [
  { key: "1", tier: 1, name: "Primal Fury", desc: "Bleed ticks +2 damage.", effect: { kind: "passive", hook: "dot_amp_bleed", power: 2 } },
  { key: "2a", tier: 2, name: "Predator's Swiftness", desc: "+25% vs bleeding.", effect: { kind: "passive", hook: "vs_bleeding", power: 25 } },
  { key: "2b", tier: 2, name: "Tiger's Fury", desc: "Wrath +0.2× damage.", effect: { kind: "ability", mod: { abilityId: "wrath", multDelta: 0.2 } } },
  { key: "3a", tier: 3, name: "Rake", desc: "Moonfire applies bleed (4t).", effect: { kind: "ability", mod: { abilityId: "moonfire", extraStatus: { kind: "bleed", turns: 4, power: 4 } } } },
  { key: "3b", tier: 3, name: "Bloodtalons", desc: "Crits apply 3 bleed.", effect: { kind: "passive", hook: "crit_dot_bleed", power: 3 } },
  { key: "4a", tier: 4, name: "Rip", desc: "Moonfire bleed +2 power.", effect: { kind: "ability", mod: { abilityId: "moonfire", statusAmp: { kind: "bleed", powerDelta: 2 } } } },
  { key: "4b", tier: 4, name: "Survival Instincts", desc: "Below 40% HP, +20% damage.", effect: { kind: "passive", hook: "low_hp_dmg", power: 20 } },
  { key: "5a", tier: 5, name: "Ferocious Bite", capstone: true, desc: "★ Wrath becomes Ferocious Bite: 1.6× MAG, ×1.5 vs bleed.", effect: { kind: "ability", mod: { abilityId: "wrath", multDelta: 0.6, bonusVsBleedMult: 1.5, rename: "Ferocious Bite", descOverride: "Savage bite. 1.6× MAG, bonus vs bleeding." } } },
  { key: "5b", tier: 5, name: "Primal Wrath", capstone: true, desc: "★ Moonfire: 1.6× MAG, brutal bleed.", effect: { kind: "ability", mod: { abilityId: "moonfire", multDelta: 0.4, statusAmp: { kind: "bleed", powerDelta: 4, turnsDelta: 2 }, rename: "Primal Wrath", descOverride: "Primal rake. 1.6× MAG, savage bleed." } } },
  { key: "5c", tier: 5, name: "Incarnation", capstone: true, desc: "★ Rejuvenation: heal +4/t, +3 turns.", effect: { kind: "ability", mod: { abilityId: "rejuv", hotPowerDelta: 4, hotTurnsDelta: 3, rename: "Incarnation", descOverride: "Predator's renewal. +4 heal/t, 7 turns." } } },
]);

const restoration = buildTree("resto", [
  { key: "1", tier: 1, name: "Germination", desc: "HoT heals +3 per tick.", effect: { kind: "passive", hook: "hot_amp", power: 3 } },
  { key: "2a", tier: 2, name: "Cultivation", desc: "Rejuvenation +2 turns.", effect: { kind: "ability", mod: { abilityId: "rejuv", hotTurnsDelta: 2 } } },
  { key: "2b", tier: 2, name: "Nourish", desc: "Wrath heals 10% of damage.", effect: { kind: "ability", mod: { abilityId: "wrath", lifestealDelta: 0.1 } } },
  { key: "3a", tier: 3, name: "Swiftmend", desc: "Rejuvenation +3 heal/tick.", effect: { kind: "ability", mod: { abilityId: "rejuv", hotPowerDelta: 3 } } },
  { key: "3b", tier: 3, name: "Photosynthesis", desc: "+4 MAG.", effect: { kind: "stat", mag: 4 } },
  { key: "4a", tier: 4, name: "Flourish", desc: "Pass Turn ticks CDs twice.", effect: { kind: "passive", hook: "pass_cd_tick", power: 1 } },
  { key: "4b", tier: 4, name: "Overgrowth", desc: "Moonfire applies Rejuvenation on you.", effect: { kind: "ability", mod: { abilityId: "moonfire", hotPowerDelta: 2, rename: "Overgrowth", descOverride: "Moonfire + self HoT when used." } } },
  { key: "5a", tier: 5, name: "Wild Growth", capstone: true, desc: "★ Rejuvenation: 8 heal/tick, 6 turns.", effect: { kind: "ability", mod: { abilityId: "rejuv", hotPowerDelta: 5, hotTurnsDelta: 2, rename: "Wild Growth", descOverride: "Rampant growth. 8 HP/tick for 6 turns." } } },
  { key: "5b", tier: 5, name: "Tranquility", capstone: true, desc: "★ Wrath: 1.3× MAG, heals 50% dealt.", effect: { kind: "ability", mod: { abilityId: "wrath", multDelta: 0.3, lifestealDelta: 0.5, rename: "Tranquility", descOverride: "Tranquil bolt. 1.3× MAG, heal half dealt." } } },
  { key: "5c", tier: 5, name: "Ironbark", capstone: true, desc: "★ Moonfire: 1.2× MAG, +15% dodge 2t.", effect: { kind: "ability", mod: { abilityId: "moonfire", multDelta: 0.2, rename: "Ironbark", descOverride: "Barkskin strike. 1.2× MAG, toughen yourself." } } },
]);

// ── Death Knight ────────────────────────────────────────────────────────────

const blood_dk = buildTree("blood", [
  { key: "1", tier: 1, name: "Crimson Scourge", desc: "Bleed ticks +2.", effect: { kind: "passive", hook: "dot_amp_bleed", power: 2 } },
  { key: "2a", tier: 2, name: "Bone Shield", desc: "+6 Max HP, +2% dodge.", effect: { kind: "stat", maxHp: 6, dodge: 2 } },
  { key: "2b", tier: 2, name: "Hemostasis", desc: "Death Strike leeches +10%.", effect: { kind: "ability", mod: { abilityId: "deathstrike", lifestealDelta: 0.1 } } },
  { key: "3a", tier: 3, name: "Heart Strike", desc: "Frost Strike +0.3× damage.", effect: { kind: "ability", mod: { abilityId: "froststrike", multDelta: 0.3 } } },
  { key: "3b", tier: 3, name: "Bloodworms", desc: "Below 40% HP, +20% damage.", effect: { kind: "passive", hook: "low_hp_dmg", power: 20 } },
  { key: "4a", tier: 4, name: "Dancing Rune Weapon", desc: "Blood Boil CD −1.", effect: { kind: "ability", mod: { abilityId: "bloodboil", cooldownDelta: -1 } } },
  { key: "4b", tier: 4, name: "Vampiric Blood", desc: "All attacks +10% lifesteal.", effect: { kind: "passive", hook: "lifesteal_boost", power: 10 } },
  { key: "5a", tier: 5, name: "Marrowrend", capstone: true, desc: "★ Death Strike: 1.6× ATK, 50% lifesteal.", effect: { kind: "ability", mod: { abilityId: "deathstrike", multDelta: 0.3, lifestealDelta: 0.2, rename: "Marrowrend", descOverride: "Bone rend. 1.6× ATK, heal half dealt." } } },
  { key: "5b", tier: 5, name: "Blooddrinker", capstone: true, desc: "★ Blood Boil: 2.0× ATK, brutal bleed.", effect: { kind: "ability", mod: { abilityId: "bloodboil", multDelta: 0.3, statusAmp: { kind: "bleed", powerDelta: 3 }, rename: "Blooddrinker", descOverride: "Blood chug. 2.0× ATK, heavy bleed." } } },
  { key: "5c", tier: 5, name: "Anti-Magic Shell", capstone: true, desc: "★ Frost Strike: deep chill + 25% lifesteal.", effect: { kind: "ability", mod: { abilityId: "froststrike", lifestealDelta: 0.25, statusAmp: { kind: "chill", turnsDelta: 1, powerDelta: 0.1 }, rename: "Anti-Magic Shell", descOverride: "Runic ward. Chill + 25% lifesteal." } } },
]);

const frost_dk = buildTree("dkfrost", [
  { key: "1", tier: 1, name: "Rime", desc: "+30% vs chilled foes.", effect: { kind: "passive", hook: "vs_chilled", power: 30 } },
  { key: "2a", tier: 2, name: "Killing Machine", desc: "+12% crit.", effect: { kind: "passive", hook: "crit_bonus", power: 12 } },
  { key: "2b", tier: 2, name: "Frozen Pulse", desc: "Frost Strike chill +1 turn.", effect: { kind: "ability", mod: { abilityId: "froststrike", statusAmp: { kind: "chill", turnsDelta: 1 } } } },
  { key: "3a", tier: 3, name: "Howling Blast", desc: "Frost Strike +0.4× damage.", effect: { kind: "ability", mod: { abilityId: "froststrike", multDelta: 0.4 } } },
  { key: "3b", tier: 3, name: "Gathering Storm", desc: "Chill potency +0.1.", effect: { kind: "passive", hook: "dot_amp_chill", power: 1 } },
  { key: "4a", tier: 4, name: "Pillar of Frost", desc: "Death Strike ×1.5 vs chilled.", effect: { kind: "ability", mod: { abilityId: "deathstrike", bonusVsChillDelta: 0.5 } } },
  { key: "4b", tier: 4, name: "Breath of Sindragosa", desc: "Blood Boil applies chill.", effect: { kind: "ability", mod: { abilityId: "bloodboil", extraStatus: { kind: "chill", turns: 2, power: 1.3 } } } },
  { key: "5a", tier: 5, name: "Obliterate", capstone: true, desc: "★ Death Strike: 2.0× ATK, ×2 vs chilled.", effect: { kind: "ability", mod: { abilityId: "deathstrike", multDelta: 0.7, bonusVsChillDelta: 1.0, rename: "Obliterate", descOverride: "Rune obliteration. 2.0× ATK, shatters chill." } } },
  { key: "5b", tier: 5, name: "Frostscythe", capstone: true, desc: "★ Frost Strike: 1.4× ATK, always chills.", effect: { kind: "ability", mod: { abilityId: "froststrike", multDelta: 0.4, statusAmp: { kind: "chill", powerDelta: 0.2, turnsDelta: 1 }, rename: "Frostscythe", descOverride: "Scythe of frost. 1.4× ATK, deep chill." } } },
  { key: "5c", tier: 5, name: "Remorseless Winter", capstone: true, desc: "★ Blood Boil: 1.8× ATK, freeze 1t.", effect: { kind: "ability", mod: { abilityId: "bloodboil", multDelta: 0.1, rename: "Remorseless Winter", descOverride: "Winter storm. 1.8× ATK, brief freeze." } } },
]);

const unholy = buildTree("unholy", [
  { key: "1", tier: 1, name: "Festering Wounds", desc: "Bleed ticks +2.", effect: { kind: "passive", hook: "dot_amp_bleed", power: 2 } },
  { key: "2a", tier: 2, name: "Unholy Blight", desc: "+25% vs bleeding.", effect: { kind: "passive", hook: "vs_bleeding", power: 25 } },
  { key: "2b", tier: 2, name: "All Will Serve", desc: "Death Strike +0.2× damage.", effect: { kind: "ability", mod: { abilityId: "deathstrike", multDelta: 0.2 } } },
  { key: "3a", tier: 3, name: "Defile", desc: "Blood Boil burn +2.", effect: { kind: "ability", mod: { abilityId: "bloodboil", extraStatus: { kind: "burn", turns: 3, power: 4 } } } },
  { key: "3b", tier: 3, name: "Epidemic", desc: "Burn ticks +2.", effect: { kind: "passive", hook: "dot_amp_burn", power: 2 } },
  { key: "4a", tier: 4, name: "Dark Transformation", desc: "Frost Strike applies bleed.", effect: { kind: "ability", mod: { abilityId: "froststrike", extraStatus: { kind: "bleed", turns: 3, power: 4 } } } },
  { key: "4b", tier: 4, name: "Soul Reaper", desc: "Kills empower next hit (+25%).", effect: { kind: "passive", hook: "kill_frenzy", power: 25 } },
  { key: "5a", tier: 5, name: "Festering Strike", capstone: true, desc: "★ Death Strike: 1.5× ATK, festering bleed.", effect: { kind: "ability", mod: { abilityId: "deathstrike", multDelta: 0.2, statusAmp: { kind: "bleed", powerDelta: 3, turnsDelta: 2 }, rename: "Festering Strike", descOverride: "Festering blade. 1.5× ATK, plague bleed." } } },
  { key: "5b", tier: 5, name: "Army of the Dead", capstone: true, desc: "★ Blood Boil: 2.0× ATK, plague burn.", effect: { kind: "ability", mod: { abilityId: "bloodboil", multDelta: 0.3, statusAmp: { kind: "burn", powerDelta: 4 }, rename: "Army of the Dead", descOverride: "Legion boil. 2.0× ATK, plague fire." } } },
  { key: "5c", tier: 5, name: "Summon Gargoyle", capstone: true, desc: "★ Frost Strike: 1.5× ATK, ignores guard.", effect: { kind: "ability", mod: { abilityId: "froststrike", multDelta: 0.5, ignoreGuard: true, rename: "Summon Gargoyle", descOverride: "Gargoyle strike. 1.5× ATK, pierces guard." } } },
]);

// ── Demon Hunter ──────────────────────────────────────────────────────────

const havoc = buildTree("havoc", [
  { key: "1", tier: 1, name: "Demon Blades", desc: "Chaos Strike +0.15× damage.", effect: { kind: "ability", mod: { abilityId: "chaosstrike", multDelta: 0.15 } } },
  { key: "2a", tier: 2, name: "Critical Chaos", desc: "+15% crit chance.", effect: { kind: "passive", hook: "crit_bonus", power: 15 } },
  { key: "2b", tier: 2, name: "Burning Hatred", desc: "Burn ticks +2.", effect: { kind: "passive", hook: "dot_amp_burn", power: 2 } },
  { key: "3a", tier: 3, name: "Trail of Ruin", desc: "Fel Rush burn +2 power.", effect: { kind: "ability", mod: { abilityId: "felrush", statusAmp: { kind: "burn", powerDelta: 2 } } } },
  { key: "3b", tier: 3, name: "Chaos Theory", desc: "Fel Rush CD −1.", effect: { kind: "ability", mod: { abilityId: "felrush", cooldownDelta: -1 } } },
  { key: "4a", tier: 4, name: "First Blood", desc: "Eye Beam +0.4× damage.", effect: { kind: "ability", mod: { abilityId: "eyebeam", multDelta: 0.4 } } },
  { key: "4b", tier: 4, name: "Cycle of Hatred", desc: "Kills empower next hit (+25%).", effect: { kind: "passive", hook: "kill_frenzy", power: 25 } },
  { key: "5a", tier: 5, name: "Blade Dance", capstone: true, desc: "★ Chaos Strike: 1.5× ATK, +25% crit.", effect: { kind: "ability", mod: { abilityId: "chaosstrike", multDelta: 0.4, bonusCritPct: 25, rename: "Blade Dance", descOverride: "Glaive dance. 1.5× ATK, +25% crit." } } },
  { key: "5b", tier: 5, name: "Metamorphosis", capstone: true, desc: "★ Eye Beam: 2.6× MAG, ignores guard.", effect: { kind: "ability", mod: { abilityId: "eyebeam", multDelta: 0.4, ignoreGuard: true, rename: "Metamorphosis", descOverride: "Demon form. 2.6× MAG, pierces guard." } } },
  { key: "5c", tier: 5, name: "Essence Break", capstone: true, desc: "★ Fel Rush: 2.0× MAG, brutal burn.", effect: { kind: "ability", mod: { abilityId: "felrush", multDelta: 0.4, statusAmp: { kind: "burn", powerDelta: 4 }, rename: "Essence Break", descOverride: "Fel eruption. 2.0× MAG, heavy burn." } } },
]);

const vengeance = buildTree("veng", [
  { key: "1", tier: 1, name: "Soul Rending", desc: "All attacks +12% lifesteal.", effect: { kind: "passive", hook: "lifesteal_boost", power: 12 } },
  { key: "2a", tier: 2, name: "Fracture", desc: "Chaos Strike +0.2× damage.", effect: { kind: "ability", mod: { abilityId: "chaosstrike", multDelta: 0.2 } } },
  { key: "2b", tier: 2, name: "Feed the Demon", desc: "+8 Max HP, +2% dodge.", effect: { kind: "stat", maxHp: 8, dodge: 2 } },
  { key: "3a", tier: 3, name: "Spirit Bomb", desc: "Eye Beam leeches 30%.", effect: { kind: "ability", mod: { abilityId: "eyebeam", lifestealDelta: 0.3 } } },
  { key: "3b", tier: 3, name: "Burning Alive", desc: "Burn ticks +2.", effect: { kind: "passive", hook: "dot_amp_burn", power: 2 } },
  { key: "4a", tier: 4, name: "Soul Carver", desc: "Fel Rush +0.3× damage.", effect: { kind: "ability", mod: { abilityId: "felrush", multDelta: 0.3 } } },
  { key: "4b", tier: 4, name: "Painbringer", desc: "Below 40% HP, +20% damage.", effect: { kind: "passive", hook: "low_hp_dmg", power: 20 } },
  { key: "5a", tier: 5, name: "Soul Cleave", capstone: true, desc: "★ Chaos Strike: 1.4× ATK, 60% lifesteal.", effect: { kind: "ability", mod: { abilityId: "chaosstrike", multDelta: 0.3, lifestealDelta: 0.4, rename: "Soul Cleave", descOverride: "Soul drink. 1.4× ATK, heal 60% dealt." } } },
  { key: "5b", tier: 5, name: "Fel Devastation", capstone: true, desc: "★ Eye Beam: 2.6× MAG, heals 40% dealt.", effect: { kind: "ability", mod: { abilityId: "eyebeam", multDelta: 0.4, lifestealDelta: 0.4, rename: "Fel Devastation", descOverride: "Fel beam. 2.6× MAG, heal 40% dealt." } } },
  { key: "5c", tier: 5, name: "Demon Spikes", capstone: true, desc: "★ Fel Rush: 1.8× MAG, +20% dodge next hit.", effect: { kind: "ability", mod: { abilityId: "felrush", multDelta: 0.2, rename: "Demon Spikes", descOverride: "Spiked rush. 1.8× MAG, armored charge." } } },
]);

export const TALENT_TREES: Record<string, TalentNode[]> = {
  arms: ARMS_TREE_V2,
  fury,
  protection,
  assassination,
  outlaw,
  subtlety,
  frost,
  fire,
  arcane,
  discipline,
  holy,
  shadow,
  balance,
  feral,
  restoration,
  blood_dk,
  frost_dk,
  unholy,
  havoc,
  vengeance,
};
