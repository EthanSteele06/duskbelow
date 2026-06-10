import { useGame } from "@/game/store";
import { QUESTS, STORYLINES, MAX_ACTIVE_QUESTS } from "@/game/data";
import { StatBar } from "./StatBar";

export function QuestsScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const openChronicle = useGame((s) => s.openChronicle);
  const quests = useGame((s) => s.quests);
  const accept = useGame((s) => s.acceptQuest);
  const turnIn = useGame((s) => s.turnInQuest);
  const turnInAll = useGame((s) => s.turnInAllReady);
  const items = useGame((s) => s.player.questItems);
  const mats = useGame((s) => s.player.materials);
  const activeCount = quests.filter((q) => !q.turnedIn).length;
  const atCap = activeCount >= MAX_ACTIVE_QUESTS;
  const readyCount = quests.filter((q) => q.completed && !q.turnedIn).length;

  const isUnlocked = (chainFrom?: string) => {
    if (!chainFrom) return true;
    const prev = quests.find((x) => x.id === chainFrom);
    return !!prev?.turnedIn;
  };

  const renderQuest = (defId: string) => {
    const def = QUESTS.find((d) => d.id === defId);
    if (!def) return null;
    if (!isUnlocked(def.chainFrom)) {
      return (
        <div key={def.id} className="border-2 border-black bg-card/40 p-2 opacity-60">
          <span className="pixel text-[9px]">— Sealed —</span>
          <p className="font-body text-sm text-muted-foreground">Complete the previous step to unlock.</p>
        </div>
      );
    }
    const q = quests.find((x) => x.id === def.id);
    const have = (items[def.target.itemId] ?? 0) + (mats[def.target.itemId] ?? 0);
    const progress = q ? q.progress : 0;
    const ready = q?.completed && !q?.turnedIn;
    const done = q?.turnedIn;
    return (
      <div key={def.id} className="border-2 border-black bg-card p-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="pixel text-[9px] text-foreground">{def.name}{def.storyStep ? ` · Step ${def.storyStep}` : ""}</span>
          <span className="pixel text-[8px] text-gold">{def.rewardGold}g · {def.rewardXp}xp</span>
        </div>
        <p className="font-body text-sm text-muted-foreground">{def.desc}</p>
        <p className="font-body text-sm mt-1">
          {def.target.label}: <span className="text-gold">{progress}/{def.target.count}</span>
          {have > 0 && <span className="text-muted-foreground"> (carrying {have})</span>}
        </p>
        <div className="mt-2">
          {done && <span className="pixel text-[8px] text-divine">✓ Completed</span>}
          {!q && <button onClick={() => accept(def.id)} disabled={atCap} className="pixel-btn !text-[8px] disabled:opacity-40">{atCap ? "Log full" : "Accept"}</button>}
          {q && !q.turnedIn && ready && (
            <button onClick={() => turnIn(def.id)} className="pixel-btn pixel-btn-gold !text-[8px]">Turn In{def.unlocksClass ? " · Unlock Class" : ""}</button>
          )}
          {q && !q.completed && <span className="pixel text-[8px] text-muted-foreground">Active</span>}
        </div>
      </div>
    );
  };

  const bounties = QUESTS.filter((q) => !q.storyId);

  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <StatBar />
      <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>
      <div className="flex items-center justify-between gap-2">
        <h2 className="pixel text-[12px] text-gold">✦ Quest Board</h2>
        {readyCount > 0 && (
          <button onClick={turnInAll} className="pixel-btn pixel-btn-gold !text-[8px]">⇪ Turn in all ({readyCount})</button>
        )}
      </div>
      <p className="font-body text-sm text-muted-foreground -mt-2">
        Posted requests from the city's desperate. <span className={atCap ? "text-blood" : "text-gold"}>Active {activeCount}/{MAX_ACTIVE_QUESTS}</span>
      </p>

      <div className="space-y-2">{bounties.map((d) => renderQuest(d.id))}</div>

      <h2 className="pixel text-[12px] text-gold mt-2">▣ Chronicles</h2>
      <p className="font-body text-sm text-muted-foreground -mt-2">Story arcs that weave the dungeon's deeper lore — and sometimes open new paths entirely.</p>
      {STORYLINES.map((s) => {
        const stages = QUESTS.filter((q) => q.storyId === s.id).sort((a, b) => (a.storyStep ?? 0) - (b.storyStep ?? 0));
        if (stages.length === 0) {
          return (
            <div key={s.id} className="border-2 border-black bg-card/40 p-2 opacity-60">
              <p className="pixel text-[9px] text-gold">{s.name}</p>
              <p className="font-body text-xs italic text-muted-foreground mt-1">{s.lore}</p>
              <p className="font-body text-xs text-muted-foreground mt-1">— No chapters yet. The scribes are still writing. —</p>
            </div>
          );
        }
        return (
          <div key={s.id} className="border-2 border-black bg-card/70 p-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="pixel text-[9px] text-gold">{s.name}</p>
              {s.npc && (
                <button onClick={() => openChronicle(s.id)} className="pixel-btn !text-[8px]">
                  ☥ Speak with {s.npc.name.split(" ")[0]}
                </button>
              )}
            </div>
            <p className="font-body text-xs italic text-muted-foreground">{s.lore}</p>
            {stages.map((st) => renderQuest(st.id))}
          </div>
        );
      })}
    </div>
  );
}
