import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useGame } from "@/game/store";
import { FloatingNumber, nextFloatingId, type FloatingNum } from "./FloatingNumber";
import {
  CLASS_ABILITIES, SPEC_ABILITIES, CLASSES, COSMETICS, FACTIONS, rollGear, MATERIALS, RECIPES,
  RARITY_CLASS, RARITY_LABEL, rollDamage, damageRange, formatGearStatsLine,
  MAX_DEPTH, MAJOR_BOSS_FLOORS, MINI_BOSS_FLOORS, dungeonBgForDepth, depthAmbientStyle, rollClassLegendary, AFFIXES, BOSS_MOMENTS, FACTION_SHRINES,
  equippedGearScore, playerThreat, threatHpScale, threatAtkScale, threatTierFor, THREAT_TIERS, depthHpBonus,
  threatLootBonus, turnEnrageMult, turnEnrageLabel, maxDepthForMode, bossFloorsForMode, isMajorBossFloor, isMiniBossFloor,
  type Ability, type EnemyDef, type ChestPreview, type GearItem,
  type StatusEffect, type EnemyIntent, type EnemyIntentKind, type FactionId, type FactionShrineId,
  type PlayerThreatSnap, type ThreatKind, type ThreatTier, type ZoneContext, type DungeonMode,
} from "@/game/data";
import { bestiaryMasteryMult, echoStart, zoneModsForLevel } from "@/game/meta";
import { resolveCombatAbilities, getTalentPassives,
  abilityBonusCrit, abilityIgnoresGuard, abilityBonusVsBleed, stunBonusHealPct,
} from "@/game/talentCombat";
import {
  type CombatEnc, type CombatFoe,
  focusFoe, getFocusIndex, primaryEnemy, primaryFoe,
  allFoesDead, livingFoeIndices, mapFoes, updateFoeAt, normalizeFocus,
  totalEnemyHp, totalEnemyMaxHp, encRoomCombatKey,
} from "@/game/combatTypes";
import { rollEncounter } from "@/game/combatEncounters";
import {
  effectiveAbilityCost, resourceCostLabel, resourceDef, spendsResource,
} from "@/game/resources";
import { ResourceBar } from "@/game/ResourceBar";
import { playMusic, playSfx } from "@/game/audio";
import { TutorialTip } from "@/game/Tutorial";
import { SettingsButton } from "@/game/Settings";
import { GearCompare } from "@/game/GearCompare";
import { DungeonDescentOverlay } from "@/game/DungeonDescentOverlay";
import { TweenHpBar } from "@/game/TweenHpBar";
import { TypingLogLine } from "@/game/TypingLogLine";
import chestImg from "@/assets/dungeon-chest.jpg";
import shrineImg from "@/assets/dungeon-shrine.png";
import trapSpikesImg from "@/assets/trap-spikes.png";
import trapGasImg from "@/assets/trap-gas.png";

const vibrate = (ms: number | number[]) => { try { (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate?.(ms); } catch { /* noop */ } };

type TurnPhase = "idle" | "telegraph" | "resolving";
type RoomTransition = "idle" | "out" | "in";
type LogEntry = { id: number; text: string };

const TURN_TELEGRAPH_MS = 900;
const VICTORY_BEAT_MS = 1300;
const ROOM_FADE_OUT_MS = 280;
const ROOM_FADE_IN_MS = 320;

function encRoomKey(e: Encounter): string {
  switch (e.kind) {
    case "combat": return encRoomCombatKey(e);
    case "victory": return `victory-${e.depth}`;
    case "chest": return `chest-${e.depth}`;
    case "shrine": return `shrine-${e.depth}-${e.shrine}`;
    case "trap": return `trap-${e.depth}-${e.trap}-${e.sprung}`;
    case "path": return `path-${e.depth}`;
  }
}

function shouldRoomTransition(from: Encounter, to: Encounter): boolean {
  if (from.kind === "combat" && to.kind === "combat") return false;
  if (from.kind === "trap" && to.kind === "trap" && from.depth === to.depth) return false;
  return encRoomKey(from) !== encRoomKey(to);
}

interface Loot {
  enemy: EnemyDef;
  gold: number;
  xp: number;
  questItem?: string;
  material?: string;
  recipe?: string;
  gear?: GearItem;
  packBonus?: number;
}

type ShrineKind = "heal" | "blessing" | FactionShrineId;
type TrapKind = "spikes" | "gas";
type ForkBias = "left" | "onward" | "right";

type Encounter =
  | { kind: "path"; depth: number }
  | { kind: "victory"; depth: number; loot: Loot }
  | { kind: "chest"; depth: number; preview: ChestPreview }
  | { kind: "shrine"; depth: number; shrine: ShrineKind }
  | { kind: "trap"; depth: number; trap: TrapKind; sprung: boolean }
  | CombatEnc;

function chillMult(effects: StatusEffect[]) {
  const c = effects.find((e) => e.kind === "chill");
  return c ? c.power : 1;
}

function tickEffectsOnFoes(
  e: CombatEnc,
  log: (m: string) => void,
  dotAmp: { bleed?: number; burn?: number } = {},
): CombatEnc {
  return mapFoes(e, (foe) => {
    if (foe.hp <= 0) return foe;
    let hp = foe.hp;
    const next: StatusEffect[] = [];
    for (const ef of foe.effects) {
      if (ef.kind === "bleed") {
        const dmg = ef.power + (dotAmp.bleed ?? 0);
        hp = Math.max(0, hp - dmg);
        log(`${foe.enemy.name} bleeds for ${dmg}.`);
      } else if (ef.kind === "burn") {
        const dmg = ef.power + (dotAmp.burn ?? 0);
        hp = Math.max(0, hp - dmg);
        log(`${foe.enemy.name} burns for ${dmg}.`);
      }
      if (ef.turns - 1 > 0) next.push({ ...ef, turns: ef.turns - 1 });
    }
    return { ...foe, hp, effects: next };
  });
}

export function DungeonScreen() {
  const player = useGame((s) => s.player);
  const meta = useGame((s) => s.meta);
  const damage = useGame((s) => s.damage);
  const rewardGold = useGame((s) => s.rewardGold);
  const rewardXp = useGame((s) => s.rewardXp);
  const addQuestItem = useGame((s) => s.addQuestItem);
  const pushLog = useGame((s) => s.pushLog);
  const exitDungeon = useGame((s) => s.exitDungeon);
  const setScreen = useGame((s) => s.setScreen);
  const heal = useGame((s) => s.heal);
  const use = useGame((s) => s.use);
  const restoreBetweenRooms = useGame((s) => s.restoreBetweenRooms);
  const advanceAbilityCooldowns = useGame((s) => s.advanceAbilityCooldowns);
  const useRacial = useGame((s) => s.useRacial);
  const consumeMult = useGame((s) => s.consumeNextAttackMult);
  const equip = useGame((s) => s.equip);
  const spendResource = useGame((s) => s.spendResource);
  const gainResource = useGame((s) => s.gainResource);
  const gainResourceFromDamageDealt = useGame((s) => s.gainResourceFromDamageDealt);
  const tickResourceRegenTurn = useGame((s) => s.tickResourceRegenTurn);

  const armNextAttack = useGame((s) => s.armNextAttack);
  const classResource = resourceDef(player.classId);
  const specAbility = player.specId ? SPEC_ABILITIES[player.specId] : null;
  const abilities: Ability[] = player.classId
    ? resolveCombatAbilities(CLASS_ABILITIES[player.classId], specAbility, player.specId, player.talentRanks)
    : [];
  const talentPassives = getTalentPassives(player.specId, player.talentRanks);
  const costReduction = player.abilityCostReduction ?? 0;
  const abilityResourceCost = (ab: Ability) => effectiveAbilityCost(ab, costReduction);
  const dotAmp = { bleed: talentPassives.dot_amp_bleed, burn: talentPassives.dot_amp_burn };
  const inv = player.inventory;
  const faction = player.faction ? FACTIONS.find((f) => f.id === player.faction)! : null;

  const eq = player.equippedCosmetics ?? {};
  const weaponGlow = eq.weaponGlow ? COSMETICS.find((c) => c.id === eq.weaponGlow)?.tint : undefined;
  const dmgSkin    = eq.damageSkin ? COSMETICS.find((c) => c.id === eq.damageSkin)?.tint : undefined;

  const [enc, setEnc] = useState<Encounter>(() => ({
    kind: "path",
    depth: useGame.getState().player.dungeonDepth || 1,
  }));

  // Music: swap to boss track when fighting a boss, dungeon ambient otherwise.
  useEffect(() => {
    const isBoss = enc.kind === "combat" && (isMajorBossFloor(enc.depth, player.dungeonMode) || isMiniBossFloor(enc.depth, player.dungeonMode));
    playMusic(isBoss ? "boss" : "dungeon");
  }, [enc.kind, enc.kind === "combat" ? primaryEnemy(enc).id : null]);
  const playerFaction = player.faction;
  const [hit, setHit] = useState(false);
  const [combatLog, setCombatLog] = useState<LogEntry[]>([]);
  const [hoveredAbility, setHoveredAbility] = useState<Ability | null>(null);
  const [armedAbility, setArmedAbility] = useState<string | null>(null);
  const [equippedFlash, setEquippedFlash] = useState<string | null>(null);
  const [floaters, setFloaters] = useState<FloatingNum[]>([]);
  const [attackFx, setAttackFx] = useState<{ kind: "melee" | "spell"; key: number; tint?: string } | null>(null);
  const [forkBias, setForkBias] = useState<ForkBias>("onward");
  const [bossIntro, setBossIntro] = useState<{ id: string; intro: string } | null>(null);
  const [showDescent, setShowDescent] = useState(true);
  const [turnPhase, setTurnPhase] = useState<TurnPhase>("idle");
  const [arenaFlash, setArenaFlash] = useState(false);
  const [roomTransition, setRoomTransition] = useState<RoomTransition>("idle");
  const [victoryBeat, setVictoryBeat] = useState<{ depth: number; enemy: EnemyDef; enemyMaxHp: number; loot: Loot } | null>(null);
  const [readyPulse, setReadyPulse] = useState<Set<string>>(new Set());
  const logRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);
  const turnTimersRef = useRef<number[]>([]);
  const roomTimersRef = useRef<number[]>([]);
  const victoryTimerRef = useRef<number | null>(null);
  const finishingKillRef = useRef(false);
  const victoryBeatRef = useRef<{ depth: number; enemy: EnemyDef; enemyMaxHp: number; loot: Loot } | null>(null);
  const prevCdsRef = useRef<Record<string, number>>({});

  const clearTurnTimers = () => {
    turnTimersRef.current.forEach((id) => clearTimeout(id));
    turnTimersRef.current = [];
  };

  const clearVictoryTimer = () => {
    if (victoryTimerRef.current !== null) {
      clearTimeout(victoryTimerRef.current);
      victoryTimerRef.current = null;
    }
  };

  /** Reset turn state when leaving combat or entering a new room. */
  const resetCombatTurn = () => {
    clearTurnTimers();
    clearVictoryTimer();
    setTurnPhase("idle");
    setArmedAbility(null);
    setArenaFlash(false);
    finishingKillRef.current = false;
    victoryBeatRef.current = null;
    setVictoryBeat(null);
  };

  useEffect(() => () => {
    clearTurnTimers();
    roomTimersRef.current.forEach((id) => clearTimeout(id));
    if (victoryTimerRef.current !== null) clearTimeout(victoryTimerRef.current);
  }, []);

  const clearRoomTimers = () => {
    roomTimersRef.current.forEach((id) => clearTimeout(id));
    roomTimersRef.current = [];
  };

  const transitionToEnc = (next: Encounter, afterIn?: () => void) => {
    resetCombatTurn();
    const applyEnc = () => {
      setEnc(next);
      if (next.kind === "combat") armFirstHitCrit();
      afterIn?.();
    };
    if (!shouldRoomTransition(enc, next)) {
      applyEnc();
      return;
    }
    clearRoomTimers();
    setRoomTransition("out");
    const outId = window.setTimeout(() => {
      setEnc(next);
      if (next.kind === "combat") armFirstHitCrit();
      setRoomTransition("in");
      const inId = window.setTimeout(() => {
        setRoomTransition("idle");
        afterIn?.();
      }, ROOM_FADE_IN_MS);
      roomTimersRef.current.push(inId);
    }, ROOM_FADE_OUT_MS);
    roomTimersRef.current.push(outId);
  };

  useEffect(() => {
    const pulse = new Set<string>();
    for (const ab of abilities) {
      const cd = player.abilityCooldowns?.[ab.id] ?? 0;
      const prev = prevCdsRef.current[ab.id] ?? 0;
      if (prev > 0 && cd === 0) pulse.add(ab.id);
      prevCdsRef.current[ab.id] = cd;
    }
    if (pulse.size === 0) return;
    setReadyPulse(pulse);
    const id = window.setTimeout(() => setReadyPulse(new Set()), 780);
    return () => clearTimeout(id);
  }, [player.abilityCooldowns, abilities]);

  const classColor = player.classId ? CLASSES.find((c) => c.id === player.classId)?.color : undefined;

  const triggerFx = (kind: "melee" | "spell") => {
    setAttackFx({ kind, key: Date.now() + Math.random(), tint: kind === "spell" ? classColor : undefined });
    setTimeout(() => setAttackFx(null), 500);
  };

  const addFloater = (kind: FloatingNum["kind"], value: number, color?: string) => {
    setFloaters((f) => [...f, { id: nextFloatingId(), kind, value, color, x: 40 + Math.random() * 20 }]);
  };
  const removeFloater = (id: number) => setFloaters((f) => f.filter((x) => x.id !== id));

  const addLog = (msg: string) => {
    const id = ++logIdRef.current;
    setCombatLog((l) => [...l.slice(-20), { id, text: msg }]);
    pushLog(msg);
  };

  const logLineClass = (text: string) =>
    text.includes("damage!") && text.includes(player.name) ? "text-divine" :
    text.startsWith("✓") || text.startsWith("★") ? "text-gold" :
    text.includes("for") && text.includes("!") ? "text-blood" :
    "text-foreground";

  const onDescentComplete = () => {
    setShowDescent(false);
    setRoomTransition("in");
    const id = window.setTimeout(() => setRoomTransition("idle"), ROOM_FADE_IN_MS);
    roomTimersRef.current.push(id);
  };

  useEffect(() => {
    if (enc.kind !== "combat" && enc.kind !== "victory") {
      finishingKillRef.current = false;
      victoryBeatRef.current = null;
    }
    if (enc.kind === "victory") {
      finishingKillRef.current = false;
      setTurnPhase("idle");
    }
  }, [enc.kind]);

  const finishRun = useGame((s) => s.finishRun);
  const recordKill = useGame((s) => s.recordKill);
  const useHearth = useGame((s) => s.useHearthstone);
  const markBossSeen = useGame((s) => s.markBossSeen);
  const bumpDailyFloor = useGame((s) => s.bumpDailyFloor);
  const applyDungeonBuff = useGame((s) => s.applyDungeonBuff);
  const markEliteRetreat = useGame((s) => s.markEliteRetreat);
  const seenBossIntros = useGame((s) => s.meta.seenBossIntros);
  const armFirstHitCrit = useGame((s) => s.armFirstHitCrit);
  const consumeFirstHitCrit = useGame((s) => s.consumeFirstHitCrit);

  const zoneContext = (depth = enc.depth): ZoneContext => {
    const mods = zoneModsForLevel(meta.account.level);
    return {
      boneHalls: mods.includes("bone_halls"),
      voidSanctum: mods.includes("void_sanctum"),
      ascension: player.dungeonMode === "ascension" && depth > MAX_DEPTH,
    };
  };
  const encounterOpts = () => ({
    chestBias: echoStart(meta).chestBias,
    zones: zoneContext(),
    mode: player.dungeonMode,
  });

  useEffect(() => {
    if (player.hp <= 0) finishRun("defeat");
  }, [player.hp, finishRun]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [combatLog]);

  const playerThreatSnap = (): PlayerThreatSnap => ({
    atk: player.atk,
    mag: player.mag,
    level: player.level,
    gearScore: equippedGearScore(player.equipment),
  });

  const advance = (bias: ForkBias = "onward") => {
    const newDepth = enc.depth + 1;
    const maxDepth = maxDepthForMode(player.dungeonMode);
    if (newDepth > maxDepth) { finishRun("victory"); return; }
    restoreBetweenRooms();
    setForkBias(bias);
    bumpDailyFloor(newDepth);
    const opts = encounterOpts();
    const next = rollEncounter(
      newDepth, playerThreatSnap(), playerFaction, player.affixes ?? [], bias,
      opts.chestBias, opts.zones, opts.mode,
    );
    let afterRoomIn: (() => void) | undefined;
    if (next.kind === "combat") {
      const lead = primaryEnemy(next);
      const moment = BOSS_MOMENTS[lead.id];
      if (moment && !seenBossIntros.includes(lead.id)) {
        markBossSeen(lead.id);
        afterRoomIn = () => setBossIntro({ id: lead.id, intro: moment.intro });
      }
      if (next.isPack) {
        addLog(`${next.foes.length} foes block your path — ${next.foes.map((f) => f.enemy.name).join(", ")}!`);
      } else {
        addLog(`A ${lead.name} blocks your path!`);
      }
      if (next.threatTier !== "none") {
        const def = THREAT_TIERS[next.threatTier];
        addLog(`⚠ ${def.label} — ${def.intro}`);
      }
    }
    else if (next.kind === "chest") addLog(`You spot ${next.preview.label}.`);
    else addLog("The corridor opens further.");
    transitionToEnc(next, afterRoomIn);
  };

  const pickNextIntent = (foe: CombatFoe): EnemyIntent => {
    const moment = BOSS_MOMENTS[foe.enemy.id];
    const pool = moment && foe.bossPhase === 2 ? [...foe.enemy.intents, moment.phaseIntent] : foe.enemy.intents;
    const teleg = pool.filter((i) => i.telegraphable);
    const normal = pool.filter((i) => !i.telegraphable);
    return teleg.length && Math.random() < 0.4
      ? teleg[Math.floor(Math.random() * teleg.length)]
      : (normal.length ? normal : pool)[Math.floor(Math.random() * (normal.length || pool.length))];
  };

  const resolveFoeIntent = (e: CombatEnc, foeIndex: number, shieldReduce: number): { enc: CombatEnc; shieldReduce: number } => {
    const foe = e.foes[foeIndex];
    if (!foe || foe.hp <= 0) return { enc: e, shieldReduce };

    const moment = BOSS_MOMENTS[foe.enemy.id];
    let nextEnc = e;
    if (moment && foe.bossPhase === 1 && foe.hp <= foe.maxHp / 2) {
      addLog(`★ ${moment.phaseLine}`);
      nextEnc = updateFoeAt(nextEnc, foeIndex, { bossPhase: 2 });
    }
    const f = nextEnc.foes[foeIndex];

    if (f.stunnedTurns > 0) {
      addLog(`${f.enemy.name} is frozen and cannot act.`);
      return {
        enc: updateFoeAt(nextEnc, foeIndex, {
          stunnedTurns: f.stunnedTurns - 1,
          nextIntent: pickNextIntent(f),
        }),
        shieldReduce: 0,
      };
    }

    if (f.parryActive) {
      addLog(`${f.enemy.name}'s parry stance fades.`);
      nextEnc = updateFoeAt(nextEnc, foeIndex, { parryActive: false });
    }

    const intent = f.nextIntent;
    const kind = intent.kind ?? "attack";
    const nextIntent = pickNextIntent(f);

    if (kind === "guard") {
      addLog(intent.line.replace("{n}", f.enemy.name));
      return {
        enc: updateFoeAt(nextEnc, foeIndex, { guardPct: intent.guardPct ?? 0.4, nextIntent }),
        shieldReduce: 0,
      };
    }
    if (kind === "parry") {
      addLog(intent.line.replace("{n}", f.enemy.name));
      return {
        enc: updateFoeAt(nextEnc, foeIndex, { parryActive: true, nextIntent }),
        shieldReduce: 0,
      };
    }
    if (kind === "heal") {
      const amt = Math.max(1, Math.floor(f.maxHp * (intent.healPct ?? 0.12)));
      const newHp = Math.min(f.maxHp, f.hp + amt);
      addLog(intent.line.replace("{n}", f.enemy.name).replace("{h}", String(amt)));
      addFloater("heal", amt);
      return {
        enc: updateFoeAt(nextEnc, foeIndex, { hp: newHp, nextIntent }),
        shieldReduce: 0,
      };
    }

    const affixes = player.affixes ?? [];
    let mult = intent.mult;
    if (affixes.includes("sapping")) mult *= 1.2;
    if (affixes.includes("bloodlust") && f.hp / f.maxHp < 0.3) mult *= 1.5;
    if (moment && f.bossPhase === 2) mult *= moment.phaseDmgMult;
    if (player.activeOaths?.includes("deep")) mult *= 1.15;
    mult *= threatAtkScale(nextEnc.threatHpScale) * turnEnrageMult(nextEnc.combatTurns);
    const baseDmg = (f.enemy.atkBase + nextEnc.depth * 0.5) * mult;
    let dmg = rollDamage(baseDmg);
    if (shieldReduce > 0) dmg = Math.max(1, Math.floor(dmg * (1 - shieldReduce)));
    const taken = damage(dmg);
    if (taken > 0) {
      playSfx("enemy-hit");
      vibrate(18);
      addFloater("enemy", taken);
      setHit(true); setTimeout(() => setHit(false), 350);
    }
    addLog(intent.line.replace("{n}", f.enemy.name).replace("{d}", String(taken)) + (shieldReduce > 0 ? " (shielded!)" : ""));
    return {
      enc: updateFoeAt(nextEnc, foeIndex, { nextIntent }),
      shieldReduce: 0,
    };
  };

  const intentKindLabel = (kind: EnemyIntentKind | undefined) => {
    switch (kind ?? "attack") {
      case "guard": return "DEFENSIVE";
      case "parry": return "PARRY";
      case "heal": return "HEALING";
      default: return null;
    }
  };

  const telegraphBannerClass = (intent: EnemyIntent, phase: TurnPhase) => {
    if (phase !== "telegraph") return "";
    const kind = intent.kind ?? "attack";
    if (kind === "guard" || kind === "parry") return "combat-telegraph-defensive";
    if (kind === "heal") return "combat-telegraph-heal";
    return "combat-telegraph-active";
  };

  // Apply Renew (player HoT) — called at end of every player action turn
  const tickPlayerEffects = (e: CombatEnc): CombatEnc => {
    const hotBonus = talentPassives.hot_amp ?? 0;
    const next: StatusEffect[] = [];
    for (const ef of e.playerEffects) {
      if (ef.kind === "renew") {
        const amt = ef.power + hotBonus;
        heal(amt);
        addFloater("heal", amt);
        addLog(`Renew restores ${amt} HP.`);
      }
      if (ef.turns - 1 > 0) next.push({ ...ef, turns: ef.turns - 1 });
    }
    return { ...e, playerEffects: next };
  };

  const bumpTurnEnrage = (e: CombatEnc): CombatEnc => {
    const nextTurns = e.combatTurns + 1;
    const mult = turnEnrageMult(nextTurns);
    const announced = Math.max(e.turnEnrageAnnounced, 0);
    if (mult > 1 && mult > announced) {
      const label = turnEnrageLabel(nextTurns);
      const name = e.isPack ? "The pack" : focusFoe(e).enemy.name;
      if (label) addLog(`★ ${name} ${label}!`);
      return { ...e, combatTurns: nextTurns, turnEnrageAnnounced: mult };
    }
    return { ...e, combatTurns: nextTurns };
  };

  const enemyTurn = (eIn: CombatEnc): CombatEnc => {
    if (finishingKillRef.current || victoryBeatRef.current) return eIn;
    if (allFoesDead(eIn)) {
      finishKill(eIn);
      return eIn;
    }
    let e = bumpTurnEnrage(eIn);
    e = tickEffectsOnFoes(e, addLog, dotAmp);
    if (allFoesDead(e)) {
      finishKill(e);
      return e;
    }

    let shieldReduce = e.shieldReduce;
    for (const idx of livingFoeIndices(e)) {
      const res = resolveFoeIntent(e, idx, shieldReduce);
      e = res.enc;
      shieldReduce = res.shieldReduce;
      if (allFoesDead(e)) {
        finishKill({ ...e, shieldReduce: 0 });
        return e;
      }
    }
    return { ...normalizeFocus(e), shieldReduce: 0 };
  };

  const strikeOneFoe = (
    e: CombatEnc,
    foeIndex: number,
    ab: Ability & { effect: Extract<Ability["effect"], { kind: "attack" }> },
    opts: { consumeNextAttackMult?: boolean; logSuffix?: string },
  ): { enc: CombatEnc; totalDmg: number; anyCrit: boolean } => {
    const foe = e.foes[foeIndex];
    if (!foe || foe.hp <= 0) return { enc: e, totalDmg: 0, anyCrit: false };

    const base = ab.effect.useMag ? player.mag : player.atk;
    const aoeMult = ab.effect.targets === "all" ? (ab.effect.aoeMult ?? 1) : 1;
    const legendary = Object.values(player.equipment).find(
      (g) => g && g.classId === player.classId && g.empowersAbilityId === ab.id,
    );
    let dmgMult = 1;
    let bonusCritPct = 0;
    let lifestealMult = 1;
    let extraChillTurns = 0;
    let postHitHeal = 0;
    if (legendary) {
      switch (player.classId) {
        case "warrior":     dmgMult = 1.6; break;
        case "rogue":       bonusCritPct = 35; break;
        case "mage":        dmgMult = 1.5; extraChillTurns = 1; break;
        case "priest":      postHitHeal = -1; break;
        case "druid":       dmgMult = 1.4; postHitHeal = 6; break;
        case "deathknight": dmgMult = 1.35; lifestealMult = 2; break;
      }
    }
    const masteryMult = bestiaryMasteryMult(meta.journal.enemyKills[foe.enemy.id] ?? 0);
    let dmg = rollDamage(base * ab.effect.mult * dmgMult * masteryMult * aoeMult);
    const echoCrit = consumeFirstHitCrit();
    const critChance = player.crit + bonusCritPct + abilityBonusCrit(ab);
    const crit = echoCrit || (critChance > 0 && Math.random() * 100 < critChance);
    if (crit) dmg = Math.floor(dmg * 1.5);
    if (echoCrit) addLog("✦ Echo of Light — your first strike finds the mark!");
    if (foe.effects.some((x) => x.kind === "bleed")) {
      dmg = Math.floor(dmg * abilityBonusVsBleed(ab));
      if (talentPassives.vs_bleeding) dmg = Math.floor(dmg * (1 + talentPassives.vs_bleeding / 100));
    }
    if (foe.effects.some((x) => x.kind === "burn") && talentPassives.vs_burning) {
      dmg = Math.floor(dmg * (1 + talentPassives.vs_burning / 100));
    }
    if (foe.effects.some((x) => x.kind === "chill") && talentPassives.vs_chilled) {
      dmg = Math.floor(dmg * (1 + talentPassives.vs_chilled / 100));
    }
    if (talentPassives.low_hp_dmg && player.hp / player.maxHp <= 0.4) {
      dmg = Math.floor(dmg * (1 + talentPassives.low_hp_dmg / 100));
    }
    if (opts.consumeNextAttackMult !== false && player.nextAttackMult !== 1) {
      dmg = Math.floor(dmg * player.nextAttackMult);
      consumeMult();
    }
    const cMult = chillMult(foe.effects);
    if (cMult !== 1) dmg = Math.floor(dmg * cMult);
    if (ab.effect.bonusVsChill && foe.effects.some((x) => x.kind === "chill")) {
      dmg = Math.floor(dmg * ab.effect.bonusVsChill);
    }

    let guardPct = foe.guardPct;
    let parryActive = foe.parryActive;
    if (guardPct > 0 && !abilityIgnoresGuard(ab)) {
      const absorbed = Math.floor(dmg * guardPct);
      dmg = Math.max(1, dmg - absorbed);
      addLog(`${foe.enemy.name}'s guard absorbs ${absorbed} damage!`);
      guardPct = 0;
    } else if (guardPct > 0 && abilityIgnoresGuard(ab)) {
      addLog(`${foe.enemy.name}'s guard shatters under your blow!`);
      guardPct = 0;
    }
    if (parryActive) {
      const mitigated = Math.max(1, Math.floor(dmg * 0.25));
      const riposte = Math.max(2, Math.floor((foe.enemy.atkBase + e.depth * 0.3) * 0.65));
      addLog(`${foe.enemy.name} parries — only ${mitigated} gets through!`);
      const taken = damage(riposte);
      if (taken > 0) {
        addFloater("enemy", taken);
        addLog(`${foe.enemy.name} ripostes for ${taken}!`);
      }
      dmg = mitigated;
      parryActive = false;
    }

    addFloater("player", dmg, dmgSkin);
    const flavor = ab.effect.flavor.replace("{p}", player.name);
    const suffix = opts.logSuffix ?? (foeIndex === getFocusIndex(e) ? "" : ` (${foe.enemy.name})`);
    addLog(`${flavor}${suffix} for ${dmg}${crit ? " CRIT" : ""}${legendary ? " ✦" : ""} damage!`);

    const effectiveLifesteal = ((ab.effect.lifesteal ?? 0) + (talentPassives.lifesteal_boost ?? 0) / 100) * lifestealMult;
    if (effectiveLifesteal > 0) {
      const healed = Math.max(1, Math.floor(dmg * effectiveLifesteal));
      heal(healed);
      addFloater("heal", healed);
      addLog(`${player.name} drains ${healed} life.`);
    }
    if (postHitHeal === -1) {
      const healed = Math.max(1, Math.floor(dmg * 0.4));
      heal(healed); addFloater("heal", healed);
    } else if (postHitHeal > 0) {
      heal(postHitHeal); addFloater("heal", postHitHeal);
    }

    let nextEffects = foe.effects;
    if (ab.effect.applyStatus) {
      const s = ab.effect.applyStatus;
      let power = s.power;
      if (s.kind === "chill" && talentPassives.dot_amp_chill) power += talentPassives.dot_amp_chill * 0.1;
      const turns = s.kind === "chill" ? s.turns + extraChillTurns : s.turns;
      nextEffects = nextEffects.filter((x) => x.kind !== s.kind).concat({ kind: s.kind, turns, power });
      addLog(`${foe.enemy.name} is afflicted with ${s.kind}.`);
    }
    if (crit && talentPassives.crit_dot_bleed) {
      nextEffects = nextEffects.filter((x) => x.kind !== "bleed").concat({
        kind: "bleed", turns: 3, power: talentPassives.crit_dot_bleed,
      });
      addLog(`${foe.enemy.name} is torn by a critical rend!`);
    }
    if (crit && talentPassives.crit_dot_burn) {
      nextEffects = nextEffects.filter((x) => x.kind !== "burn").concat({
        kind: "burn", turns: 3, power: talentPassives.crit_dot_burn,
      });
      addLog(`${foe.enemy.name} ignites from the critical hit!`);
    }
    if (crit && talentPassives.crit_dot_chill) {
      nextEffects = nextEffects.filter((x) => x.kind !== "chill").concat({
        kind: "chill", turns: 2, power: 1.2 + (talentPassives.crit_dot_chill - 2) * 0.1,
      });
      addLog(`${foe.enemy.name} is chilled by the critical frost!`);
    }

    const nextEnc = updateFoeAt(e, foeIndex, {
      hp: Math.max(0, foe.hp - dmg),
      effects: nextEffects,
      guardPct,
      parryActive,
    });
    return { enc: nextEnc, totalDmg: dmg, anyCrit: crit };
  };

  const applyAttack = (e: CombatEnc, ab: Ability & { effect: Extract<Ability["effect"], { kind: "attack" }> }): CombatEnc => {
    triggerFx(ab.effect.useMag ? "spell" : "melee");
    setHit(true); setTimeout(() => setHit(false), 350);

    const targetIndices = ab.effect.targets === "all"
      ? livingFoeIndices(e)
      : [getFocusIndex(e)];

    let next = e;
    let totalDmg = 0;
    for (let i = 0; i < targetIndices.length; i++) {
      const idx = targetIndices[i];
      const res = strikeOneFoe(next, idx, ab, {
        consumeNextAttackMult: i === 0,
        logSuffix: ab.effect.targets === "all" && targetIndices.length > 1 ? ` (${next.foes[idx].enemy.name})` : "",
      });
      next = res.enc;
      totalDmg += res.totalDmg;
    }
    if (totalDmg > 0) gainResourceFromDamageDealt(totalDmg, { spenderAbility: spendsResource(ab) });
    return normalizeFocus(next);
  };

  const clearDeadFoes = (e: CombatEnc): CombatEnc => mapFoes(e, (f) => ({
    ...f,
    hp: 0,
    effects: [],
    guardPct: 0,
    parryActive: false,
    stunnedTurns: 0,
  }));

  const scheduleVictoryTransition = (e: CombatEnc, loot: Loot) => {
    const lead = primaryEnemy(e);
    const beat = { depth: e.depth, enemy: lead, enemyMaxHp: primaryFoe(e).maxHp, loot };
    victoryBeatRef.current = beat;
    setVictoryBeat(beat);
    if (victoryTimerRef.current !== null) clearTimeout(victoryTimerRef.current);
    victoryTimerRef.current = window.setTimeout(() => {
      victoryBeatRef.current = null;
      setVictoryBeat(null);
      setTurnPhase("idle");
      setEnc({ kind: "victory", depth: e.depth, loot });
      setRoomTransition("in");
      const inId = window.setTimeout(() => setRoomTransition("idle"), ROOM_FADE_IN_MS);
      roomTimersRef.current.push(inId);
      playSfx("loot");
      victoryTimerRef.current = null;
    }, VICTORY_BEAT_MS);
  };

  const beginEnemyPhase = (e: CombatEnc, usedAbilityId?: string, usedCooldown = 0) => {
    if (finishingKillRef.current || victoryBeatRef.current) return;
    clearTurnTimers();
    advanceAbilityCooldowns(usedAbilityId, usedCooldown);
    const stepped = tickPlayerEffects(e);
    if (allFoesDead(stepped)) {
      if (!finishingKillRef.current) finishKill(stepped);
      return;
    }
    setEnc(stepped);
    setArmedAbility(null);

    const intent = focusFoe(stepped).nextIntent;
    const kind = intent.kind ?? "attack";
    setTurnPhase("telegraph");
    if (intent.telegraphable || kind === "attack") {
      playSfx("ui-tap");
      vibrate(kind === "attack" ? 14 : 8);
    }

    const resolveId = window.setTimeout(() => {
      if (finishingKillRef.current || victoryBeatRef.current) return;
      setTurnPhase("resolving");
      if (kind === "attack") {
        setArenaFlash(true);
        const flashId = window.setTimeout(() => setArenaFlash(false), 350);
        turnTimersRef.current.push(flashId);
      }
      const after = enemyTurn(stepped);
      if (allFoesDead(after) || finishingKillRef.current) {
        if (allFoesDead(after) && !finishingKillRef.current) finishKill(after);
        return;
      }
      setEnc(after);
      const idleId = window.setTimeout(() => {
        if (finishingKillRef.current || victoryBeatRef.current) return;
        tickResourceRegenTurn();
        setTurnPhase("idle");
      }, kind === "attack" ? 420 : 280);
      turnTimersRef.current.push(idleId);
    }, TURN_TELEGRAPH_MS);
    turnTimersRef.current.push(resolveId);
  };

  const passTurn = () => {
    if (enc.kind !== "combat" || turnPhase !== "idle") return;
    if (victoryBeatRef.current || finishingKillRef.current || allFoesDead(enc)) return;
    addLog(`${player.name} holds, reading the foe's rhythm.`);
    if (talentPassives.pass_cd_tick) advanceAbilityCooldowns();
    beginEnemyPhase(enc);
  };

  const setCombatFocus = (index: number) => {
    if (enc.kind !== "combat" || turnPhase !== "idle") return;
    if (!enc.foes[index] || enc.foes[index].hp <= 0) return;
    setEnc({ ...enc, focusIndex: index });
  };

  const useAbility = (ab: Ability) => {
    if (enc.kind !== "combat" || turnPhase !== "idle") return;
    if (victoryBeatRef.current || finishingKillRef.current || allFoesDead(enc)) return;
    if ((player.abilityCooldowns?.[ab.id] ?? 0) > 0) return;
    const cost = abilityResourceCost(ab);
    if (cost > 0 && player.resource < cost) {
      addLog(`Not enough ${classResource?.label ?? "resource"}.`);
      return;
    }
    // Tap-to-confirm on mobile/touch: first tap arms; second confirms.
    if (armedAbility !== ab.id) {
      setArmedAbility(ab.id);
      setHoveredAbility(ab);
      return;
    }
    setArmedAbility(null);
    if (cost > 0 && !spendResource(cost)) {
      addLog(`Not enough ${classResource?.label ?? "resource"}.`);
      return;
    }
    const e = enc;
    const flavor = ab.effect.flavor.replace("{p}", player.name);

    switch (ab.effect.kind) {
      case "attack": {
        playSfx("hit");
        const after = applyAttack(e, ab as Ability & { effect: Extract<Ability["effect"], { kind: "attack" }> });
        setEnc(after);
        if (allFoesDead(after)) {
          advanceAbilityCooldowns(ab.id, ab.cooldown);
          finishKill(after);
          return;
        }
        beginEnemyPhase(after, ab.id, ab.cooldown);
        return;
      }
      case "heal": {
        const amt = ab.effect.magMult ? Math.max(4, Math.floor(player.mag * ab.effect.magMult)) : Math.max(4, ab.effect.amount || player.mag * 2);
        heal(amt);
        addFloater("heal", amt);
        addLog(`${flavor} — restored ${amt} HP.`);
        beginEnemyPhase(e, ab.id, ab.cooldown);
        return;
      }
      case "hot": {
        const power = ab.effect.healPerTurn > 0 ? ab.effect.healPerTurn : Math.max(2, Math.floor(player.mag * 0.8));
        addLog(`${flavor}.`);
        const fresh = e.playerEffects.filter((x) => x.kind !== "renew").concat({ kind: "renew", turns: ab.effect.turns, power });
        beginEnemyPhase({ ...e, playerEffects: fresh }, ab.id, ab.cooldown);
        return;
      }
      case "stun": {
        const stunAll = ab.effect.stunAll ?? false;
        const victims = stunAll ? livingFoeIndices(e) : [getFocusIndex(e)];
        const names = victims.map((i) => e.foes[i].enemy.name).join(", ");
        addLog(`${flavor}. ${stunAll ? `Foes freeze: ${names}` : `${focusFoe(e).enemy.name} is frozen`}!`);
        const stunHeal = stunBonusHealPct(ab);
        if (stunHeal > 0) {
          const healed = Math.max(1, Math.floor(player.maxHp * stunHeal));
          heal(healed);
          addFloater("heal", healed);
          addLog(`${player.name} focuses — restored ${healed} HP.`);
        }
        advanceAbilityCooldowns(ab.id, ab.cooldown);
        let stepped = mapFoes(e, (f, i) => (
          victims.includes(i) && f.hp > 0 ? { ...f, stunnedTurns: Math.max(f.stunnedTurns, 1) } : f
        ));
        stepped = tickPlayerEffects(stepped);
        stepped = tickEffectsOnFoes(stepped, addLog, dotAmp);
        if (allFoesDead(stepped)) { finishKill(stepped); return; }
        stepped = mapFoes(stepped, (f, i) => (
          victims.includes(i) && f.hp > 0 && f.stunnedTurns > 0
            ? { ...f, stunnedTurns: f.stunnedTurns - 1, nextIntent: pickNextIntent(f) }
            : f
        ));
        setEnc(normalizeFocus(stepped));
        return;
      }
      case "shield": {
        addLog(`${flavor}.`);
        if (ab.effect.healPct && ab.effect.healPct > 0) {
          const healed = Math.max(1, Math.floor(player.maxHp * ab.effect.healPct));
          heal(healed); addFloater("heal", healed);
          addLog(`${player.name} steels themselves — restored ${healed} HP.`);
        }
        beginEnemyPhase({ ...e, shieldReduce: ab.effect.reduce }, ab.id, ab.cooldown);
        return;
      }
      case "buff_next": {
        armNextAttack(ab.effect.mult);
        addLog(`${flavor}. Next attack will hit for ×${ab.effect.mult}.`);
        beginEnemyPhase(e, ab.id, ab.cooldown);
        return;
      }
      case "flee": {
        addLog(`${flavor}. You escape!`);
        setCombatLog([]);
        transitionToEnc({ kind: "path", depth: e.depth });
        return;
      }
    }
  };

  const onRacial = () => {
    if (enc.kind !== "combat" || !faction) return;
    if (player.racialUsed >= player.racialMax) return;
    useRacial();
    // Racial doesn't consume a turn — it's a free instant.
  };

  const addMaterial = useGame((s) => s.addMaterial);
  const learnRecipe = useGame((s) => s.learnRecipe);
  const addToBag = useGame((s) => s.addToBag);

  const retreatFromBoneWarden = () => {
    if (enc.kind !== "combat" || primaryEnemy(enc).id !== "bone_warden" || enc.depth !== 5 || player.eliteRetreatUsed) return;
    markEliteRetreat();
    restoreBetweenRooms();
    addLog("You fall back before the Warden's glaive finds bone. Live to descend again.");
    setCombatLog([]);
    transitionToEnc({ kind: "path", depth: 4 });
  };

  const finishKill = (e: CombatEnc) => {
    if (finishingKillRef.current) return;
    finishingKillRef.current = true;
    clearTurnTimers();
    setTurnPhase("resolving");
    setArmedAbility(null);
    // Lock the encounter immediately — loot rolling must not block death resolution.
    setEnc(clearDeadFoes(e));

    const goldMult = forkBias === "left" ? 1.25 : 1;
    const xpMult = forkBias === "right" ? 1.3 : 1;
    const gearChanceBonus = forkBias === "left" ? 0.1 : 0;
    const matChanceMult = forkBias === "right" ? 1.3 : 1;
    const packLootMult = e.isPack ? 1 + (e.foes.length - 1) * 0.18 : 1;
    const threatLoot = threatLootBonus(e.threatTier);
    const goldDrop = Math.round((4 + e.depth * 3) * goldMult * threatLoot.gold * packLootMult);
    const xpDrop = Math.round((6 + e.depth * 4) * xpMult * threatLoot.xp * packLootMult);
    let questItem: string | undefined;
    let material: string | undefined;
    let gear: GearItem | undefined;
    const lead = primaryEnemy(e);

    try {
      rewardGold(goldDrop);
      rewardXp(xpDrop);
      if (e.isPack) {
        addLog(`The pack falls. +${goldDrop}g +${xpDrop}xp`);
      } else {
        addLog(`${lead.name} falls. +${goldDrop}g +${xpDrop}xp`);
      }
      if (e.threatTier !== "none") {
        addLog(`✦ ${THREAT_TIERS[e.threatTier].label} foe — richer spoils.`);
      }
      vibrate([20, 40, 60]);
      playSfx("death");
      if (lead.questItemId && Math.random() < 0.6) { addQuestItem(lead.questItemId); questItem = lead.questItemId; }
      let matId = lead.materialDrop?.id;
      let matChance = (lead.materialDrop?.chance ?? 0) * matChanceMult;
      const zones = zoneContext(e.depth);
      if (zones.boneHalls && e.depth >= 6 && e.depth <= 10 && ["skeleton", "ghoul", "stone_golem", "ogre"].includes(lead.id)) {
        matId = "bone_dust";
        matChance = Math.max(matChance, 0.55);
      }
      if (matId && Math.random() < matChance) { addMaterial(matId); material = matId; }
      const isFinalBoss = e.depth >= maxDepthForMode(player.dungeonMode);
      const isBossEnemy = !!BOSS_MOMENTS[lead.id];
      const ownsLegendary =
        Object.values(player.equipment).some((g) => g?.rarity === "legendary") ||
        player.bag.some((g) => g.rarity === "legendary");
      if (isFinalBoss && player.classId && !ownsLegendary && Math.random() < 0.01) {
        const legend = rollClassLegendary(player.classId, e.depth);
        if (addToBag(legend)) { gear = legend; addLog(`✦ A legendary stirs in the wreckage — ${legend.name}!`); }
        else addLog("Bag full — a legendary was left behind!");
      } else {
        const source: "trash" | "chest" | "mini_boss" | "major_boss" | "final_boss" =
          isFinalBoss ? "final_boss"
          : isMajorBossFloor(e.depth, player.dungeonMode) ? "major_boss"
          : isMiniBossFloor(e.depth, player.dungeonMode) ? "mini_boss"
          : "trash";
        const gearChance = isFinalBoss ? 1 : Math.min(1, 0.35 + e.depth * 0.04 + gearChanceBonus + threatLoot.gear);
        if (Math.random() < gearChance) {
          const rolled = rollGear(e.depth, { source });
          if (addToBag(rolled)) gear = rolled;
          else addLog("Bag full — gear left behind.");
        }
      }
      const loreByEnemy: Record<string, string> = {
        cultist: "lore_seals", wraith: "lore_wraith", ogre: "lore_ogre", dragon: "lore_dragon", skeleton: "lore_brigade",
      };
      for (let fi = 0; fi < e.foes.length; fi++) {
        const f = e.foes[fi];
        const bossLore = BOSS_MOMENTS[f.enemy.id]?.firstKillLore;
        recordKill(f.enemy.id, {
          boss: !!BOSS_MOMENTS[f.enemy.id],
          loreId: bossLore ?? (Math.random() < 0.4 ? loreByEnemy[f.enemy.id] : undefined),
          itemDropId: fi === 0 ? gear?.baseId : undefined,
        });
      }
      if (talentPassives.kill_frenzy) {
        armNextAttack(1 + talentPassives.kill_frenzy / 100);
        addLog(`Blood sings — next attack empowered!`);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("[combat] finishKill loot error:", err);
    }

    const loot: Loot = { enemy: lead, gold: goldDrop, xp: xpDrop, questItem, material, gear, packBonus: e.isPack ? e.foes.length : undefined };
    scheduleVictoryTransition(e, loot);
  };

  // Safety net: if HP hit zero but victory never fired, force resolution.
  useEffect(() => {
    if (enc.kind !== "combat") return;
    if (!allFoesDead(enc) || finishingKillRef.current || victoryBeatRef.current) return;
    finishKill(enc);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only recover from HP hitting zero
  }, [enc.kind, enc.kind === "combat" ? totalEnemyHp(enc) : 0]);

  const closeVictory = () => {
    if (enc.kind !== "victory") return;
    if (enc.depth >= maxDepthForMode(player.dungeonMode)) { finishRun("victory"); return; }
    restoreBetweenRooms();
    transitionToEnc({ kind: "path", depth: enc.depth });
  };

  const openChest = () => {
    if (enc.kind !== "chest") return;
    const g = enc.preview.goldRange[0] + Math.floor(Math.random() * (enc.preview.goldRange[1] - enc.preview.goldRange[0] + 1));
    const x = enc.preview.xpRange[0] + Math.floor(Math.random() * (enc.preview.xpRange[1] - enc.preview.xpRange[0] + 1));
    rewardGold(g); rewardXp(x);
    addLog(`The chest yields ${g}g and ${x}xp.`);
    if (enc.preview.questItemId) { addQuestItem(enc.preview.questItemId); addLog(`Inside: a ${enc.preview.questItemId.replace("_"," ")}!`); }
    if (enc.preview.materialId)  { addMaterial(enc.preview.materialId);  addLog(`Inside: ${MATERIALS[enc.preview.materialId]?.name ?? enc.preview.materialId}.`); }
    if (enc.preview.recipeId) {
      learnRecipe(enc.preview.recipeId);
      const rec = RECIPES.find((r) => r.id === enc.preview!.recipeId);
      if (rec) addLog(`Inside: recipe — ${rec.name}!`);
    }
    transitionToEnc({ kind: "path", depth: enc.depth });
  };

  const inVictoryBeat = victoryBeat !== null;
  const ambient = depthAmbientStyle(enc.depth);
  const roomAnimClass = roomTransition === "out" ? "room-transition-out" : roomTransition === "in" ? "room-transition-in" : "";
  const combatLead = enc.kind === "combat" ? focusFoe(enc) : null;
  const combatIntent = combatLead?.nextIntent;

  // Always show the dungeon corridor as the background — enemy/chest sprites
  // overlay on top so the player can read where they are at a glance.
  const showEnemyOverlay = enc.kind === "combat" || enc.kind === "victory" || inVictoryBeat;
  const enemyOverlay = inVictoryBeat
    ? victoryBeat.enemy.image
    : enc.kind === "combat"
      ? focusFoe(enc).enemy.image
      : enc.kind === "victory"
        ? enc.loot.enemy.image
        : null;
  const showChestOverlay = enc.kind === "chest";

  // Equipped gear delta for inline equip
  const lootGear = enc.kind === "victory" ? enc.loot.gear : undefined;
  const equippedForSlot = lootGear ? player.equipment[lootGear.slot] : undefined;

  const dungeonReady = !showDescent;

  return (
    <div className="flex min-h-full flex-col">
      <div
        className={`relative h-64 overflow-hidden border-b-2 border-black ${hit ? "shake" : ""} ${dungeonReady ? roomAnimClass : "opacity-0"}`}
        aria-hidden={!dungeonReady}
      >
        <img
          src={dungeonBgForDepth(enc.depth)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-[filter] duration-700"
          style={{ filter: ambient.filter }}
        />
        <div className="absolute inset-0 pointer-events-none transition-colors duration-700" style={{ backgroundColor: ambient.overlay }} />
        {arenaFlash && enc.kind === "combat" && (
          <div className="fx-arena-flash absolute inset-0 z-[5] pointer-events-none" />
        )}
        {showEnemyOverlay && enemyOverlay && (
          <img
            key={(inVictoryBeat ? victoryBeat.enemy.id : enc.kind === "combat" ? focusFoe(enc).enemy.id : "v_" + enc.loot.enemy.id) + enc.depth}
            src={enemyOverlay}
            alt=""
            className={`absolute inset-0 m-auto h-[88%] w-auto max-w-[88%] object-contain fade-in-up drop-shadow-[0_8px_0_rgba(0,0,0,0.7)] ${enc.kind === "victory" || inVictoryBeat ? "grayscale opacity-60" : ""} ${hit && enc.kind === "combat" && !inVictoryBeat ? "fx-recoil" : ""} ${enc.kind === "combat" && turnPhase === "telegraph" && !inVictoryBeat ? "fx-enemy-windup" : ""}`}
          />
        )}
        {showChestOverlay && (
          <img src={chestImg} alt="" className="absolute inset-0 m-auto h-[80%] w-auto max-w-[80%] object-contain fade-in-up drop-shadow-[0_8px_0_rgba(0,0,0,0.7)]" />
        )}
        {attackFx && enc.kind === "combat" && (
          attackFx.kind === "melee"
            ? <div key={attackFx.key} className="fx-slash" />
            : <div key={attackFx.key} className="fx-cast" style={{ ["--fx-tint" as string]: attackFx.tint ?? "rgba(160,140,255,0.7)" } as CSSProperties} />
        )}
        <div className="absolute inset-0 vignette" />
        <div className="absolute inset-0 scanlines" />
        <div className="absolute left-2 top-2 pixel text-[8px] text-gold text-shadow-pixel bg-background/70 px-1.5 py-0.5 border border-black">
          Depth {enc.depth}/{maxDepthForMode(player.dungeonMode)}
          {isMajorBossFloor(enc.depth, player.dungeonMode) && enc.kind === "combat" && <span className="ml-1 text-blood">⚑ BOSS</span>}
          {isMiniBossFloor(enc.depth, player.dungeonMode) && enc.kind === "combat" && <span className="ml-1 text-ember">★ ELITE</span>}
        </div>
        <div className="absolute top-2 right-2 z-10"><SettingsButton /></div>
        {enc.kind === "combat" && !inVictoryBeat && (
          <div className="absolute right-2 top-9 flex flex-col items-end gap-0.5">
            {enc.isPack ? (
              <div className="pixel text-[8px] text-blood text-shadow-pixel bg-background/80 px-1.5 py-0.5 border border-black">
                Pack {livingFoeIndices(enc).length}/{enc.foes.length} · {totalEnemyHp(enc)}/{totalEnemyMaxHp(enc)} HP
              </div>
            ) : (
              <div className="pixel text-[8px] text-blood text-shadow-pixel bg-background/80 px-1.5 py-0.5 border border-black">
                {combatLead!.enemy.name} {combatLead!.hp}/{combatLead!.maxHp}
              </div>
            )}
            {enc.threatTier !== "none" && (
              <div className={`pixel text-[7px] text-shadow-pixel bg-background/90 px-1.5 py-0.5 border border-black ${
                enc.threatTier === "enraged" ? "text-blood" : enc.threatTier === "awakened" ? "text-ember" : "text-muted-foreground"
              }`}>
                ⚠ {THREAT_TIERS[enc.threatTier].label}
              </div>
            )}
          </div>
        )}
        {enc.kind === "combat" && !inVictoryBeat && combatIntent && (
          <div className="absolute left-2 right-2 bottom-2 flex justify-center">
            <div className={`pixel text-[10px] font-bold px-3 py-1.5 border-2 border-black text-shadow-pixel ${
              turnPhase === "telegraph"
                ? (combatIntent.kind === "guard" || combatIntent.kind === "parry")
                  ? "bg-allies text-white"
                  : combatIntent.kind === "heal"
                    ? "bg-divine text-black"
                    : "bg-blood text-white"
                : combatIntent.telegraphable
                  ? (combatIntent.kind === "guard" || combatIntent.kind === "parry")
                    ? "bg-allies text-white animate-pulse"
                    : combatIntent.kind === "heal"
                      ? "bg-divine text-black animate-pulse"
                      : "bg-blood text-white animate-pulse"
                  : "bg-background/95 text-gold"
            } ${telegraphBannerClass(combatIntent, turnPhase)}`}>
              {turnPhase === "telegraph" ? "▶ NOW — " : combatIntent.telegraphable ? "⚠ INCOMING — " : "» "}
              {intentKindLabel(combatIntent.kind) ? `${intentKindLabel(combatIntent.kind)} · ` : ""}
              {enc.isPack && livingFoeIndices(enc).length > 1 ? "Pack assault · " : ""}
              {combatLead!.enemy.name}: {combatIntent.label}
            </div>
          </div>
        )}
        {enc.kind === "combat" && turnPhase !== "idle" && !inVictoryBeat && (
          <div className="turn-busy-overlay z-[6]" />
        )}
        {inVictoryBeat && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
            <p className="pixel text-2xl text-gold text-shadow-pixel victory-beat-text">VICTORY</p>
          </div>
        )}
        {enc.kind === "shrine" && (
          <img src={shrineImg} alt="Shrine" className="absolute inset-0 m-auto h-[82%] w-auto max-w-[82%] object-contain fade-in-up drop-shadow-[0_8px_0_rgba(0,0,0,0.7)]" />
        )}
        {enc.kind === "trap" && (
          <img
            src={enc.trap === "spikes" ? trapSpikesImg : trapGasImg}
            alt={enc.trap === "spikes" ? "Spike trap" : "Gas trap"}
            className="absolute inset-0 m-auto h-[78%] w-auto max-w-[78%] object-contain fade-in-up drop-shadow-[0_8px_0_rgba(0,0,0,0.7)]"
          />
        )}
        <div className="absolute inset-0 pointer-events-none">
          {floaters.map((f) => <FloatingNumber key={f.id} num={f} onDone={removeFloater} />)}
        </div>
      </div>


      <div
        className={`p-3 space-y-3 ${dungeonReady ? roomAnimClass : "invisible pointer-events-none h-0 overflow-hidden opacity-0"}`}
        aria-hidden={!dungeonReady}
      >
        <div ref={logRef} className="border-2 border-black bg-card/80 p-2 h-24 overflow-y-auto font-body text-sm leading-tight">
          {combatLog.length === 0 && <p className="text-muted-foreground italic">The dungeon is silent.</p>}
          {combatLog.map((l, i) => (
            <TypingLogLine
              key={l.id}
              text={l.text}
              active={i === combatLog.length - 1}
              className={logLineClass(l.text)}
              charMs={42}
            />
          ))}
        </div>

        {enc.kind === "combat" && !inVictoryBeat && (
          <div className="border-2 border-black bg-card p-2 space-y-2">
            {enc.isPack && (
              <p className="pixel text-[8px] text-muted-foreground">Tap a foe to change focus · AoE hits everyone</p>
            )}
            {enc.foes.map((foe, i) => {
              if (foe.hp <= 0) return null;
              const focused = i === getFocusIndex(enc);
              return (
                <div
                  key={`${foe.enemy.id}-${i}`}
                  className={`rounded border p-1.5 ${focused ? "border-gold bg-gold/5" : "border-black/40"} ${enc.foes.length > 1 ? "cursor-pointer" : ""}`}
                  onClick={() => enc.foes.length > 1 && setCombatFocus(i)}
                  onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") setCombatFocus(i); }}
                  role={enc.foes.length > 1 ? "button" : undefined}
                  tabIndex={enc.foes.length > 1 ? 0 : undefined}
                >
                  <div className="flex items-baseline justify-between">
                    <span className={`pixel text-[9px] ${focused ? "text-gold" : "text-blood"}`}>
                      {foe.enemy.name}{focused ? " ◎" : ""}
                    </span>
                    <span className="font-body text-sm">{foe.hp}/{foe.maxHp}</span>
                  </div>
                  <TweenHpBar
                    current={foe.hp}
                    max={foe.maxHp}
                    className="mt-1 h-2 w-full bg-stone border border-black overflow-hidden"
                  />
                  {focused && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {enc.threatTier !== "none" && (
                        <span className={`pixel text-[7px] border px-1 ${
                          enc.threatTier === "enraged"
                            ? "border-blood text-blood animate-pulse"
                            : enc.threatTier === "awakened"
                              ? "border-ember text-ember"
                              : "border-muted-foreground text-ember"
                        }`}>
                          ⚠ {THREAT_TIERS[enc.threatTier].label}
                        </span>
                      )}
                      {turnEnrageLabel(enc.combatTurns) && (
                        <span className="pixel text-[7px] border border-blood text-blood px-1 animate-pulse">
                          ★ {turnEnrageLabel(enc.combatTurns)}
                        </span>
                      )}
                      {foe.guardPct > 0 && (
                        <span className="pixel text-[7px] text-allies border border-allies px-1">🛡 GUARDING</span>
                      )}
                      {foe.parryActive && (
                        <span className="pixel text-[7px] text-gold border border-gold px-1">⚔ PARRY READY</span>
                      )}
                      {foe.stunnedTurns > 0 && <span className="pixel text-[7px] text-arcane border border-arcane px-1">❄ FROZEN</span>}
                      {enc.shieldReduce > 0 && focused && (
                        <span className="pixel text-[7px] text-gold border border-gold px-1">⛨ BRACED</span>
                      )}
                      {foe.effects.map((ef) => (
                        <span key={ef.kind} className="pixel text-[7px] border border-blood text-blood px-1 uppercase">
                          {ef.kind === "burn" ? "🔥" : ef.kind === "bleed" ? "🩸" : ef.kind === "chill" ? "❄" : "✦"} {ef.kind} {ef.turns}t
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {enc.playerEffects.filter((e) => e.kind === "renew").map((ef) => (
              <span key={ef.kind} className="pixel text-[7px] border border-divine text-divine px-1 uppercase inline-block">✦ Renew {ef.turns}t</span>
            ))}
          </div>
        )}

        {enc.kind === "chest" && (
          <div className="border-2 border-black bg-card p-3 fade-in-up">
            <p className="pixel text-[10px] text-gold">{enc.preview.label}</p>
            <p className="font-body text-sm text-muted-foreground mt-1">
              Likely contains: <span className="text-gold">{enc.preview.goldRange[0]}–{enc.preview.goldRange[1]}g</span>,{" "}
              <span className="text-gold">{enc.preview.xpRange[0]}–{enc.preview.xpRange[1]}xp</span>
              {enc.preview.questItemId && <>, and possibly <span className="text-divine">a {enc.preview.questItemId.replace("_"," ")}</span></>}.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="pixel-btn pixel-btn-gold !text-[8px]" onClick={openChest}>Open</button>
              <button className="pixel-btn !text-[8px]" onClick={() => transitionToEnc({ kind: "path", depth: enc.depth })}>Leave</button>
            </div>
          </div>
        )}

        {enc.kind === "victory" && !inVictoryBeat && (
          <div className="border-2 border-black bg-card p-3 fade-in-up space-y-2">
            <p className="pixel text-[10px] text-gold">☠ {enc.loot.enemy.name} slain</p>
            <p className="font-body text-sm">+<span className="text-gold">{enc.loot.gold}g</span> · +<span className="text-divine">{enc.loot.xp}xp</span></p>
            {enc.loot.questItem && <p className="font-body text-sm">› Quest item: <span className="text-divine">{enc.loot.questItem.replace("_", " ")}</span></p>}
            {enc.loot.material && <p className="font-body text-sm">› Material: <span className="text-allies">{MATERIALS[enc.loot.material]?.name ?? enc.loot.material}</span></p>}
            {lootGear && (
              <div className={`border-2 border-black p-2 rarity-frame-${lootGear.rarity} space-y-1`}>
                <p className={`pixel text-[9px] ${RARITY_CLASS[lootGear.rarity]}`}>★ {lootGear.name}</p>
                <p className="font-body text-xs text-muted-foreground">{RARITY_LABEL[lootGear.rarity]} · iLvl {lootGear.ilvl}</p>
                <p className="font-body text-sm">{formatGearStatsLine(lootGear) || "—"}</p>
                {lootGear.legendaryDesc && (
                  <p className="pixel text-[8px] text-rarity-legendary border-l-2 border-rarity-legendary pl-2">
                    ✦ {lootGear.legendaryDesc}
                  </p>
                )}
                <GearCompare item={lootGear} equipped={equippedForSlot} />
                {equippedFlash === lootGear.id ? (
                  <p className="pixel text-[8px] text-divine text-center border-2 border-divine py-1">✓ EQUIPPED{equippedForSlot ? ` — replaced ${equippedForSlot.name}` : ""}</p>
                ) : (
                  <div className="pt-1">
                    <button onClick={() => { playSfx("loot"); equip(lootGear.id); setEquippedFlash(lootGear.id); }} className="pixel-btn pixel-btn-gold !text-[8px] w-full">Equip</button>
                  </div>
                )}
              </div>
            )}
            {!enc.loot.questItem && !enc.loot.material && !enc.loot.gear && (
              <p className="font-body text-sm text-muted-foreground">No drops this time.</p>
            )}
            <button onClick={closeVictory} className="pixel-btn pixel-btn-gold !text-[8px] w-full text-center">
              {enc.depth >= maxDepthForMode(player.dungeonMode)
                ? (player.dungeonMode === "ascension" ? "Ascend Complete →" : "Claim the Crown →")
                : lootGear ? "Move on ▸" : "Continue ▸"}
            </button>
          </div>
        )}

        {enc.kind === "shrine" && (() => {
          const factionShrine = enc.shrine === "bulwark" || enc.shrine === "bloodlust"
            ? FACTION_SHRINES.find((s) => s.id === enc.shrine)
            : undefined;
          return (
            <div className="border-2 border-divine bg-card p-3 fade-in-up">
              <p className="pixel text-[10px] text-divine">
                {factionShrine ? `✦ ${factionShrine.name}` : "✦ A forgotten shrine"}
              </p>
              <p className="font-body text-sm text-muted-foreground mt-1">
                {factionShrine
                  ? factionShrine.desc
                  : enc.shrine === "heal"
                    ? "Cool water trickles from the stone. Drink and be mended."
                    : "Embers swirl above the altar — kneel and be quickened."}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="pixel-btn pixel-btn-gold !text-[8px]" onClick={() => {
                  if (factionShrine) {
                    applyDungeonBuff(factionShrine.buff);
                    addLog(`You kneel at the shrine — ${factionShrine.name} answers.`);
                    playSfx("ui-confirm");
                  } else if (enc.shrine === "heal") {
                    const amt = Math.max(10, Math.floor(player.maxHp * 0.5));
                    heal(amt); addFloater("heal", amt); addLog(`The shrine restores ${amt} HP.`); playSfx("ui-confirm");
                    if (classResource?.kind === "mana") {
                      const manaAmt = Math.max(8, Math.floor(player.maxResource * 0.35));
                      gainResource(manaAmt);
                      addLog(`Cool water steadies your mind. +${manaAmt} ${classResource.label}.`);
                    }
                  } else {
                    rewardXp(20 + enc.depth * 6); addLog("The shrine fills you with insight."); playSfx("ui-confirm");
                  }
                  transitionToEnc({ kind: "path", depth: enc.depth });
                }}>Pray</button>
                <button className="pixel-btn !text-[8px]" onClick={() => transitionToEnc({ kind: "path", depth: enc.depth })}>Move on</button>
              </div>
            </div>
          );
        })()}

        {enc.kind === "trap" && (
          <div className="border-2 border-blood bg-card p-3 fade-in-up">
            <p className="pixel text-[10px] text-blood">⚠ {enc.trap === "spikes" ? "Spiked floor plates" : "Hissing gas vents"}</p>
            <p className="font-body text-sm text-muted-foreground mt-1">
              {enc.sprung
                ? "The corridor is quiet again."
                : enc.trap === "spikes"
                  ? "Iron spikes choke the passage. You can push through and take the wounds, or turn back to find another way."
                  : "Toxic gas pools ahead. Push through and take the burn, or turn back to find another way."}
            </p>
            {!enc.sprung && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="pixel-btn !text-[8px]" onClick={() => {
                  const trapMult = forkBias === "left" ? 0.5 : forkBias === "right" ? 1.8 : 1;
                  const oathMult = player.activeOaths?.includes("greedy") ? 1.5 : 1;
                  const dmg = Math.max(3, Math.floor(player.maxHp * (enc.trap === "spikes" ? 0.18 : 0.12) * trapMult * oathMult));
                  const taken = damage(dmg);
                  addFloater("enemy", taken);
                  setHit(true); setTimeout(() => setHit(false), 350);
                  addLog(`The ${enc.trap === "spikes" ? "spikes bite" : "gas burns"} for ${taken}.`);
                  playSfx("hit");
                  setEnc({ ...enc, sprung: true });
                }}>Push through (take damage)</button>
                <button className="pixel-btn !text-[8px]" onClick={() => {
                  const back = Math.max(1, enc.depth - 3);
                  addLog(`You turn back. Retreated to floor ${back}.`);
                  restoreBetweenRooms();
                  transitionToEnc({ kind: "path", depth: back });
                }}>↩ Turn back (−3 floors)</button>
              </div>
            )}
            {enc.sprung && (
              <button className="pixel-btn pixel-btn-gold !text-[8px] w-full mt-3" onClick={() => transitionToEnc({ kind: "path", depth: enc.depth })}>Press on ▸</button>
            )}
          </div>
        )}

        {enc.kind === "path" && (
          <div className="border-2 border-black bg-card p-3 fade-in-up space-y-2">
            <div>
              <p className="pixel text-[10px] text-gold">▣ The corridor forks</p>
              <p className="font-body text-sm text-muted-foreground mt-0.5">Each path bends the next room. Pick how you'd like to bleed.</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => advance("left")}
                className="pixel-btn w-full !p-3 flex items-center gap-3 border-l-4 border-l-blood text-left"
              >
                <span className="pixel text-[14px] text-blood w-6 text-center">◀</span>
                <span className="flex-1">
                  <span className="block pixel text-[9px] text-foreground">Left Passage</span>
                  <span className="block font-body text-xs text-muted-foreground mt-0.5">More combat. Fewer traps. +25% gold drops.</span>
                </span>
              </button>
              <button
                onClick={() => advance("onward")}
                className="pixel-btn w-full !p-3 flex items-center gap-3 border-l-4 border-l-muted text-left"
              >
                <span className="pixel text-[14px] text-muted-foreground w-6 text-center">▲</span>
                <span className="flex-1">
                  <span className="block pixel text-[9px] text-foreground">Onward</span>
                  <span className="block font-body text-xs text-muted-foreground mt-0.5">Balanced corridor. No bias either way.</span>
                </span>
              </button>
              <button
                onClick={() => advance("right")}
                className="pixel-btn w-full !p-3 flex items-center gap-3 border-l-4 border-l-ember text-left"
              >
                <span className="pixel text-[14px] text-ember w-6 text-center">▶</span>
                <span className="flex-1">
                  <span className="block pixel text-[9px] text-foreground">Right Passage</span>
                  <span className="block font-body text-xs text-muted-foreground mt-0.5">More traps. Fewer fights. +30% XP &amp; materials.</span>
                </span>
              </button>
            </div>
          </div>
        )}


        {enc.kind === "combat" && !inVictoryBeat && (
          <div className="space-y-2">
            {player.maxResource > 0 && (
              <ResourceBar
                classId={player.classId}
                current={player.resource}
                max={player.maxResource}
                size="combat"
              />
            )}
            <div className={`grid gap-2 ${abilities.length >= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
              {abilities.map((ab) => {
                const cd = player.abilityCooldowns?.[ab.id] ?? 0;
                const cost = abilityResourceCost(ab);
                const lacksResource = cost > 0 && player.resource < cost;
                const armed = armedAbility === ab.id;
                const pulsing = readyPulse.has(ab.id) && cd === 0;
                const costLabel = resourceCostLabel(ab, classResource, costReduction);
                return (
                  <button
                    key={ab.id}
                    onClick={() => useAbility(ab)}
                    onMouseEnter={() => setHoveredAbility(ab)}
                    onFocus={() => setHoveredAbility(ab)}
                    disabled={cd > 0 || turnPhase !== "idle" || lacksResource}
                    className={`pixel-btn !text-[8px] !p-2 disabled:opacity-40 ${weaponGlow ? "weapon-glow-btn" : ""} ${pulsing ? "cd-ready-pulse" : ""} ${armed ? "pixel-btn-gold ring-2 ring-gold" : ab.id === abilities[0].id ? "pixel-btn-primary" : ""}`}
                    style={weaponGlow ? ({ ["--weapon-glow" as string]: weaponGlow } as CSSProperties) : undefined}
                  >
                    {ab.name}
                    {costLabel && cd === 0 && (
                      <span className="block pixel text-[7px] mt-0.5 text-muted-foreground">{costLabel}</span>
                    )}
                    {cd > 0 && <span className="block pixel text-[7px] mt-1 text-muted-foreground">CD {cd}</span>}
                    {armed && cd === 0 && <span className="block pixel text-[7px] mt-1 text-divine">TAP TO CONFIRM</span>}
                  </button>
                );
              })}
            </div>
            {(hoveredAbility ?? abilities[0]) && (() => {
              const ab = hoveredAbility ?? abilities[0];
              let rangeStr = "";
              if (ab.effect.kind === "attack") {
                const base = ab.effect.useMag ? player.mag : player.atk;
                const [lo, hi] = damageRange(base * ab.effect.mult);
                rangeStr = ` — ${lo}–${hi} dmg`;
              }
              return (
                <div className={`border-2 px-2 py-1.5 ${armedAbility ? "border-gold bg-card" : "border-black bg-popover"}`}>
                  <p className="pixel text-[8px] text-gold">{armedAbility ? "▶ " : ""}{ab.name}{rangeStr}</p>
                  <p className="font-body text-sm text-muted-foreground leading-tight">{ab.desc}</p>
                  {armedAbility && <p className="pixel text-[7px] text-divine mt-1">Tap the same ability again to use it.</p>}
                </div>
              );
            })()}
            {faction && (
              <button
                onClick={onRacial}
                disabled={player.racialUsed >= player.racialMax}
                className="pixel-btn !text-[8px] w-full disabled:opacity-40"
                style={{ borderColor: faction.color }}
              >
                {player.racialUsed >= player.racialMax
                  ? `✦ ${faction.racial.name} — used`
                  : `✦ ${faction.racial.name} (${player.racialMax - player.racialUsed} left) — ${faction.racial.desc}`}
              </button>
            )}
            {player.nextAttackMult !== 1 && (
              <p className="pixel text-[8px] text-blood text-center">FRENZY — next hit ×{player.nextAttackMult}</p>
            )}
            {primaryEnemy(enc).id === "bone_warden" && enc.depth === 5 && !player.eliteRetreatUsed && (
              <button
                onClick={retreatFromBoneWarden}
                className="pixel-btn !text-[8px] w-full border-l-4 border-l-muted-foreground"
              >
                ↩ Fall Back to Floor 4 — flee this elite (once per run)
              </button>
            )}
            <button
              onClick={passTurn}
              disabled={turnPhase !== "idle" || inVictoryBeat || (enc.kind === "combat" && allFoesDead(enc))}
              className="pixel-btn !text-[8px] w-full border-l-4 border-l-muted-foreground disabled:opacity-40"
            >
              {turnPhase === "telegraph" ? "▶ Enemy winding up…" : turnPhase === "resolving" ? "▶ Resolving…" : "◌ Pass — hold your turn (CDs tick)"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {inv.includes("p1") && <button onClick={() => use("p1")} className="pixel-btn !text-[8px]">Lesser Potion ({inv.filter(x=>x==="p1").length})</button>}
          {inv.includes("p2") && <button onClick={() => use("p2")} className="pixel-btn !text-[8px]">Greater Potion ({inv.filter(x=>x==="p2").length})</button>}
          {inv.includes("phoenix") && <span className="pixel-btn !text-[8px] text-center text-divine">✦ Phoenix Feather armed ({inv.filter(x=>x==="phoenix").length})</span>}
          {inv.includes("hearth") && <button onClick={useHearth} className="pixel-btn pixel-btn-gold !text-[8px]">⌂ Hearthstone — bail out</button>}
        </div>

        {enc.kind === "combat" && !inVictoryBeat ? (
          <p className="pixel text-[7px] text-blood text-center opacity-80 mt-1">
            ⚠ Locked in combat — use a Hearthstone Charm to bail out.
          </p>
        ) : enc.kind !== "combat" ? (
          <button onClick={exitDungeon} className="pixel-btn !text-[8px] w-full text-center">⌂ Retreat to City</button>
        ) : null}
      </div>

      <TutorialTip
        id="dungeon-combat"
        title="Into the Dark"
        body="Tap an ability to arm it, then confirm. Pass to wait — ability cooldowns tick and carry between rooms. Foes guard, parry, and heal; read their telegraphs (⚠)."
        position="top"
      />

      {showDescent && (
        <DungeonDescentOverlay
          faction={player.faction}
          classId={player.classId}
          name={player.name}
          mode={player.dungeonMode}
          depth={player.dungeonDepth}
          oaths={player.activeOaths ?? []}
          onComplete={onDescentComplete}
        />
      )}

      {bossIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 boss-intro-enter">
          <div className="w-full max-w-md border-2 border-gold bg-background p-4 space-y-3 boss-intro-enter">
            <p className="pixel text-[10px] text-blood">⚑ MAJOR BOSS</p>
            <p className="font-body text-base italic leading-snug">"{bossIntro.intro}"</p>
            <button
              onClick={() => setBossIntro(null)}
              className="pixel-btn pixel-btn-danger w-full !text-[10px]"
            >Face it</button>
          </div>
        </div>
      )}
    </div>
  );
}

// VictoryScreen / DefeatScreen were removed — the run summary screen handles
// both outcomes now.


