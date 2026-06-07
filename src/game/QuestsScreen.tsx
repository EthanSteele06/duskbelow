import { useGame } from "@/game/store";
import { QUESTS } from "@/game/data";
import { StatBar } from "./StatBar";

export function QuestsScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const quests = useGame((s) => s.quests);
  const accept = useGame((s) => s.acceptQuest);
  const turnIn = useGame((s) => s.turnInQuest);
  const items = useGame((s) => s.player.questItems);

  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <StatBar />
      <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>
      <h2 className="pixel text-[12px] text-gold">✦ Quest Board</h2>
      <p className="font-body text-sm text-muted-foreground -mt-2">Posted requests from the city's desperate.</p>

      <div className="space-y-2">
        {QUESTS.map((def) => {
          const q = quests.find((x) => x.id === def.id);
          const have = items[def.target.itemId] ?? 0;
          const progress = q ? q.progress : 0;
          const ready = q?.completed && !q?.turnedIn;
          const done = q?.turnedIn;
          return (
            <div key={def.id} className="border-2 border-black bg-card p-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="pixel text-[9px] text-foreground">{def.name}</span>
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
                {q && !q.turnedIn && ready && (
                  <button onClick={() => turnIn(def.id)} className="pixel-btn pixel-btn-gold !text-[8px]">Turn In</button>
                )}
                {q && !q.completed && <span className="pixel text-[8px] text-muted-foreground">Active</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
