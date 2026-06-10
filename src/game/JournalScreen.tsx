import { useGame } from "@/game/store";
import { LORE_FRAGMENTS } from "@/game/meta";
import { ENEMIES } from "@/game/data";

function tierFor(kills: number) {
  if (kills >= 25) return 3;
  if (kills >= 10) return 2;
  if (kills >= 3) return 1;
  if (kills >= 1) return 0;
  return -1;
}

const TIER_BADGE: Record<number, string> = {
  3: "MASTERED",
  2: "STUDIED",
  1: "OBSERVED",
  0: "SIGHTED",
};

export function JournalScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const meta = useGame((s) => s.meta);
  const j = meta.journal;

  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <button onClick={() => setScreen("wanderer")} className="pixel-btn !text-[8px] w-fit">← Back to Wanderer</button>
      <h1 className="pixel text-[14px] text-gold">▣ Bestiary & Lore</h1>
      <p className="font-body text-xs text-muted-foreground -mt-2">
        Slay an enemy three times to learn their wounds. Ten to read their tells. Twenty-five to master them.
      </p>

      <h2 className="pixel text-[10px] text-gold">Bestiary</h2>
      <div className="border-2 border-black bg-card p-2 space-y-2">
        {Object.entries(ENEMIES).map(([id, e]) => {
          const kills = j.enemyKills[id] ?? 0;
          const tier = tierFor(kills);
          const unseen = tier < 0;
          return (
            <div key={id} className="border-b border-black/40 last:border-0 pb-1.5 last:pb-0">
              <div className="flex items-baseline justify-between">
                <span className={`pixel text-[9px] ${unseen ? "text-muted-foreground opacity-60" : "text-foreground"}`}>
                  {unseen ? "???" : e.name}
                </span>
                <span className="pixel text-[7px] text-gold">{kills} slain{tier >= 0 ? ` · ${TIER_BADGE[tier]}` : ""}</span>
              </div>
              {tier >= 1 && (
                <p className="font-body text-xs text-muted-foreground mt-0.5">
                  HP ≈ {e.hpBase} · ATK ≈ {e.atkBase}
                </p>
              )}
              {tier >= 2 && (
                <p className="font-body text-[11px] text-allies mt-0.5 leading-tight">
                  Tells: {e.intents.map((i) => i.label).join(" · ")}
                </p>
              )}
              {tier >= 3 && (
                <p className="pixel text-[7px] text-divine mt-1">✦ Mastery — +5% damage vs {e.name}</p>
              )}
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
