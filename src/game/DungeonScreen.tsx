import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useGame } from "@/game/store";
import { FloatingNumber, nextFloatingId, type FloatingNum } from "./FloatingNumber";
import {
  CLASS_ABILITIES, SPEC_ABILITIES, CLASSES, COSMETICS, FACTIONS, enemyForDepth, rollChest, rollGear, MATERIALS, RECIPES,
  RARITY_CLASS, RARITY_LABEL, gearScore, rollDamage, damageRange,
  MAX_DEPTH, MAJOR_BOSS_FLOORS, MINI_BOSS_FLOORS, dungeonBgForDepth, rollClassLegendary, AFFIXES,
  type Ability, type EnemyDef, type ChestPreview, type GearItem,
  type StatusEffect, type EnemyIntent, type FactionId,
} from "@/game/data";
import { playMusic, playSfx } from "@/game/audio";
import { TutorialTip } from "@/game/Tutorial";
import { SettingsButton } from "@/game/Settings";
import chestImg from "@/assets/dungeon-chest.jpg";
import shrineImg from "@/assets/dungeon-shrine.png";
import trapSpikesImg from "@/assets/trap-spikes.png";
import trapGasImg from "@/assets/trap-gas.png";

const vibrate = (ms: number | number[]) => { try { (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate?.(ms); } catch { /* noop */ } };

interface Loot {
  enemy: EnemyDef;
  gold: number;
  xp: number;
  questItem?: string;
  material?: string;
  recipe?: string;
  gear?: GearItem;
}

type CombatEnc = {
  kind: "combat"; depth: number;
  enemy: EnemyDef;
  enemyHp: number; enemyMaxHp: number;
  stunnedTurns: number; shieldReduce: number;
  cooldowns: Record<string, number>;
  enemyEffects: StatusEffect[];
  playerEffects: StatusEffect[];
  nextIntent: EnemyIntent;
};

type ShrineKind = "heal" | "blessing";
type TrapKind = "spikes" | "gas";

type Encounter =
  | { kind: "path"; depth: number }
  | { kind: "victory"; depth: number; loot: Loot }
  | { kind: "chest"; depth: number; preview: ChestPreview }
  | { kind: "shrine"; depth: number; shrine: ShrineKind }
  | { kind: "trap"; depth: number; trap: TrapKind; sprung: boolean }
  | CombatEnc;

function pickIntent(enemy: EnemyDef): EnemyIntent {
  const teleg = enemy.intents.filter((i) => i.telegraphable);
  const normal = enemy.intents.filter((i) => !i.telegraphable);
  if (teleg.length && Math.random() < 0.35) return teleg[Math.floor(Math.random() * teleg.length)];
  const pool = normal.length ? normal : enemy.intents;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildCombat(depth: number, faction?: FactionId | null, affixes: string[] = []): CombatEnc {
  const e = enemyForDepth(depth, faction);
  let hp = e.hpBase + (depth >= 10 ? 0 : Math.floor(depth * 1.4));
  if (affixes.includes("fortified")) hp = Math.floor(hp * 1.3);
  return {
    kind: "combat", depth, enemy: e, enemyHp: hp, enemyMaxHp: hp,
    stunnedTurns: 0, shieldReduce: 0, cooldowns: {},
    enemyEffects: [], playerEffects: [],
    nextIntent: pickIntent(e),
  };
}

function rollEncounter(depth: number, faction?: FactionId | null, affixes: string[] = []): Encounter {
  // Boss floors are always forced combat.
  if (MAJOR_BOSS_FLOORS.has(depth) || MINI_BOSS_FLOORS.has(depth)) return buildCombat(depth, faction, affixes);
  const r = Math.random();
  if (r < 0.58) return buildCombat(depth, faction, affixes);
  if (r < 0.78) return { kind: "chest", depth, preview: rollChest(depth) };
  if (r < 0.82) return { kind: "shrine", depth, shrine: Math.random() < 0.6 ? "heal" : "blessing" };
  if (r < 0.94) return { kind: "trap", depth, trap: Math.random() < 0.5 ? "spikes" : "gas", sprung: false };
  return { kind: "path", depth };
}

function chillMult(effects: StatusEffect[]) {
  const c = effects.find((e) => e.kind === "chill");
  return c ? c.power : 1;
}

function tickEffectsOnEnemy(e: CombatEnc, log: (m: string) => void): CombatEnc {
  let hp = e.enemyHp;
  const next: StatusEffect[] = [];
  for (const ef of e.enemyEffects) {
    if (ef.kind === "bleed") {
      hp = Math.max(0, hp - ef.power);
      log(`${e.enemy.name} bleeds for ${ef.power}.`);
    } else if (ef.kind === "burn") {
      hp = Math.max(0, hp - ef.power);
      log(`${e.enemy.name} burns for ${ef.power}.`);
    }
    if (ef.turns - 1 > 0) next.push({ ...ef, turns: ef.turns - 1 });
  }
  return { ...e, enemyHp: hp, enemyEffects: next };
}

export function DungeonScreen() {
  const player = useGame((s) => s.player);
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
  const useRacial = useGame((s) => s.useRacial);
  const consumeMult = useGame((s) => s.consumeNextAttackMult);
  const equip = useGame((s) => s.equip);

  const armNextAttack = useGame((s) => s.armNextAttack);
  const baseAbilities = player.classId ? CLASS_ABILITIES[player.classId] : [];
  const specAbility = player.specId ? SPEC_ABILITIES[player.specId] : null;
  const abilities: Ability[] = specAbility ? [...baseAbilities, specAbility] : baseAbilities;
  const inv = player.inventory;
  const faction = player.faction ? FACTIONS.find((f) => f.id === player.faction)! : null;

  const eq = player.equippedCosmetics ?? {};
  const weaponGlow = eq.weaponGlow ? COSMETICS.find((c) => c.id === eq.weaponGlow)?.tint : undefined;
  const dmgSkin    = eq.damageSkin ? COSMETICS.find((c) => c.id === eq.damageSkin)?.tint : undefined;

  const [enc, setEnc] = useState<Encounter>(() => ({ kind: "path", depth: 1 }));

  // Music: swap to boss track when fighting a boss, dungeon ambient otherwise.
  useEffect(() => {
    const isBoss = enc.kind === "combat" && (MAJOR_BOSS_FLOORS.has(enc.depth) || MINI_BOSS_FLOORS.has(enc.depth));
    playMusic(isBoss ? "boss" : "dungeon");
  }, [enc.kind, enc.kind === "combat" ? enc.enemy.id : null]);
  const playerFaction = player.faction;
  const [hit, setHit] = useState(false);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [hoveredAbility, setHoveredAbility] = useState<Ability | null>(null);
  const [armedAbility, setArmedAbility] = useState<string | null>(null);
  const [equippedFlash, setEquippedFlash] = useState<string | null>(null);
  const [floaters, setFloaters] = useState<FloatingNum[]>([]);
  const [attackFx, setAttackFx] = useState<{ kind: "melee" | "spell"; key: number; tint?: string } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

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
    setCombatLog((l) => [...l.slice(-20), msg]);
    pushLog(msg);
  };

  const finishRun = useGame((s) => s.finishRun);
  const recordKill = useGame((s) => s.recordKill);
  const useHearth = useGame((s) => s.useHearthstone);

  useEffect(() => {
    if (player.hp <= 0) finishRun("defeat");
  }, [player.hp, finishRun]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [combatLog]);

  const advance = () => {
    const newDepth = enc.depth + 1;
    if (newDepth > MAX_DEPTH) { finishRun("victory"); return; }
    restoreBetweenRooms();
    const next = rollEncounter(newDepth, playerFaction);
    setEnc(next);
    if (next.kind === "combat") addLog(`A ${next.enemy.name} blocks your path!`);
    else if (next.kind === "chest") addLog(`You spot ${next.preview.label}.`);
    else addLog("The corridor opens further.");
  };

  const tickCooldowns = (e: CombatEnc) => {
    const cds: Record<string, number> = {};
    for (const [k, v] of Object.entries(e.cooldowns)) if (v > 1) cds[k] = v - 1;
    return cds;
  };

  // Apply Renew (player HoT) — called at end of every player action turn
  const tickPlayerEffects = (e: CombatEnc): CombatEnc => {
    const next: StatusEffect[] = [];
    for (const ef of e.playerEffects) {
      if (ef.kind === "renew") {
        heal(ef.power);
        addFloater("heal", ef.power);
        addLog(`Renew restores ${ef.power} HP.`);
      }
      if (ef.turns - 1 > 0) next.push({ ...ef, turns: ef.turns - 1 });
    }
    return { ...e, playerEffects: next };
  };

  const enemyTurn = (eIn: CombatEnc): CombatEnc => {
    let e = eIn;
    // Tick enemy DoTs first; check for kill
    e = tickEffectsOnEnemy(e, addLog);
    if (e.enemyHp <= 0) {
      // Schedule kill in a microtask via finishKill replacement
      setTimeout(() => finishKill(e), 0);
      return e;
    }
    if (e.stunnedTurns > 0) {
      addLog(`${e.enemy.name} is frozen and cannot act.`);
      // re-telegraph for next round
      return { ...e, stunnedTurns: e.stunnedTurns - 1, shieldReduce: 0, nextIntent: pickIntent(e.enemy) };
    }
    const intent = e.nextIntent;
    const baseDmg = (e.enemy.atkBase + e.depth * 0.6) * intent.mult;
    let dmg = rollDamage(baseDmg);
    if (e.shieldReduce > 0) dmg = Math.max(1, Math.floor(dmg * (1 - e.shieldReduce)));
    const taken = damage(dmg);
    if (taken > 0) {
      addFloater("enemy", taken);
      setHit(true); setTimeout(() => setHit(false), 350);
    }
    addLog(intent.line.replace("{n}", e.enemy.name).replace("{d}", String(taken)) + (e.shieldReduce > 0 ? " (shielded!)" : ""));
    return { ...e, shieldReduce: 0, nextIntent: pickIntent(e.enemy) };
  };

  const applyAttack = (e: CombatEnc, ab: Ability & { effect: Extract<Ability["effect"], { kind: "attack" }> }): CombatEnc => {
    const base = ab.effect.useMag ? player.mag : player.atk;
    // Roll damage in a ±20% range so hits feel less robotic.
    let dmg = rollDamage(base * ab.effect.mult);
    // Crit
    const crit = player.crit > 0 && Math.random() * 100 < player.crit;
    if (crit) dmg = Math.floor(dmg * 1.5);
    // Frenzy / Rally next-attack multiplier
    if (player.nextAttackMult !== 1) {
      dmg = Math.floor(dmg * player.nextAttackMult);
      consumeMult();
    }
    // Chill on enemy increases damage taken
    const cMult = chillMult(e.enemyEffects);
    if (cMult !== 1) dmg = Math.floor(dmg * cMult);
    // Bonus damage vs chilled targets (e.g. Ice Lance)
    if (ab.effect.bonusVsChill && e.enemyEffects.some((x) => x.kind === "chill")) {
      dmg = Math.floor(dmg * ab.effect.bonusVsChill);
    }

    // Trigger combat animation
    triggerFx(ab.effect.useMag ? "spell" : "melee");
    setHit(true); setTimeout(() => setHit(false), 350);

    addFloater("player", dmg, dmgSkin);
    const flavor = ab.effect.flavor.replace("{p}", player.name);
    addLog(`${flavor} for ${dmg}${crit ? " CRIT" : ""} damage!`);

    // Lifesteal
    if (ab.effect.lifesteal && ab.effect.lifesteal > 0) {
      const healed = Math.max(1, Math.floor(dmg * ab.effect.lifesteal));
      heal(healed);
      addFloater("heal", healed);
      addLog(`${player.name} drains ${healed} life.`);
    }

    let nextEffects = e.enemyEffects;
    if (ab.effect.applyStatus) {
      const s = ab.effect.applyStatus;
      // refresh or add
      nextEffects = nextEffects.filter((x) => x.kind !== s.kind).concat({ kind: s.kind, turns: s.turns, power: s.power });
      addLog(`${e.enemy.name} is afflicted with ${s.kind}.`);
    }
    return { ...e, enemyHp: e.enemyHp - dmg, enemyEffects: nextEffects };
  };

  const useAbility = (ab: Ability) => {
    if (enc.kind !== "combat") return;
    if ((enc.cooldowns[ab.id] ?? 0) > 0) return;
    // Tap-to-confirm on mobile/touch: first tap arms; second confirms.
    if (armedAbility !== ab.id) {
      setArmedAbility(ab.id);
      setHoveredAbility(ab);
      return;
    }
    setArmedAbility(null);
    const e = enc;
    const flavor = ab.effect.flavor.replace("{p}", player.name);

    switch (ab.effect.kind) {
      case "attack": {
        playSfx("hit");
        const after = applyAttack(e, ab as Ability & { effect: Extract<Ability["effect"], { kind: "attack" }> });
        if (after.enemyHp <= 0) { finishKill(after); return; }
        const cds = tickCooldowns(after); cds[ab.id] = ab.cooldown;
        let stepped: CombatEnc = { ...after, cooldowns: cds };
        stepped = tickPlayerEffects(stepped);
        setEnc(enemyTurn(stepped));
        return;
      }
      case "heal": {
        const amt = ab.effect.magMult ? Math.max(4, Math.floor(player.mag * ab.effect.magMult)) : Math.max(4, ab.effect.amount || player.mag * 2);
        heal(amt);
        addFloater("heal", amt);
        addLog(`${flavor} — restored ${amt} HP.`);
        const cds = tickCooldowns(e); cds[ab.id] = ab.cooldown;
        let stepped: CombatEnc = { ...e, cooldowns: cds };
        stepped = tickPlayerEffects(stepped);
        setEnc(enemyTurn(stepped));
        return;
      }
      case "hot": {
        const power = ab.effect.healPerTurn > 0 ? ab.effect.healPerTurn : Math.max(2, Math.floor(player.mag * 0.8));
        addLog(`${flavor}.`);
        const cds = tickCooldowns(e); cds[ab.id] = ab.cooldown;
        const fresh = e.playerEffects.filter((x) => x.kind !== "renew").concat({ kind: "renew", turns: ab.effect.turns, power });
        let stepped: CombatEnc = { ...e, cooldowns: cds, playerEffects: fresh };
        stepped = tickPlayerEffects(stepped);
        setEnc(enemyTurn(stepped));
        return;
      }
      case "stun": {
        addLog(`${flavor}. ${e.enemy.name} is frozen!`);
        const cds = tickCooldowns(e); cds[ab.id] = ab.cooldown;
        let stepped: CombatEnc = { ...e, cooldowns: cds, stunnedTurns: 1 };
        stepped = tickPlayerEffects(stepped);
        stepped = tickEffectsOnEnemy(stepped, addLog);
        if (stepped.enemyHp <= 0) { finishKill(stepped); return; }
        setEnc({ ...stepped, stunnedTurns: stepped.stunnedTurns - 1, nextIntent: pickIntent(stepped.enemy) });
        return;
      }
      case "shield": {
        addLog(`${flavor}.`);
        if (ab.effect.healPct && ab.effect.healPct > 0) {
          const healed = Math.max(1, Math.floor(player.maxHp * ab.effect.healPct));
          heal(healed); addFloater("heal", healed);
          addLog(`${player.name} steels themselves — restored ${healed} HP.`);
        }
        const cds = tickCooldowns(e); cds[ab.id] = ab.cooldown;
        let stepped: CombatEnc = { ...e, shieldReduce: ab.effect.reduce, cooldowns: cds };
        stepped = tickPlayerEffects(stepped);
        setEnc(enemyTurn(stepped));
        return;
      }
      case "buff_next": {
        armNextAttack(ab.effect.mult);
        addLog(`${flavor}. Next attack will hit for ×${ab.effect.mult}.`);
        const cds = tickCooldowns(e); cds[ab.id] = ab.cooldown;
        let stepped: CombatEnc = { ...e, cooldowns: cds };
        stepped = tickPlayerEffects(stepped);
        setEnc(enemyTurn(stepped));
        return;
      }
      case "flee": {
        addLog(`${flavor}. You escape!`);
        setCombatLog([]);
        setEnc({ kind: "path", depth: e.depth });
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

  const finishKill = (e: CombatEnc) => {
    const goldDrop = 4 + e.depth * 3;
    const xpDrop = 6 + e.depth * 4;
    rewardGold(goldDrop); rewardXp(xpDrop);
    addLog(`${e.enemy.name} falls. +${goldDrop}g +${xpDrop}xp`);
    vibrate([20, 40, 60]);
    playSfx("death");
    let questItem: string | undefined;
    let material: string | undefined;
    let gear: GearItem | undefined;
    if (e.enemy.questItemId && Math.random() < 0.6) { addQuestItem(e.enemy.questItemId); questItem = e.enemy.questItemId; }
    if (e.enemy.materialDrop && Math.random() < e.enemy.materialDrop.chance) { addMaterial(e.enemy.materialDrop.id); material = e.enemy.materialDrop.id; }
    const gearChance = e.enemy.id === "dragon" ? 1 : 0.35 + e.depth * 0.04;
    if (Math.random() < gearChance) {
      const rolled = e.enemy.id === "dragon" ? rollGear(e.depth, { minRarity: "rare" }) : rollGear(e.depth);
      if (addToBag(rolled)) gear = rolled;
      else addLog("Bag full — gear left behind.");
    }
    // Journal + shards
    const loreByEnemy: Record<string, string> = {
      cultist: "lore_seals", wraith: "lore_wraith", ogre: "lore_ogre", dragon: "lore_dragon", skeleton: "lore_brigade",
    };
    recordKill(e.enemy.id, {
      boss: e.enemy.id === "dragon",
      loreId: Math.random() < 0.4 ? loreByEnemy[e.enemy.id] : undefined,
      itemDropId: gear?.baseId,
    });
    setEnc({ kind: "victory", depth: e.depth, loot: { enemy: e.enemy, gold: goldDrop, xp: xpDrop, questItem, material, gear } });
  };

  const closeVictory = () => {
    if (enc.kind !== "victory") return;
    if (enc.depth >= MAX_DEPTH) { finishRun("victory"); return; }
    restoreBetweenRooms();
    setEnc({ kind: "path", depth: enc.depth });
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
    setEnc({ kind: "path", depth: enc.depth });
  };

  // Always show the dungeon corridor as the background — enemy/chest sprites
  // overlay on top so the player can read where they are at a glance.
  const showEnemyOverlay = enc.kind === "combat" || enc.kind === "victory";
  const enemyOverlay = enc.kind === "combat" ? enc.enemy.image : enc.kind === "victory" ? enc.loot.enemy.image : null;
  const showChestOverlay = enc.kind === "chest";

  // Equipped gear delta for inline equip
  const lootGear = enc.kind === "victory" ? enc.loot.gear : undefined;
  const equippedForSlot = lootGear ? player.equipment[lootGear.slot] : undefined;
  const gearDelta = lootGear ? gearScore(lootGear) - (equippedForSlot ? gearScore(equippedForSlot) : 0) : 0;

  return (
    <div className="flex min-h-full flex-col">
      <div className={`relative h-64 overflow-hidden border-b-2 border-black ${hit ? "shake" : ""}`}>
        <img src={dungeonBgForDepth(enc.depth)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        {showEnemyOverlay && enemyOverlay && (
          <img
            key={(enc.kind === "combat" ? enc.enemy.id : "v_" + enc.loot.enemy.id) + enc.depth}
            src={enemyOverlay}
            alt=""
            className={`absolute inset-0 m-auto h-[88%] w-auto max-w-[88%] object-contain fade-in-up drop-shadow-[0_8px_0_rgba(0,0,0,0.7)] ${enc.kind === "victory" ? "grayscale opacity-60" : ""} ${hit && enc.kind === "combat" ? "fx-recoil" : ""}`}
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
          Depth {enc.depth}/{MAX_DEPTH}
          {MAJOR_BOSS_FLOORS.has(enc.depth) && enc.kind === "combat" && <span className="ml-1 text-blood">⚑ BOSS</span>}
          {MINI_BOSS_FLOORS.has(enc.depth) && enc.kind === "combat" && <span className="ml-1 text-ember">★ ELITE</span>}
        </div>
        <div className="absolute top-2 right-2 z-10"><SettingsButton /></div>
        {enc.kind === "combat" && (
          <div className="absolute right-2 top-9 pixel text-[8px] text-blood text-shadow-pixel bg-background/80 px-1.5 py-0.5 border border-black">
            {enc.enemy.name} {enc.enemyHp}/{enc.enemyMaxHp}
          </div>
        )}
        {enc.kind === "combat" && (
          <div className="absolute left-2 right-2 bottom-2 flex justify-center">
            <div className={`pixel text-[10px] font-bold px-3 py-1.5 border-2 border-black text-shadow-pixel ${enc.nextIntent.telegraphable ? "bg-blood text-white animate-pulse" : "bg-background/95 text-gold"}`}>
              {enc.nextIntent.telegraphable ? "⚠ INCOMING — " : "» "}{enc.enemy.name}: {enc.nextIntent.label}
            </div>
          </div>
        )}
        {enc.kind === "victory" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="pixel text-2xl text-gold text-shadow-pixel">VICTORY</p>
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


      <div className="p-3 space-y-3">
        <div ref={logRef} className="border-2 border-black bg-card/80 p-2 h-24 overflow-y-auto font-body text-sm leading-tight">
          {combatLog.length === 0 && <p className="text-muted-foreground italic">The dungeon is silent.</p>}
          {combatLog.map((l, i) => (
            <p key={i} className={
              l.includes("damage!") && l.includes(player.name) ? "text-divine" :
              l.startsWith("✓") || l.startsWith("★") ? "text-gold" :
              l.includes("for") && l.includes("!") ? "text-blood" :
              "text-foreground"
            }>› {l}</p>
          ))}
        </div>

        {enc.kind === "combat" && (
          <div className="border-2 border-black bg-card p-2">
            <div className="flex items-baseline justify-between">
              <span className="pixel text-[9px] text-blood">{enc.enemy.name}</span>
              <span className="font-body text-sm">{enc.enemyHp}/{enc.enemyMaxHp}</span>
            </div>
            <div className="mt-1 h-2 w-full bg-stone border border-black">
              <div className="h-full bg-blood transition-all" style={{ width: `${Math.max(0, (enc.enemyHp / enc.enemyMaxHp) * 100)}%` }} />
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {enc.stunnedTurns > 0 && <span className="pixel text-[7px] text-arcane border border-arcane px-1">❄ FROZEN</span>}
              {enc.shieldReduce > 0 && <span className="pixel text-[7px] text-gold border border-gold px-1">⛨ BRACED</span>}
              {enc.enemyEffects.map((ef) => (
                <span key={ef.kind} className="pixel text-[7px] border border-blood text-blood px-1 uppercase">
                  {ef.kind === "burn" ? "🔥" : ef.kind === "bleed" ? "🩸" : ef.kind === "chill" ? "❄" : "✦"} {ef.kind} {ef.turns}t
                </span>
              ))}
              {enc.playerEffects.filter((e) => e.kind === "renew").map((ef) => (
                <span key={ef.kind} className="pixel text-[7px] border border-divine text-divine px-1 uppercase">✦ Renew {ef.turns}t</span>
              ))}
            </div>
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
              <button className="pixel-btn !text-[8px]" onClick={() => setEnc({ kind: "path", depth: enc.depth })}>Leave</button>
            </div>
          </div>
        )}

        {enc.kind === "victory" && (
          <div className="border-2 border-black bg-card p-3 fade-in-up space-y-2">
            <p className="pixel text-[10px] text-gold">☠ {enc.loot.enemy.name} slain</p>
            <p className="font-body text-sm">+<span className="text-gold">{enc.loot.gold}g</span> · +<span className="text-divine">{enc.loot.xp}xp</span></p>
            {enc.loot.questItem && <p className="font-body text-sm">› Quest item: <span className="text-divine">{enc.loot.questItem.replace("_", " ")}</span></p>}
            {enc.loot.material && <p className="font-body text-sm">› Material: <span className="text-allies">{MATERIALS[enc.loot.material]?.name ?? enc.loot.material}</span></p>}
            {lootGear && (
              <div className={`border-2 border-black p-2 rarity-frame-${lootGear.rarity} space-y-1`}>
                <p className={`pixel text-[9px] ${RARITY_CLASS[lootGear.rarity]}`}>★ {lootGear.name}</p>
                <p className="font-body text-xs text-muted-foreground">{RARITY_LABEL[lootGear.rarity]} · iLvl {lootGear.ilvl}</p>
                <p className="font-body text-sm">
                  {lootGear.stats.atk ? `+${lootGear.stats.atk} ATK ` : ""}
                  {lootGear.stats.mag ? `+${lootGear.stats.mag} MAG ` : ""}
                  {lootGear.stats.maxHp ? `+${lootGear.stats.maxHp} HP ` : ""}
                  {lootGear.stats.crit ? `+${lootGear.stats.crit}% crit ` : ""}
                  {lootGear.stats.dodge ? `+${lootGear.stats.dodge}% dodge` : ""}
                </p>
                <p className={`pixel text-[7px] ${gearDelta > 0 ? "text-divine" : gearDelta < 0 ? "text-blood" : "text-muted-foreground"}`}>
                  {equippedForSlot ? (gearDelta > 0 ? `▲ +${gearDelta} vs equipped` : gearDelta < 0 ? `▼ ${gearDelta} vs equipped` : "= same score") : "▲ slot empty"}
                </p>
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
              {enc.depth >= MAX_DEPTH ? "Claim the Crown →" : lootGear ? "Move on ▸" : "Continue ▸"}
            </button>
          </div>
        )}

        {enc.kind === "shrine" && (
          <div className="border-2 border-divine bg-card p-3 fade-in-up">
            <p className="pixel text-[10px] text-divine">✦ A forgotten shrine</p>
            <p className="font-body text-sm text-muted-foreground mt-1">
              {enc.shrine === "heal" ? "Cool water trickles from the stone. Drink and be mended." : "Embers swirl above the altar — kneel and be quickened."}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="pixel-btn pixel-btn-gold !text-[8px]" onClick={() => {
                if (enc.shrine === "heal") {
                  const amt = Math.max(10, Math.floor(player.maxHp * 0.5));
                  heal(amt); addFloater("heal", amt); addLog(`The shrine restores ${amt} HP.`); playSfx("ui-confirm");
                } else {
                  rewardXp(20 + enc.depth * 6); addLog("The shrine fills you with insight."); playSfx("ui-confirm");
                }
                setEnc({ kind: "path", depth: enc.depth });
              }}>Pray</button>
              <button className="pixel-btn !text-[8px]" onClick={() => setEnc({ kind: "path", depth: enc.depth })}>Move on</button>
            </div>
          </div>
        )}

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
                  const dmg = Math.max(3, Math.floor(player.maxHp * (enc.trap === "spikes" ? 0.22 : 0.15)));
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
                  setEnc({ kind: "path", depth: back });
                }}>↩ Turn back (−3 floors)</button>
              </div>
            )}
            {enc.sprung && (
              <button className="pixel-btn pixel-btn-gold !text-[8px] w-full mt-3" onClick={() => setEnc({ kind: "path", depth: enc.depth })}>Press on ▸</button>
            )}
          </div>
        )}

        {enc.kind === "path" && (
          <div className="border-2 border-black bg-card p-3 fade-in-up">
            <p className="pixel text-[9px] text-foreground">The corridor forks.</p>
            <p className="font-body text-sm text-muted-foreground mt-1">Each step risks worse — and richer.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button className="pixel-btn !text-[8px]" onClick={advance}>← Left</button>
              <button className="pixel-btn !text-[8px]" onClick={advance}>↑ Onward</button>
              <button className="pixel-btn !text-[8px]" onClick={advance}>Right →</button>
            </div>
          </div>
        )}


        {enc.kind === "combat" && (
          <div className="space-y-2">
            <div className={`grid gap-2 ${abilities.length >= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
              {abilities.map((ab) => {
                const cd = enc.cooldowns[ab.id] ?? 0;
                const armed = armedAbility === ab.id;
                return (
                  <button
                    key={ab.id}
                    onClick={() => useAbility(ab)}
                    onMouseEnter={() => setHoveredAbility(ab)}
                    onFocus={() => setHoveredAbility(ab)}
                    disabled={cd > 0}
                    className={`pixel-btn !text-[8px] !p-2 disabled:opacity-40 ${weaponGlow ? "weapon-glow-btn" : ""} ${armed ? "pixel-btn-gold ring-2 ring-gold" : ab.id === abilities[0].id ? "pixel-btn-primary" : ""}`}
                    style={weaponGlow ? ({ ["--weapon-glow" as string]: weaponGlow } as CSSProperties) : undefined}
                  >
                    {ab.name}
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
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {inv.includes("p1") && <button onClick={() => use("p1")} className="pixel-btn !text-[8px]">Lesser Potion ({inv.filter(x=>x==="p1").length})</button>}
          {inv.includes("p2") && <button onClick={() => use("p2")} className="pixel-btn !text-[8px]">Greater Potion ({inv.filter(x=>x==="p2").length})</button>}
          {inv.includes("phoenix") && <span className="pixel-btn !text-[8px] text-center text-divine">✦ Phoenix Feather armed ({inv.filter(x=>x==="phoenix").length})</span>}
          {inv.includes("hearth") && <button onClick={useHearth} className="pixel-btn pixel-btn-gold !text-[8px]">⌂ Hearthstone — bail out</button>}
        </div>

        {enc.kind === "combat" ? (
          <p className="pixel text-[7px] text-blood text-center opacity-80 mt-1">
            ⚠ Locked in combat — use a Hearthstone Charm to bail out.
          </p>
        ) : (
          <button onClick={exitDungeon} className="pixel-btn !text-[8px] w-full text-center">⌂ Retreat to City</button>
        )}
      </div>

      <TutorialTip
        id="dungeon-combat"
        title="Into the Dark"
        body="Tap an ability to use it. You can't retreat mid-fight — keep a Hearthstone Charm if you want a safe escape. Dying drops your loot."
        position="top"
      />
    </div>
  );
}

// VictoryScreen / DefeatScreen were removed — the run summary screen handles
// both outcomes now.


