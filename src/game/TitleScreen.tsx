import { useState } from "react";
import { useGame } from "@/game/store";
import { CLASSES, FACTIONS, type ClassId, type FactionId } from "@/game/data";
import { nextUnlock, unlockedClassesFor } from "@/game/meta";
import titleBg from "@/assets/title-bg.jpg";

export function TitleScreen() {
  const start = useGame((s) => s.startGame);
  const setScreen = useGame((s) => s.setScreen);
  const meta = useGame((s) => s.meta);
  const [faction, setFaction] = useState<FactionId | null>(null);
  const [classId, setClassId] = useState<ClassId | null>(null);
  const [name, setName] = useState("");

  const leveledUnlocks = new Set(unlockedClassesFor(meta.account.level, meta.unlockedClasses));
  const owned = new Set(meta.ownedClasses);
  const isAvailable = (id: ClassId) => leveledUnlocks.has(id) || owned.has(id);
  const up = nextUnlock(meta.account.level);
  const ready = faction && classId && isAvailable(classId);


  return (
    <div className="relative min-h-full overflow-hidden">
      <img
        src={titleBg}
        alt="Dungeon gate"
        className="absolute inset-0 h-full w-full object-cover opacity-70"
      />
      <div className="absolute inset-0 vignette" />
      <div className="absolute inset-0 scanlines" />

      <div className="relative z-10 flex min-h-full flex-col px-4 py-6">
        <header className="text-center fade-in-up">
          <p className="pixel text-[10px] text-muted-foreground">A Mobile Dungeon Crawler</p>
          <h1 className="pixel text-shadow-pixel mt-2 text-2xl leading-tight text-gold">
            DUSK<br/>BELOW
          </h1>
          <p className="font-body mt-2 text-base text-muted-foreground">
            Choose your banner. Carve your fate.
          </p>
          <p className="pixel mt-3 text-[8px] text-gold">
            ✦ Wanderer Lv {meta.account.level}{up ? ` · next: ${up.label}` : " · MAX"}
          </p>
        </header>


        <section className="mt-6 fade-in-up">
          <h2 className="pixel text-[10px] text-foreground mb-2">▣ Faction</h2>
          <div className="grid grid-cols-2 gap-2">
            {FACTIONS.map((f) => {
              const sel = faction === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFaction(f.id)}
                  className={`pixel-btn flex flex-col items-center gap-2 !p-2 ${sel ? "!bg-blood" : ""}`}
                  style={sel ? { boxShadow: `inset 0 0 0 2px ${f.color}, inset -3px -3px 0 0 rgba(0,0,0,0.5)` } : undefined}
                >
                  <img src={f.sigil} alt={f.name} className="h-16 w-16 object-contain" />
                  <span className="pixel text-[8px] leading-tight text-center">{f.name}</span>
                </button>
              );
            })}
          </div>
          {faction && (
            <p className="font-body mt-2 text-sm italic text-muted-foreground">
              "{FACTIONS.find((f) => f.id === faction)!.motto}"
            </p>
          )}
        </section>

        <section className="mt-5 fade-in-up">
          <h2 className="pixel text-[10px] text-foreground mb-2">▣ Class</h2>
          <div className="grid grid-cols-4 gap-1.5">
            {CLASSES.map((c) => {
              const sel = classId === c.id;
              const isLocked = !unlocked.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => !isLocked && setClassId(c.id)}
                  disabled={isLocked}
                  className={`pixel-btn !p-1 flex flex-col items-center ${isLocked ? "opacity-40" : ""}`}
                  style={sel ? { boxShadow: `inset 0 0 0 2px ${c.color}, inset -3px -3px 0 0 rgba(0,0,0,0.5)` } : undefined}
                >
                  <img src={c.portrait} alt={c.name} className="h-14 w-full object-cover border border-black" />
                  <span className="pixel text-[7px] mt-1">{isLocked ? "🔒" : c.name}</span>
                </button>
              );
            })}

          </div>
          {classId && (
            <div className="mt-2 border-2 border-black bg-card/80 p-2">
              <p className="pixel text-[9px] text-gold">{CLASSES.find(c=>c.id===classId)!.name}</p>
              <p className="font-body text-sm text-muted-foreground">{CLASSES.find(c=>c.id===classId)!.tagline}</p>
              <p className="font-body text-sm mt-1">
                HP {CLASSES.find(c=>c.id===classId)!.hp} · ATK {CLASSES.find(c=>c.id===classId)!.atk} · MAG {CLASSES.find(c=>c.id===classId)!.mag}
              </p>
            </div>
          )}
        </section>

        <section className="mt-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 16))}
            placeholder="Enter name..."
            className="w-full border-2 border-black bg-input px-3 py-2 font-body text-base text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-gold"
          />
        </section>

        <button
          disabled={!ready}
          onClick={() => start(faction!, classId!, name || "Wanderer")}
          className="pixel-btn pixel-btn-primary mt-4 w-full text-center disabled:opacity-40"
        >
          ▶ DESCEND
        </button>
      </div>
    </div>
  );
}
