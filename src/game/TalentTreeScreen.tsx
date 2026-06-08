import { useGame } from "@/game/store";
import { SPECS, SPEC_ABILITIES, TALENT_TREES, TRAINERS, QUESTS, RESPEC_GOLD_COST } from "@/game/data";
import { StatBar } from "./StatBar";

export function TalentTreeScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const player = useGame((s) => s.player);
  const pickSpec = useGame((s) => s.pickSpec);
  const respec = useGame((s) => s.respec);
  const learnTalent = useGame((s) => s.learnTalent);
  const accept = useGame((s) => s.acceptQuest);
  const turnIn = useGame((s) => s.turnInQuest);
  const quests = useGame((s) => s.quests);

  if (!player.classId) return null;
  const t = TRAINERS[player.classId];
  const classSpecs = SPECS.filter((s) => s.classId === player.classId);
  const classQuests = QUESTS.filter((q) => q.classId === player.classId);
  const locked = player.level < 3;
  const tree = player.specId ? TALENT_TREES[player.specId] : null;
  const tiers: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

  return (
    <div className="flex min-h-full flex-col">
      <div className="relative h-44 overflow-hidden border-b-2 border-black">
        <img src={t.portrait} alt={t.name} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 vignette" />
        <div className="absolute inset-0 scanlines" />
        <div className="absolute bottom-2 left-2 right-2">
          <p className="pixel text-[8px] text-muted-foreground">{t.title}</p>
          <p className="pixel text-[12px] text-gold text-shadow-pixel">{t.name}</p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <StatBar />
        <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>

        {locked ? (
          <div className="border-2 border-black bg-card p-3">
            <p className="pixel text-[9px] text-blood">"Come back when you've survived. Three levels, at least."</p>
            <p className="font-body text-sm text-muted-foreground mt-1">Reach Level 3 to begin training. (You are Lv {player.level}.)</p>
          </div>
        ) : !player.specId ? (
          <>
            <div className="border-2 border-black bg-card p-3">
              <p className="font-body text-base leading-snug">"{t.greeting}"</p>
              <p className="pixel text-[9px] text-gold mt-2">Choose a specialization — it shapes your tree.</p>
            </div>
            <div className="space-y-2">
              {classSpecs.map((s) => (
                <button key={s.id} onClick={() => pickSpec(s.id)} className="pixel-btn w-full">
                  <span className="block pixel text-[10px]" style={{ color: s.color }}>{s.name}</span>
                  <span className="block font-body text-sm opacity-80 mt-1">{s.tagline}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="border-2 border-black bg-card p-3 flex items-center justify-between gap-2">
              <div>
                <p className="pixel text-[10px] text-gold">{SPECS.find(s=>s.id===player.specId)?.name} Tree</p>
                <p className="font-body text-sm text-muted-foreground">Talent points: <span className="text-gold">{player.talentPoints}</span></p>
              </div>
              <button onClick={respec} className="pixel-btn !text-[8px]" disabled={player.gold < (player.isChampion ? 0 : RESPEC_GOLD_COST)}>
                Respec {player.isChampion ? "(free)" : `(${RESPEC_GOLD_COST}g)`}
              </button>
            </div>

            <div className="space-y-2">
              {tiers.map((tier) => {
                const nodes = tree!.filter((n) => n.tier === tier);
                const isCapstoneTier = nodes.every((n) => n.capstone);
                const capstoneTaken = isCapstoneTier && nodes.some((n) => player.learnedTalents.includes(n.id));
                return (
                  <div key={tier} className={`border-2 ${isCapstoneTier ? "border-gold" : "border-black"} bg-card/60 p-2`}>
                    <p className="pixel text-[8px] text-muted-foreground mb-2">
                      TIER {tier}{isCapstoneTier ? " · CAPSTONE (pick 1)" : ""}
                    </p>
                    <div className={`grid gap-2 ${nodes.length === 1 ? "grid-cols-1" : nodes.length === 3 ? "grid-cols-1" : "grid-cols-2"}`}>
                      {nodes.map((node) => {
                        const learned = player.learnedTalents.includes(node.id);
                        const reqMet = !node.requires || player.learnedTalents.includes(node.requires);
                        const lockedByCapstone = isCapstoneTier && capstoneTaken && !learned;
                        const canBuy = !learned && reqMet && player.talentPoints >= 1 && !lockedByCapstone;
                        return (
                          <button
                            key={node.id}
                            onClick={() => learnTalent(node)}
                            disabled={!canBuy}
                            className={`pixel-btn !p-2 disabled:opacity-40 ${learned ? "rarity-frame-uncommon" : ""} ${node.capstone && !learned ? "pixel-btn-gold" : ""}`}
                          >
                            <span className="block pixel text-[8px] text-gold">{node.capstone ? "★ " : ""}{node.name}</span>
                            <span className="block font-body text-xs opacity-80 mt-1 leading-tight">{node.desc}</span>
                            {learned && <span className="block pixel text-[7px] text-divine mt-1">✓ LEARNED</span>}
                            {!learned && !reqMet && <span className="block pixel text-[7px] text-blood mt-1">LOCKED</span>}
                            {lockedByCapstone && <span className="block pixel text-[7px] text-blood mt-1">CAPSTONE TAKEN</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <h3 className="pixel text-[10px] text-gold mt-2">✦ Trainer Quests</h3>
            <div className="space-y-2">
              {classQuests.map((def) => {
                const q = quests.find((x) => x.id === def.id);
                const have = (player.questItems[def.target.itemId] ?? 0) + (player.materials[def.target.itemId] ?? 0);
                const progress = q ? q.progress : 0;
                const ready = q?.completed && !q?.turnedIn;
                const done = q?.turnedIn;
                return (
                  <div key={def.id} className="border-2 border-black bg-card p-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="pixel text-[9px]">{def.name}</span>
                      <span className="pixel text-[8px] text-gold">{def.rewardGold}g · {def.rewardXp}xp</span>
                    </div>
                    <p className="font-body text-sm text-muted-foreground">{def.desc}</p>
                    <p className="font-body text-sm mt-1">
                      {def.target.label}: <span className="text-gold">{progress}/{def.target.count}</span>
                      {have > 0 && <span className="text-muted-foreground"> (carrying {have})</span>}
                    </p>
                    <div className="mt-2">
                      {done && <span className="pixel text-[8px] text-divine">✓ Completed</span>}
                      {!q && <button onClick={() => accept(def.id)} className="pixel-btn !text-[8px]">Accept</button>}
                      {q && ready && <button onClick={() => turnIn(def.id)} className="pixel-btn pixel-btn-gold !text-[8px]">Turn In</button>}
                      {q && !q.completed && <span className="pixel text-[8px] text-muted-foreground">Active</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
