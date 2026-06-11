import { useGame } from "@/game/store";
import { buildIntro, CLASSES, FACTIONS } from "@/game/data";
import titleBg from "@/assets/title-bg.jpg";

export function IntroScreen() {
  const p = useGame((s) => s.player);
  const setScreen = useGame((s) => s.setScreen);
  const enterDungeon = useGame((s) => s.enterDungeon);
  if (!p.faction || !p.classId) return null;
  const f = FACTIONS.find((x) => x.id === p.faction)!;
  const c = CLASSES.find((x) => x.id === p.classId)!;
  const lines = buildIntro(p.faction, p.classId, p.name);

  return (
    <div className="relative min-h-full overflow-hidden">
      <img src={titleBg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 vignette" />
      <div className="absolute inset-0 scanlines" />

      <div className="relative z-10 flex min-h-full flex-col px-5 py-8 gap-4">
        <div className="flex items-center gap-3 fade-in-up">
          <img src={f.sigil} alt={f.name} className="h-14 w-14 object-contain torch-flicker" />
          <div>
            <p className="pixel text-[8px] text-muted-foreground">House</p>
            <p className="pixel text-[10px] text-gold text-shadow-pixel">{f.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 fade-in-up">
          <img src={c.portrait} alt={c.name} className="h-14 w-14 object-cover border-2 border-black" />
          <div>
            <p className="pixel text-[8px] text-muted-foreground">Calling</p>
            <p className="pixel text-[10px] text-gold text-shadow-pixel">{c.name}</p>
          </div>
        </div>

        <div className="mt-2 space-y-3">
          {lines.map((l, i) => (
            <p key={i} className="font-body text-base leading-snug text-foreground fade-in-up" style={{ animationDelay: `${i * 250}ms` }}>
              {l}
            </p>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <button onClick={() => setScreen("city")} className="pixel-btn pixel-btn-primary text-center">▶ Enter the City</button>
          <button onClick={() => enterDungeon()} className="pixel-btn text-center">⚔ Straight to the Dungeon</button>
        </div>
      </div>
    </div>
  );
}
