import { useEffect, useMemo, useState } from "react";
import { buildDescentFlavor, FACTIONS, CLASSES, type ClassId, type FactionId, type OathId, type DungeonMode } from "@/game/data";
import { dungeonBgForDepth } from "@/game/data";

interface Props {
  faction: FactionId | null;
  classId: ClassId | null;
  name: string;
  mode: DungeonMode;
  depth: number;
  oaths: OathId[];
  onComplete: () => void;
}

const DURATION_MS = 2800;
const LINE_CYCLE_MS = 1400;

export function DungeonDescentOverlay({ faction, classId, name, mode, depth, oaths, onComplete }: Props) {
  const flavor = useMemo(
    () => buildDescentFlavor({ faction, classId, name, mode, depth, oaths }),
    [faction, classId, name, mode, depth, oaths],
  );
  const [lineIdx, setLineIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  const f = faction ? FACTIONS.find((x) => x.id === faction) : null;
  const c = classId ? CLASSES.find((x) => x.id === classId) : null;
  const bg = dungeonBgForDepth(depth);

  useEffect(() => {
    const start = Date.now();
    const tick = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / DURATION_MS) * 100);
      setProgress(pct);
    }, 50);
    const cycle = window.setInterval(() => {
      setLineIdx((i) => (i + 1) % flavor.lines.length);
    }, LINE_CYCLE_MS);
    const done = window.setTimeout(onComplete, DURATION_MS);
    return () => {
      clearInterval(tick);
      clearInterval(cycle);
      clearTimeout(done);
    };
  }, [flavor.lines.length, onComplete]);

  const line = flavor.lines[lineIdx] ?? flavor.lines[0];

  return (
    <div className="descent-overlay fixed inset-0 z-[60] flex flex-col bg-black">
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
      <div className="absolute inset-0 vignette" />
      <div className="absolute inset-0 scanlines opacity-60" />
      <div className="absolute inset-0 bg-black/88" />

      <div className="relative z-10 flex min-h-full flex-col items-center justify-center p-6 text-center gap-5">
        {f && (
          <img src={f.sigil} alt="" className="h-16 w-16 object-contain torch-flicker descent-fade-in" />
        )}
        <div className="space-y-2 descent-fade-in" style={{ animationDelay: "120ms" }}>
          <p className="pixel text-[10px] text-muted-foreground">Entering the dungeon</p>
          <h2 className="pixel text-shadow-pixel text-xl text-gold">{flavor.title}</h2>
        </div>

        {c && (
          <img
            src={c.portrait}
            alt=""
            className="h-20 w-20 border-2 border-black object-cover descent-fade-in"
            style={{ animationDelay: "240ms" }}
          />
        )}

        <p
          key={lineIdx}
          className="font-body text-base italic leading-snug text-foreground max-w-xs descent-line-swap"
        >
          "{line}"
        </p>

        <div className="w-full max-w-xs descent-fade-in" style={{ animationDelay: "360ms" }}>
          <div className="h-2 w-full border-2 border-black bg-stone/80">
            <div
              className="h-full bg-gold transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="pixel text-[7px] text-muted-foreground mt-2">The dark takes its measure…</p>
        </div>
      </div>
    </div>
  );
}
