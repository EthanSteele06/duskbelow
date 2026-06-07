import { useGame } from "@/game/store";
import { TRAINERS, QUESTS } from "@/game/data";
import { StatBar } from "./StatBar";

export function TrainerScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const player = useGame((s) => s.player);
  const quests = useGame((s) => s.quests);
  const learnSkill = useGame((s) => s.learnSkill);
  const accept = useGame((s) => s.acceptQuest);
  const turnIn = useGame((s) => s.turnInQuest);

  if (!player.classId) return null;
  const t = TRAINERS[player.classId];
  const classQuests = QUESTS.filter((q) => q.classId === player.classId);
  const locked = player.level < 3;

  return (
    <div className="flex min-h-full flex-col">
      <div className="relative h-56 overflow-hidden border-b-2 border-black">
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
        ) : (
          <>
            <div className="border-2 border-black bg-card p-3">
              <p className="font-body text-base leading-snug">"{t.greeting}"</p>
              <p className="pixel text-[9px] text-gold mt-2">Skill Points: {player.skillPoints}</p>
            </div>

            <h3 className="pixel text-[10px] text-gold">✦ Skill Tree</h3>
            <div className="space-y-2">
              {t.skills.map((node) => {
                const learned = player.learnedSkills.includes(node.id);
                const reqMet = !node.requires || player.learnedSkills.includes(node.requires);
                const canBuy = !learned && reqMet && player.skillPoints >= node.cost;
                return (
                  <div key={node.id} className="border-2 border-black bg-card p-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="pixel text-[9px] text-foreground">{node.name}</span>
                      <span className="pixel text-[8px] text-gold">{node.cost} pt</span>
                    </div>
                    <p className="font-body text-sm text-muted-foreground">{node.desc}</p>
                    {node.requires && (
                      <p className="font-body text-xs text-muted-foreground mt-1">
                        Requires: {t.skills.find((s) => s.id === node.requires)?.name}
                      </p>
                    )}
                    <div className="mt-2">
                      {learned ? (
                        <span className="pixel text-[8px] text-divine">✓ Learned</span>
                      ) : (
                        <button
                          onClick={() => learnSkill(node)}
                          disabled={!canBuy}
                          className="pixel-btn pixel-btn-gold !text-[8px] disabled:opacity-40"
                        >
                          Learn
                        </button>
                      )}
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
