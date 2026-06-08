import { useGame } from "@/game/store";
import { LORE_FRAGMENTS } from "@/game/meta";
import { ENEMIES } from "@/game/data";

export function JournalScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const meta = useGame((s) => s.meta);
  const j = meta.journal;

  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>
      <h1 className="pixel text-[14px] text-gold">▣ Dungeon Journal</h1>

      <div className="border-2 border-black bg-card p-2 text-sm font-body grid grid-cols-2 gap-1">
        <div>Runs completed</div><div className="text-right">{j.runsCompleted}</div>
        <div>Deepest floor</div><div className="text-right text-gold">{j.deepestFloor}</div>
        {j.bestRun && (<><div>Best run kills</div><div className="text-right">{j.bestRun.kills}</div></>)}
      </div>

      <h2 className="pixel text-[10px] text-gold">Bestiary</h2>
      <div className="border-2 border-black bg-card p-2 space-y-1">
        {Object.entries(ENEMIES).map(([id, e]) => {
          const kills = j.enemyKills[id] ?? 0;
          return (
            <div key={id} className="flex items-center justify-between font-body text-sm">
              <span className={kills > 0 ? "text-foreground" : "text-muted-foreground opacity-60"}>
                {kills > 0 ? e.name : "???"}
              </span>
              <span className="pixel text-[8px] text-gold">{kills} slain</span>
            </div>
          );
        })}
      </div>

      <h2 className="pixel text-[10px] text-gold">Lore Fragments ({j.loreFound.length}/{LORE_FRAGMENTS.length})</h2>
      <div className="space-y-2">
        {LORE_FRAGMENTS.map((l) => {
          const found = j.loreFound.includes(l.id);
          return (
            <div key={l.id} className={`border-2 border-black p-2 ${found ? "bg-card" : "bg-card/40"}`}>
              <p className="pixel text-[9px] text-gold">{found ? l.title : "— Sealed —"}</p>
              <p className="font-body text-xs italic text-muted-foreground mt-1 leading-snug">
                {found ? `"${l.text}"` : "Defeat the right foe and the page may turn."}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
