import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useGame } from "@/game/store";
import { FloatingNumber, nextFloatingId, type FloatingNum } from "./FloatingNumber";
import {
  CLASS_ABILITIES, CLASSES, COSMETICS, FACTIONS, enemyForDepth, rollChest, rollGear, MATERIALS, RECIPES,
  RARITY_CLASS, RARITY_LABEL, gearScore, gearSellPrice, rollDamage, damageRange,
  type Ability, type EnemyDef, type ChestPreview, type GearItem,
  type StatusEffect, type EnemyIntent, type FactionId,
} from "@/game/data";
import { playMusic, playSfx } from "@/game/audio";
import { TutorialTip } from "@/game/Tutorial";
import corridorImg from "@/assets/dungeon-corridor.jpg";
import chestImg from "@/assets/dungeon-chest.jpg";

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
  enemyEffects: StatusEffect[];  // bleed / burn on enemy, chill on enemy
  playerEffects: StatusEffect[]; // renew / burn on player (future)
  nextIntent: EnemyIntent;       // telegraphed action for the upcoming enemy turn
};

type Encounter =
  | { kind: "path"; depth: number }
  | { kind: "victory"; depth: number; loot: Loot }
  | { kind: "chest"; depth: number; preview: ChestPreview }
  | CombatEnc;

function pickIntent(enemy: EnemyDef): EnemyIntent {
  // Telegraphable intents fire ~35% of the time; otherwise pick a non-telegraphable
  const teleg = enemy.intents.filter((i) => i.telegraphable);
  const normal = enemy.intents.filter((i) => !i.telegraphable);
  if (teleg.length && Math.random() < 0.35) return teleg[Math.floor(Math.random() * teleg.length)];
  const pool = normal.length ? normal : enemy.intents;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildCombat(depth: number, faction?: FactionId | null): CombatEnc {
  const e = enemyForDepth(depth, faction);
  const hp = e.hpBase + (depth >= 10 ? 0 : Math.floor(depth * 1.4));
  return {
    kind: "combat", depth, enemy: e, enemyHp: hp, enemyMaxHp: hp,
    stunnedTurns: 0, shieldReduce: 0, cooldowns: {},
    enemyEffects: [], playerEffects: [],
    nextIntent: pickIntent(e),
  };
}

function rollEncounter(depth: number, faction?: FactionId | null): Encounter {
  if (depth >= 10) return buildCombat(depth, faction);
  const r = Math.random();
  if (r < 0.55) return buildCombat(depth, faction);
  if (r < 0.85) return { kind: "chest", depth, preview: rollChest(depth) };
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
  const sellBag = useGame((s) => s.sellBagItem);
  const discardBag = useGame((s) => s.discardBagItem);

  const abilities = player.classId ? CLASS_ABILITIES[player.classId] : [];
  const inv = player.inventory;
  const faction = player.faction ? FACTIONS.find((f) => f.id === player.faction)! : null;

  const eq = player.equippedCosmetics ?? {};
  const weaponGlow = eq.weaponGlow ? COSMETICS.find((c) => c.id === eq.weaponGlow)?.tint : undefined;
  const dmgSkin    = eq.damageSkin ? COSMETICS.find((c) => c.id === eq.damageSkin)?.tint : undefined;

  const [enc, setEnc] = useState<Encounter>(() => ({ kind: "path", depth: 1 }));

  // Music: swap to boss track when fighting a boss, dungeon ambient otherwise.
  useEffect(() => {
    const isBoss = enc.kind === "combat" && enc.enemy.id === "dragon";
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
    if (newDepth > 10) { finishRun("victory"); return; }
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
        const amt = Math.max(4, player.mag * 2);
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
        const power = Math.max(2, Math.floor(player.mag * 0.8));
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
        // Tick player effects but skip enemy turn (frozen)
        stepped = tickPlayerEffects(stepped);
        stepped = tickEffectsOnEnemy(stepped, addLog);
        if (stepped.enemyHp <= 0) { finishKill(stepped); return; }
        setEnc({ ...stepped, stunnedTurns: stepped.stunnedTurns - 1, nextIntent: pickIntent(stepped.enemy) });
        return;
      }
      case "shield": {
        addLog(`${flavor}.`);
        const cds = tickCooldowns(e); cds[ab.id] = ab.cooldown;
        let stepped: CombatEnc = { ...e, shieldReduce: ab.effect.reduce, cooldowns: cds };
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
    if (enc.loot.enemy.id === "dragon") { finishRun("victory"); return; }
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

  const heroImg =
    enc.kind === "combat" ? enc.enemy.image :
    enc.kind === "victory" ? enc.loot.enemy.image :
    enc.kind === "chest" ? chestImg :
    corridorImg;

  // Equipped gear delta for inline equip
  const lootGear = enc.kind === "victory" ? enc.loot.gear : undefined;
  const equippedForSlot = lootGear ? player.equipment[lootGear.slot] : undefined;
  const gearDelta = lootGear ? gearScore(lootGear) - (equippedForSlot ? gearScore(equippedForSlot) : 0) : 0;

  return (
    <div className="flex min-h-full flex-col">
      <div className={`relative h-64 overflow-hidden border-b-2 border-black ${hit ? "shake" : ""}`}>
        <img
          key={(enc.kind === "combat" ? enc.enemy.id : enc.kind === "victory" ? "v_" + enc.loot.enemy.id : enc.kind) + enc.depth}
          src={heroImg}
          alt=""
          className={`h-full w-full object-cover fade-in-up ${enc.kind === "victory" ? "grayscale opacity-60" : ""} ${hit && enc.kind === "combat" ? "fx-recoil" : ""}`}
        />
        {attackFx && enc.kind === "combat" && (
          attackFx.kind === "melee"
            ? <div key={attackFx.key} className="fx-slash" />
            : <div key={attackFx.key} className="fx-cast" style={{ ["--fx-tint" as string]: attackFx.tint ?? "rgba(160,140,255,0.7)" } as CSSProperties} />
        )}
        <div className="absolute inset-0 vignette" />
        <div className="absolute inset-0 scanlines" />
        <div className="absolute left-2 top-2 pixel text-[8px] text-gold text-shadow-pixel">Depth {enc.depth}/10</div>
        {enc.kind === "combat" && (
          <div className="absolute right-2 top-2 pixel text-[8px] text-blood text-shadow-pixel">
            {enc.enemy.name} {enc.enemyHp}/{enc.enemyMaxHp}
          </div>
        )}
        {enc.kind === "combat" && (
          <div className="absolute left-2 right-2 bottom-2 flex justify-center">
            <div className={`pixel text-[8px] px-2 py-1 border-2 border-black text-shadow-pixel ${enc.nextIntent.telegraphable ? "bg-blood text-background animate-pulse" : "bg-card text-foreground"}`}>
              {enc.nextIntent.telegraphable ? "⚠ " : ""}{enc.enemy.name}: {enc.nextIntent.label}
            </div>
          </div>
        )}
        {enc.kind === "victory" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="pixel text-2xl text-gold text-shadow-pixel">VICTORY</p>
          </div>
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
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <button onClick={() => { playSfx("loot"); equip(lootGear.id); setEquippedFlash(lootGear.id); }} className="pixel-btn pixel-btn-gold !text-[8px]">Equip</button>
                    <button onClick={() => sellBag(lootGear.id)} className="pixel-btn !text-[8px]">Sell {gearSellPrice(lootGear)}g</button>
                    <button onClick={() => discardBag(lootGear.id)} className="pixel-btn !text-[8px]">Discard</button>
                  </div>
                )}
              </div>
            )}
            {!enc.loot.questItem && !enc.loot.material && !enc.loot.gear && (
              <p className="font-body text-sm text-muted-foreground">No drops this time.</p>
            )}
            <button onClick={closeVictory} className="pixel-btn pixel-btn-gold !text-[8px] w-full text-center">
              {enc.loot.enemy.id === "dragon" ? "Claim the Heart →" : "Continue ▸"}
            </button>
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
            <div className="grid grid-cols-3 gap-2">
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


