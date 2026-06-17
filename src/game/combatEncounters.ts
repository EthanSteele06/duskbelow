import {
  enemyForDepth, playerThreat, threatHpScale, threatTierFor, depthHpBonus,
  bossFloorsForMode, rollChest, FACTION_SHRINES,
  isMajorBossFloor, isMiniBossFloor, MAX_DEPTH,
  type FactionId, type FactionShrineId, type PlayerThreatSnap, type ZoneContext, type DungeonMode,
  type EnemyDef, type EnemyIntent, type ChestPreview,
} from "@/game/data";
import type { CombatEnc, CombatFoe } from "@/game/combatTypes";

type ShrineKind = "heal" | "blessing" | FactionShrineId;
type TrapKind = "spikes" | "gas";
type ForkBias = "left" | "onward" | "right";

export type NonCombatEncounter =
  | { kind: "path"; depth: number }
  | { kind: "chest"; depth: number; preview: ChestPreview }
  | { kind: "shrine"; depth: number; shrine: ShrineKind }
  | { kind: "trap"; depth: number; trap: TrapKind; sprung: boolean };

export type Encounter = NonCombatEncounter | CombatEnc;

function pickIntent(enemy: EnemyDef): EnemyIntent {
  const teleg = enemy.intents.filter((i) => i.telegraphable);
  const normal = enemy.intents.filter((i) => !i.telegraphable);
  if (teleg.length && Math.random() < 0.35) return teleg[Math.floor(Math.random() * teleg.length)];
  const pool = normal.length ? normal : enemy.intents;
  return pool[Math.floor(Math.random() * pool.length)];
}

function threatKindForDepth(depth: number, mode: DungeonMode = "normal") {
  if (isMajorBossFloor(depth, mode)) return "major" as const;
  if (isMiniBossFloor(depth, mode)) return "mini" as const;
  return "trash" as const;
}

function spawnFoe(
  enemy: EnemyDef,
  depth: number,
  hpScale: number,
  affixes: string[],
  zones: ZoneContext,
  mode: DungeonMode,
  packHpMult = 1,
): CombatFoe {
  let hp = Math.floor((enemy.hpBase + depthHpBonus(depth)) * hpScale * packHpMult);
  if (zones.voidSanctum && depth >= 21 && depth <= 25) hp = Math.floor(hp * 1.08);
  if (mode === "ascension" && depth > MAX_DEPTH) hp = Math.floor(hp * 1.15);
  if (affixes.includes("fortified")) hp = Math.floor(hp * 1.3);
  return {
    enemy,
    hp,
    maxHp: hp,
    stunnedTurns: 0,
    guardPct: 0,
    parryActive: false,
    effects: [],
    nextIntent: enemy.id === "bone_warden"
      ? (enemy.intents.find((i) => i.telegraphable) ?? pickIntent(enemy))
      : pickIntent(enemy),
    bossPhase: 1,
  };
}

/** ~28% of trash fights spawn 2–3 weaker foes instead of one. Boss floors stay solo. */
export function buildCombat(
  depth: number,
  snap: PlayerThreatSnap,
  faction?: FactionId | null,
  affixes: string[] = [],
  zones: ZoneContext = {},
  mode: DungeonMode = "normal",
): CombatEnc {
  const kind = threatKindForDepth(depth, mode);
  const hpScale = threatHpScale(playerThreat(snap), depth, kind);
  const tier = threatTierFor(hpScale);
  const shared = {
    kind: "combat" as const,
    depth,
    shieldReduce: 0,
    playerEffects: [] as CombatEnc["playerEffects"],
    threatHpScale: hpScale,
    threatTier: tier,
    combatTurns: 0,
    turnEnrageAnnounced: 0,
  };

  if (kind === "trash" && Math.random() < 0.28) {
    const count = Math.random() < 0.35 ? 3 : 2;
    const packMult = count === 2 ? 0.58 : 0.48;
    const foes: CombatFoe[] = [];
    for (let i = 0; i < count; i++) {
      const enemy = enemyForDepth(depth, faction, zones, mode);
      foes.push(spawnFoe(enemy, depth, hpScale, affixes, zones, mode, packMult));
    }
    return { ...shared, foes, focusIndex: 0, isPack: true };
  }

  const enemy = enemyForDepth(depth, faction, zones, mode);
  const foe = spawnFoe(enemy, depth, hpScale, affixes, zones, mode);
  return { ...shared, foes: [foe], focusIndex: 0, isPack: false };
}

export function rollEncounter(
  depth: number,
  snap: PlayerThreatSnap,
  faction?: FactionId | null,
  affixes: string[] = [],
  bias: ForkBias = "onward",
  chestBias = 0,
  zones: ZoneContext = {},
  mode: DungeonMode = "normal",
): Encounter {
  const bosses = bossFloorsForMode(mode);
  if (bosses[depth]) return buildCombat(depth, snap, faction, affixes, zones, mode);
  const combatW = 0.58 * (bias === "left" ? 1.6 : bias === "right" ? 0.7 : 1);
  const trapW = 0.12 * (bias === "left" ? 0.5 : bias === "right" ? 1.8 : 1);
  const shrineW = 0.04 * (bias === "left" ? 0.5 : bias === "right" ? 1.8 : 1);
  const chestW = 0.20 + chestBias;
  const pathW = Math.max(0.03, 0.06 - chestBias * 0.25);
  const total = combatW + chestW + shrineW + trapW + pathW;
  const r = Math.random() * total;
  let acc = 0;
  if (r < (acc += combatW)) return buildCombat(depth, snap, faction, affixes, zones, mode);
  if (r < (acc += chestW)) return { kind: "chest", depth, preview: rollChest(depth) };
  if (r < (acc += shrineW)) {
    if (faction) {
      const def = FACTION_SHRINES.find((s) => s.faction === faction);
      if (def && Math.random() < 0.5) return { kind: "shrine", depth, shrine: def.id };
    }
    return { kind: "shrine", depth, shrine: Math.random() < 0.6 ? "heal" : "blessing" };
  }
  if (r < (acc += trapW)) return { kind: "trap", depth, trap: Math.random() < 0.5 ? "spikes" : "gas", sprung: false };
  return { kind: "path", depth };
}
