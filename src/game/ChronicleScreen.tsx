import { useMemo, useState } from "react";
import { useGame } from "@/game/store";
import { QUESTS, STORYLINES } from "@/game/data";
import { StatBar } from "./StatBar";

export function ChronicleScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const storyId = useGame((s) => s.chronicleStoryId);
  const quests = useGame((s) => s.quests);

  const story = STORYLINES.find((s) => s.id === storyId);
  const stages = useMemo(
    () => QUESTS.filter((q) => q.storyId === storyId).sort((a, b) => (a.storyStep ?? 0) - (b.storyStep ?? 0)),
    [storyId],
  );

  // Determine current step: first stage not yet turned in.
  const currentIdx = Math.max(0, stages.findIndex((s) => {
    const q = quests.find((x) => x.id === s.id);
    return !q || !q.turnedIn;
  }));
  const allDone = stages.length > 0 && currentIdx === -1;
  const activeStage = allDone ? null : stages[currentIdx];
  const activeQ = activeStage ? quests.find((x) => x.id === activeStage.id) : undefined;

  // Pick dialogue: intro before first step, "before" on active, "after" on just-turned-in, "outro" once all done.
  const dialogue = useMemo(() => {
    if (!story) return [] as string[];
    if (allDone) return [story.npc?.outro ?? "It is done."];
    if (!activeStage) return [story.npc?.intro ?? ""];
    // If active stage's previous step was turned in, show its "after" first then the new "before".
    const prev = currentIdx > 0 ? stages[currentIdx - 1] : null;
    const prevQ = prev ? quests.find((x) => x.id === prev.id) : null;
    const showPrevAfter = prev && prevQ?.turnedIn && !activeQ;
    const pages: string[] = [];
    if (currentIdx === 0 && !activeQ && story.npc?.intro) pages.push(story.npc.intro);
    if (showPrevAfter && prev?.dialogue?.after) pages.push(...prev.dialogue.after);
    if (activeStage.dialogue?.before) pages.push(...activeStage.dialogue.before);
    if (activeQ?.completed && !activeQ.turnedIn && activeStage.dialogue?.after) {
      pages.push(...activeStage.dialogue.after);
    }
    return pages.length > 0 ? pages : [story.npc?.intro ?? ""];
  }, [story, stages, activeStage, activeQ, currentIdx, allDone, quests]);

  const [page, setPage] = useState(0);
  const accept = useGame((s) => s.acceptQuest);
  const turnIn = useGame((s) => s.turnInQuest);

  if (!story) {
    return (
      <div className="p-4">
        <button onClick={() => setScreen("quests")} className="pixel-btn !text-[8px]">← Back</button>
        <p className="font-body text-sm mt-3">No chronicle selected.</p>
      </div>
    );
  }

  const npc = story.npc;
  const safePage = Math.min(page, Math.max(0, dialogue.length - 1));
  const atEnd = safePage >= dialogue.length - 1;

  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <StatBar />
      <button onClick={() => setScreen("quests")} className="pixel-btn !text-[8px] w-fit">← Back to Board</button>

      <header className="border-2 border-black bg-card p-3">
        <h2 className="pixel text-[12px] text-gold">{story.name}</h2>
        <p className="font-body text-xs italic text-muted-foreground mt-1">{story.lore}</p>
      </header>

      {npc && (
        <div className="border-2 border-black bg-card/80 p-3 flex gap-3">
          <img src={npc.portrait} alt={npc.name} className="w-20 h-20 border border-black object-cover pixelated" style={{ imageRendering: "pixelated" }} />
          <div className="flex-1 min-w-0">
            <p className="pixel text-[10px] text-gold">{npc.name}</p>
            <p className="pixel text-[8px] text-muted-foreground">{npc.title}</p>
            <div className="mt-2 border border-black/30 bg-background/40 p-2 min-h-[88px]">
              <p className="font-body text-sm leading-snug whitespace-pre-line">"{dialogue[safePage]}"</p>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="pixel text-[8px] text-muted-foreground">{safePage + 1} / {dialogue.length}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(Math.max(0, safePage - 1))}
                  disabled={safePage === 0}
                  className="pixel-btn !text-[8px] disabled:opacity-40"
                >◀ Prev</button>
                <button
                  onClick={() => setPage(Math.min(dialogue.length - 1, safePage + 1))}
                  disabled={atEnd}
                  className="pixel-btn !text-[8px] disabled:opacity-40"
                >Next ▶</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeStage && atEnd && (
        <div className="border-2 border-black bg-card p-3 space-y-2">
          <p className="pixel text-[10px] text-gold">Chapter {activeStage.storyStep}: {activeStage.name}</p>
          <p className="font-body text-sm text-muted-foreground">{activeStage.desc}</p>
          {!activeQ && (
            <button onClick={() => accept(activeStage.id)} className="pixel-btn pixel-btn-gold !text-[9px] w-full">Accept the Pact</button>
          )}
          {activeQ && !activeQ.completed && (
            <p className="pixel text-[8px] text-muted-foreground">Progress: {activeQ.progress}/{activeStage.target.count}</p>
          )}
          {activeQ?.completed && !activeQ.turnedIn && (
            <button onClick={() => turnIn(activeStage.id)} className="pixel-btn pixel-btn-gold !text-[9px] w-full">
              Turn In{activeStage.unlocksClass ? " · Unlock Class" : ""}
            </button>
          )}
        </div>
      )}

      {allDone && (
        <div className="border-2 border-gold bg-gold/10 p-3 text-center">
          <p className="pixel text-[10px] text-gold">✦ Chronicle Complete</p>
        </div>
      )}
    </div>
  );
}
