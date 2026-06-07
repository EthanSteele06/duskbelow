import { useGame } from "@/game/store";

export function StatBar() {
  const p = useGame((s) => s.player);
  const hpPct = (p.hp / p.maxHp) * 100;
  const xpPct = (p.xp / (p.level * 25)) * 100;
  return (
    <div className="border-2 border-black bg-card/95 backdrop-blur px-3 py-2 text-foreground">
      <div className="flex items-center justify-between gap-2 text-[9px] pixel">
        <span className="text-gold">{p.name}</span>
        <span className="text-muted-foreground">Lv {p.level}</span>
        <span className="text-gold">{p.gold}g</span>
      </div>
      <div className="mt-1.5 h-2 w-full bg-stone border border-black">
        <div className="h-full bg-blood transition-all" style={{ width: `${hpPct}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] font-body">
        <span>HP {p.hp}/{p.maxHp}</span>
        <span>ATK {p.atk} · MAG {p.mag}</span>
      </div>
      {p.level < 10 && (
        <div className="mt-1 h-1 w-full bg-stone border border-black">
          <div className="h-full bg-gold" style={{ width: `${xpPct}%` }} />
        </div>
      )}
    </div>
  );
}
