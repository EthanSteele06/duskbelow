import type { StatusEffectKind } from "@/game/data";
import { ARMS_TREE_V2 } from "@/game/talents/arms";
import { FURY_TREE_V2 } from "@/game/talents/fury";
import { PROTECTION_TREE_V2 } from "@/game/talents/protection";
import { ASSASSINATION_TREE_V2 } from "@/game/talents/assassination";
import { OUTLAW_TREE_V2 } from "@/game/talents/outlaw";
import { SUBTLETY_TREE_V2 } from "@/game/talents/subtlety";
import { BLOOD_DK_TREE_V2 } from "@/game/talents/blood_dk";
import { FROST_DK_TREE_V2 } from "@/game/talents/frost_dk";
import { UNHOLY_TREE_V2 } from "@/game/talents/unholy";
import { HAVOC_TREE_V2 } from "@/game/talents/havoc";
import { VENGEANCE_TREE_V2 } from "@/game/talents/vengeance";
import { FROST_MAGE_TREE_V2 } from "@/game/talents/mage_frost";
import { FIRE_MAGE_TREE_V2 } from "@/game/talents/mage_fire";
import { ARCANE_MAGE_TREE_V2 } from "@/game/talents/mage_arcane";
import { DISCIPLINE_TREE_V2 } from "@/game/talents/discipline";
import { HOLY_TREE_V2 } from "@/game/talents/holy";
import { SHADOW_TREE_V2 } from "@/game/talents/shadow";
import { BALANCE_TREE_V2 } from "@/game/talents/balance";
import { FERAL_TREE_V2 } from "@/game/talents/feral";
import { RESTORATION_TREE_V2 } from "@/game/talents/restoration";

export type TalentPassiveHook =
  | "dot_amp_bleed"
  | "dot_amp_burn"
  | "dot_amp_chill"
  | "vs_bleeding"
  | "vs_burning"
  | "vs_chilled"
  | "crit_dot_bleed"
  | "crit_dot_burn"
  | "crit_dot_chill"
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

export const TALENT_TREES: Record<string, TalentNode[]> = {
  arms: ARMS_TREE_V2,
  fury: FURY_TREE_V2,
  protection: PROTECTION_TREE_V2,
  assassination: ASSASSINATION_TREE_V2,
  outlaw: OUTLAW_TREE_V2,
  subtlety: SUBTLETY_TREE_V2,
  blood_dk: BLOOD_DK_TREE_V2,
  frost_dk: FROST_DK_TREE_V2,
  unholy: UNHOLY_TREE_V2,
  havoc: HAVOC_TREE_V2,
  vengeance: VENGEANCE_TREE_V2,
  frost: FROST_MAGE_TREE_V2,
  fire: FIRE_MAGE_TREE_V2,
  arcane: ARCANE_MAGE_TREE_V2,
  discipline: DISCIPLINE_TREE_V2,
  holy: HOLY_TREE_V2,
  shadow: SHADOW_TREE_V2,
  balance: BALANCE_TREE_V2,
  feral: FERAL_TREE_V2,
  restoration: RESTORATION_TREE_V2,
};
