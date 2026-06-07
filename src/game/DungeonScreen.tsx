import { useState, useEffect, useRef } from "react";
import { useGame } from "@/game/store";
import { StatBar } from "./StatBar";
import { FloatingNumber, nextFloatingId, type FloatingNum } from "./FloatingNumber";
import { CLASS_ABILITIES, COSMETICS, enemyForDepth, rollChest, rollGear, MATERIALS, RECIPES, RARITY_CLASS, RARITY_LABEL, gearSellPrice, type Ability, type EnemyDef, type ChestPreview, type GearItem } from "@/game/data";
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


type Encounter =
  | { kind: "path"; depth: number }
  | { kind: "victory"; depth: number; loot: Loot }
  | { kind: "chest"; depth: number; preview: ChestPreview }
  | {
      kind: "combat"; depth: number;
      enemy: EnemyDef;
      enemyHp: number; enemyMaxHp: number;
      stunnedTurns: number; shieldReduce: number;
      cooldowns: Record<string, number>;
    };

function rollEncounter(depth: number): Encounter {
  if (depth >= 10) {
    const e = enemyForDepth(10);
    const hp = e.hpBase;
    return { kind: "combat", depth, enemy: e, enemyHp: hp, enemyMaxHp: hp, stunnedTurns: 0, shieldReduce: 0, cooldowns: {} };
  }
  const r = Math.random();
  if (r < 0.55) {
    const e = enemyForDepth(depth);
    const hp = e.hpBase + Math.floor(depth * 1.4);
    return { kind: "combat", depth, enemy: e, enemyHp: hp, enemyMaxHp: hp, stunnedTurns: 0, shieldReduce: 0, cooldowns: {} };
  }
  if (r < 0.85) return { kind: "chest", depth, preview: rollChest(depth) };
  return { kind: "path", depth };
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

  const abilities = player.classId ? CLASS_ABILITIES[player.classId] : [];
  const inv = player.inventory;

  const eq = player.equippedCosmetics ?? {};
  const weaponGlow = eq.weaponGlow ? COSMETICS.find((c) => c.id === eq.weaponGlow)?.tint : undefined;
  const dmgSkin    = eq.damageSkin ? COSMETICS.find((c) => c.id === eq.damageSkin)?.tint : undefined;

  const [enc, setEnc] = useState<Encounter>(() => ({ kind: "path", depth: 1 }));
  const [hit, setHit] = useState(false);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [hoveredAbility, setHoveredAbility] = useState<Ability | null>(null);
  const [floaters, setFloaters] = useState<FloatingNum[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const addFloater = (kind: FloatingNum["kind"], value: number, color?: string) => {
    setFloaters((f) => [...f, { id: nextFloatingId(), kind, value, color, x: 40 + Math.random() * 20 }]);
  };
  const removeFloater = (id: number) => setFloaters((f) => f.filter((x) => x.id !== id));

  const addLog = (msg: string) => {
    setCombatLog((l) => [...l.slice(-20), msg]);
    pushLog(msg);
  };

  useEffect(() => {
    if (player.hp <= 0) setScreen("defeat");
  }, [player.hp, setScreen]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [combatLog]);

  const advance = () => {
    const newDepth = enc.depth + 1;
    if (newDepth > 10) { setScreen("victory"); return; }
    const next = rollEncounter(newDepth);
    setEnc(next);
    if (next.kind === "combat") addLog(`A ${next.enemy.name} blocks your path!`);
    else if (next.kind === "chest") addLog(`You spot ${next.preview.label}.`);
    else addLog("The corridor opens further.");
  };

  const tickCooldowns = (e: Extract<Encounter, { kind: "combat" }>) => {
    const cds: Record<string, number> = {};
    for (const [k, v] of Object.entries(e.cooldowns)) if (v > 1) cds[k] = v - 1;
    return cds;
  };

  const enemyTurn = (e: Extract<Encounter, { kind: "combat" }>) => {
    if (e.stunnedTurns > 0) {
      addLog(`${e.enemy.name} is frozen and cannot act.`);
      return { ...e, stunnedTurns: e.stunnedTurns - 1, shieldReduce: 0 };
    }
    let dmg = Math.max(1, e.enemy.atkBase + Math.floor(e.depth * 0.6) - Math.floor(Math.random() * 3));
    if (e.shieldReduce > 0) dmg = Math.max(1, Math.floor(dmg * (1 - e.shieldReduce)));
    damage(dmg);
    addFloater("enemy", dmg);
    setHit(true); setTimeout(() => setHit(false), 350);
    const line = e.enemy.attackLines[Math.floor(Math.random() * e.enemy.attackLines.length)]
      .replace("{n}", e.enemy.name).replace("{d}", String(dmg));
    addLog(line + (e.shieldReduce > 0 ? " (shielded!)" : ""));
    return { ...e, shieldReduce: 0 };
  };

  const useAbility = (ab: Ability) => {
    if (enc.kind !== "combat") return;
    if ((enc.cooldowns[ab.id] ?? 0) > 0) return;
    const e = enc;
    const flavor = ab.effect.flavor.replace("{p}", player.name);

    switch (ab.effect.kind) {
      case "attack": {
        const base = ab.effect.useMag ? player.mag : player.atk;
        const dmg = Math.max(1, Math.floor(base * ab.effect.mult));
        addFloater("player", dmg, dmgSkin);
        addLog(`${flavor} for ${dmg} damage!`);
        const newHp = e.enemyHp - dmg;
        if (newHp <= 0) return finishKill(e);
        const cds = tickCooldowns(e);
        cds[ab.id] = ab.cooldown;
        const stepped = { ...e, enemyHp: newHp, cooldowns: cds };
        setEnc(enemyTurn(stepped));
        return;
      }
      case "heal": {
        const amt = Math.max(4, player.mag * 2);
        heal(amt);
        addFloater("heal", amt);
        addLog(`${flavor} — restored ${amt} HP.`);
        const cds = tickCooldowns(e); cds[ab.id] = ab.cooldown;
        setEnc(enemyTurn({ ...e, cooldowns: cds }));
        return;
      }
      case "stun": {
        addLog(`${flavor}. ${e.enemy.name} is frozen!`);
        const cds = tickCooldowns(e); cds[ab.id] = ab.cooldown;
        setEnc({ ...e, cooldowns: cds, stunnedTurns: 1 });
        return;
      }
      case "shield": {
        addLog(`${flavor}.`);
        const cds = tickCooldowns(e); cds[ab.id] = ab.cooldown;
        setEnc(enemyTurn({ ...e, shieldReduce: ab.effect.reduce, cooldowns: cds }));
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

  const addMaterial = useGame((s) => s.addMaterial);
  const learnRecipe = useGame((s) => s.learnRecipe);
  const addToBag = useGame((s) => s.addToBag);

  const finishKill = (e: Extract<Encounter, { kind: "combat" }>) => {
    const goldDrop = 4 + e.depth * 3;
    const xpDrop = 6 + e.depth * 4;
    rewardGold(goldDrop); rewardXp(xpDrop);
    addLog(`${e.enemy.name} falls. +${goldDrop}g +${xpDrop}xp`);
    vibrate([20, 40, 60]);
    let questItem: string | undefined;
    let material: string | undefined;
    let gear: GearItem | undefined;
    if (e.enemy.questItemId && Math.random() < 0.6) { addQuestItem(e.enemy.questItemId); questItem = e.enemy.questItemId; }
    if (e.enemy.materialDrop && Math.random() < e.enemy.materialDrop.chance) { addMaterial(e.enemy.materialDrop.id); material = e.enemy.materialDrop.id; }
    // Gear drop chance scales with depth; boss guarantees rare+
    const gearChance = e.enemy.id === "dragon" ? 1 : 0.35 + e.depth * 0.04;
    if (Math.random() < gearChance) {
      const rolled = e.enemy.id === "dragon" ? rollGear(e.depth, { minRarity: "rare" }) : rollGear(e.depth);
      if (addToBag(rolled)) gear = rolled;
      else addLog("Bag full — gear left behind.");
    }
    setEnc({ kind: "victory", depth: e.depth, loot: { enemy: e.enemy, gold: goldDrop, xp: xpDrop, questItem, material, gear } });
  };


  const closeVictory = () => {
    if (enc.kind !== "victory") return;
    if (enc.loot.enemy.id === "dragon") { setScreen("victory"); return; }
    setEnc({ kind: "path", depth: enc.depth });
  };

  const openChest = () => {
    if (enc.kind !== "chest") return;
    const g = enc.preview.goldRange[0] + Math.floor(Math.random() * (enc.preview.goldRange[1] - enc.preview.goldRange[0] + 1));
    const x = enc.preview.xpRange[0] + Math.floor(Math.random() * (enc.preview.xpRange[1] - enc.preview.xpRange[0] + 1));
    rewardGold(g); rewardXp(x);
    addLog(`The chest yields ${g}g and ${x}xp.`);
    if (enc.preview.questItemId) {
      addQuestItem(enc.preview.questItemId);
      addLog(`Inside: a ${enc.preview.questItemId.replace("_", " ")}!`);
    }
    if (enc.preview.materialId) {
      addMaterial(enc.preview.materialId);
      addLog(`Inside: ${MATERIALS[enc.preview.materialId]?.name ?? enc.preview.materialId}.`);
    }
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

  return (
    <div className="flex min-h-full flex-col">
      <div className={`relative h-64 overflow-hidden border-b-2 border-black ${hit ? "shake" : ""}`}>
        <img
          key={(enc.kind === "combat" ? enc.enemy.id : enc.kind === "victory" ? "v_" + enc.loot.enemy.id : enc.kind) + enc.depth}
          src={heroImg}
          alt=""
          className={`h-full w-full object-cover fade-in-up ${enc.kind === "victory" ? "grayscale opacity-60" : ""}`}
        />
        <div className="absolute inset-0 vignette" />
        <div className="absolute inset-0 scanlines" />
        <div className="absolute left-2 top-2 pixel text-[8px] text-gold text-shadow-pixel">Depth {enc.depth}/10</div>
        {enc.kind === "combat" && (
          <div className="absolute right-2 top-2 pixel text-[8px] text-blood text-shadow-pixel">
            {enc.enemy.name} {enc.enemyHp}/{enc.enemyMaxHp}
          </div>
        )}
        {enc.kind === "victory" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="pixel text-2xl text-gold text-shadow-pixel">VICTORY</p>
          </div>
        )}
        {/* Floating damage numbers overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {floaters.map((f) => <FloatingNumber key={f.id} num={f} onDone={removeFloater} />)}
        </div>
      </div>


      <div className="p-3 space-y-3">
        <StatBar />

        {/* Combat / event log */}
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
              <div className="h-full bg-blood transition-all" style={{ width: `${(enc.enemyHp / enc.enemyMaxHp) * 100}%` }} />
            </div>
            {enc.stunnedTurns > 0 && <p className="pixel text-[8px] text-arcane mt-1">❄ FROZEN</p>}
            {enc.shieldReduce > 0 && <p className="pixel text-[8px] text-gold mt-1">⛨ BRACED</p>}
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
            {enc.loot.questItem && (
              <p className="font-body text-sm">› Quest item: <span className="text-divine">{enc.loot.questItem.replace("_", " ")}</span></p>
            )}
            {enc.loot.material && (
              <p className="font-body text-sm">› Material: <span className="text-allies">{MATERIALS[enc.loot.material]?.name ?? enc.loot.material}</span></p>
            )}
            {enc.loot.gear && (
              <div className={`border-2 border-black p-2 rarity-frame-${enc.loot.gear.rarity}`}>
                <p className={`pixel text-[9px] ${RARITY_CLASS[enc.loot.gear.rarity]}`}>★ {enc.loot.gear.name}</p>
                <p className="font-body text-xs text-muted-foreground">{RARITY_LABEL[enc.loot.gear.rarity]} · iLvl {enc.loot.gear.ilvl}</p>
                <p className="font-body text-sm mt-1">
                  {enc.loot.gear.stats.atk ? `+${enc.loot.gear.stats.atk} ATK ` : ""}
                  {enc.loot.gear.stats.mag ? `+${enc.loot.gear.stats.mag} MAG ` : ""}
                  {enc.loot.gear.stats.maxHp ? `+${enc.loot.gear.stats.maxHp} HP ` : ""}
                  {enc.loot.gear.stats.crit ? `+${enc.loot.gear.stats.crit}% crit ` : ""}
                  {enc.loot.gear.stats.dodge ? `+${enc.loot.gear.stats.dodge}% dodge` : ""}
                </p>
                <p className="font-body text-xs text-muted-foreground">Auto-added to bag · sells for {gearSellPrice(enc.loot.gear)}g</p>
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

        {/* Class abilities */}
        {enc.kind === "combat" && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {abilities.map((ab) => {
                const cd = enc.cooldowns[ab.id] ?? 0;
                return (
                  <button
                    key={ab.id}
                    onClick={() => useAbility(ab)}
                    onMouseEnter={() => setHoveredAbility(ab)}
                    onFocus={() => setHoveredAbility(ab)}
                    disabled={cd > 0}
                    className={`pixel-btn !text-[8px] !p-2 disabled:opacity-40 ${ab.id === abilities[0].id ? "pixel-btn-primary" : ""}`}
                  >
                    {ab.name}
                    {cd > 0 && <span className="block pixel text-[7px] mt-1 text-muted-foreground">CD {cd}</span>}
                  </button>
                );
              })}
            </div>
            {(hoveredAbility ?? abilities[0]) && (
              <div className="border-2 border-black bg-popover px-2 py-1.5">
                <p className="pixel text-[8px] text-gold">{(hoveredAbility ?? abilities[0]).name}</p>
                <p className="font-body text-sm text-muted-foreground leading-tight">{(hoveredAbility ?? abilities[0]).desc}</p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {inv.includes("p1") && <button onClick={() => use("p1")} className="pixel-btn !text-[8px]">Lesser Potion ({inv.filter(x=>x==="p1").length})</button>}
          {inv.includes("p2") && <button onClick={() => use("p2")} className="pixel-btn !text-[8px]">Greater Potion ({inv.filter(x=>x==="p2").length})</button>}
        </div>

        <button onClick={exitDungeon} className="pixel-btn !text-[8px] w-full text-center">⌂ Retreat to City</button>
      </div>
    </div>
  );
}

export function VictoryScreen() {
  const reset = useGame((s) => s.reset);
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6 text-center gap-4">
      <h1 className="pixel text-2xl text-gold text-shadow-pixel">VICTORY</h1>
      <p className="font-body text-lg text-muted-foreground">You reach the dungeon's heart and emerge alive.</p>
      <button onClick={reset} className="pixel-btn pixel-btn-gold w-full">▶ New Run</button>
    </div>
  );
}

export function DefeatScreen() {
  const reset = useGame((s) => s.reset);
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6 text-center gap-4">
      <h1 className="pixel text-2xl text-blood text-shadow-pixel">YOU DIED</h1>
      <p className="font-body text-lg text-muted-foreground">The dark keeps what it claims.</p>
      <button onClick={reset} className="pixel-btn pixel-btn-primary w-full">▶ Try Again</button>
    </div>
  );
}
