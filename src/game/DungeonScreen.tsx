import { useState, useEffect } from "react";
import { useGame } from "@/game/store";
import { StatBar } from "./StatBar";
import corridorImg from "@/assets/dungeon-corridor.jpg";
import chestImg from "@/assets/dungeon-chest.jpg";
import skeletonImg from "@/assets/enemy-skeleton.jpg";

type Encounter =
  | { kind: "path"; depth: number }
  | { kind: "chest"; depth: number; gold: number; xp: number }
  | { kind: "combat"; depth: number; enemyHp: number; enemyMaxHp: number; enemyAtk: number; name: string };

function rollEncounter(depth: number): Encounter {
  const r = Math.random();
  if (depth === 1) return { kind: "path", depth };
  if (r < 0.55) {
    const hp = 10 + depth * 6;
    return { kind: "combat", depth, enemyHp: hp, enemyMaxHp: hp, enemyAtk: 3 + Math.floor(depth * 1.2), name: depth > 4 ? "Wraith Knight" : "Risen Skeleton" };
  }
  if (r < 0.85) return { kind: "chest", depth, gold: 8 + depth * 6, xp: 5 + depth * 3 };
  return { kind: "path", depth };
}

export function DungeonScreen() {
  const player = useGame((s) => s.player);
  const damage = useGame((s) => s.damage);
  const rewardGold = useGame((s) => s.rewardGold);
  const rewardXp = useGame((s) => s.rewardXp);
  const pushLog = useGame((s) => s.pushLog);
  const exitDungeon = useGame((s) => s.exitDungeon);
  const setScreen = useGame((s) => s.setScreen);
  const use = useGame((s) => s.use);
  const inv = player.inventory;

  const [enc, setEnc] = useState<Encounter>(() => ({ kind: "path", depth: 1 }));
  const [hit, setHit] = useState(false);

  useEffect(() => {
    if (player.hp <= 0) setScreen("defeat");
  }, [player.hp, setScreen]);

  const advance = () => {
    const newDepth = enc.depth + 1;
    if (newDepth > 10) {
      setScreen("victory");
      return;
    }
    setEnc(rollEncounter(newDepth));
  };

  const attack = (skill: "strike" | "heavy") => {
    if (enc.kind !== "combat") return;
    const dmg = skill === "heavy" ? Math.floor(player.atk * 1.6) : player.atk + Math.floor(player.mag / 2);
    const newHp = enc.enemyHp - dmg;
    pushLog(`You hit ${enc.name} for ${dmg}.`);
    if (newHp <= 0) {
      const goldDrop = 4 + enc.depth * 3;
      const xpDrop = 6 + enc.depth * 4;
      rewardGold(goldDrop);
      rewardXp(xpDrop);
      pushLog(`${enc.name} crumbles. +${goldDrop}g +${xpDrop}xp`);
      setEnc({ kind: "path", depth: enc.depth });
      return;
    }
    const incoming = Math.max(1, enc.enemyAtk - Math.floor(Math.random() * 3));
    damage(incoming);
    setHit(true);
    setTimeout(() => setHit(false), 350);
    pushLog(`${enc.name} strikes back for ${incoming}.`);
    setEnc({ ...enc, enemyHp: newHp });
  };

  const flee = () => {
    if (enc.kind !== "combat") return;
    const fled = Math.random() < 0.55;
    if (fled) {
      pushLog("You slip into the shadows.");
      setEnc({ kind: "path", depth: enc.depth });
    } else {
      const incoming = enc.enemyAtk;
      damage(incoming);
      pushLog(`Flee failed! ${incoming} dmg.`);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className={`relative h-72 overflow-hidden border-b-2 border-black ${hit ? "shake" : ""}`}>
        <img
          key={enc.kind + enc.depth}
          src={enc.kind === "combat" ? skeletonImg : enc.kind === "chest" ? chestImg : corridorImg}
          alt={enc.kind}
          className="h-full w-full object-cover fade-in-up"
        />
        <div className="absolute inset-0 vignette" />
        <div className="absolute inset-0 scanlines" />
        <div className="absolute left-2 top-2 pixel text-[8px] text-gold text-shadow-pixel">
          Depth {enc.depth}/10
        </div>
      </div>

      <div className="p-3 space-y-3">
        <StatBar />

        {enc.kind === "combat" && (
          <div className="border-2 border-black bg-card p-2 fade-in-up">
            <div className="flex items-baseline justify-between">
              <span className="pixel text-[9px] text-blood">{enc.name}</span>
              <span className="font-body text-sm">{enc.enemyHp}/{enc.enemyMaxHp}</span>
            </div>
            <div className="mt-1 h-2 w-full bg-stone border border-black">
              <div className="h-full bg-blood" style={{ width: `${(enc.enemyHp/enc.enemyMaxHp)*100}%` }} />
            </div>
          </div>
        )}

        {enc.kind === "chest" && (
          <div className="border-2 border-black bg-card p-3 fade-in-up text-center">
            <p className="pixel text-[10px] text-gold">A Sealed Chest</p>
            <p className="font-body text-sm text-muted-foreground mt-1">It hums faintly. Open it?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="pixel-btn pixel-btn-gold !text-[8px]"
                onClick={() => {
                  rewardGold(enc.gold); rewardXp(enc.xp);
                  pushLog(`The chest yields ${enc.gold}g and ${enc.xp}xp.`);
                  setEnc({ kind: "path", depth: enc.depth });
                }}>Open</button>
              <button className="pixel-btn !text-[8px]" onClick={() => setEnc({ kind: "path", depth: enc.depth })}>Leave</button>
            </div>
          </div>
        )}

        {enc.kind === "path" && (
          <div className="border-2 border-black bg-card p-3 fade-in-up">
            <p className="pixel text-[9px] text-foreground">The corridor forks.</p>
            <p className="font-body text-sm text-muted-foreground mt-1">Choose your path. Each step risks worse.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button className="pixel-btn !text-[8px]" onClick={advance}>← Left</button>
              <button className="pixel-btn !text-[8px]" onClick={advance}>↑ Straight</button>
              <button className="pixel-btn !text-[8px]" onClick={advance}>Right →</button>
            </div>
          </div>
        )}

        {enc.kind === "combat" ? (
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => attack("strike")} className="pixel-btn pixel-btn-primary !text-[8px]">Strike</button>
            <button onClick={() => attack("heavy")} className="pixel-btn !text-[8px]">Heavy</button>
            <button onClick={flee} className="pixel-btn !text-[8px]">Flee</button>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {inv.includes("p1") && <button onClick={() => use("p1")} className="pixel-btn !text-[8px]">Lesser Potion</button>}
          {inv.includes("p2") && <button onClick={() => use("p2")} className="pixel-btn !text-[8px]">Greater Potion</button>}
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
