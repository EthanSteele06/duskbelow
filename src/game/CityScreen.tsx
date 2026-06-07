import { useGame } from "@/game/store";
import { FACTIONS, TRAINERS } from "@/game/data";
import { StatBar } from "./StatBar";
import cityImg from "@/assets/city.jpg";

export function CityScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const enter = useGame((s) => s.enterDungeon);
  const reset = useGame((s) => s.reset);
  const faction = useGame((s) => s.player.faction);
  const classId = useGame((s) => s.player.classId);
  const level = useGame((s) => s.player.level);
  const skillPoints = useGame((s) => s.player.skillPoints);
  const log = useGame((s) => s.log);
  const f = FACTIONS.find((x) => x.id === faction)!;
  const trainer = classId ? TRAINERS[classId] : null;

  return (
    <div className="relative flex min-h-full flex-col">
      <div className="relative h-56 overflow-hidden border-b-2 border-black">
        <img src={cityImg} alt="City" className="h-full w-full object-cover" />
        <div className="absolute inset-0 vignette" />
        <div className="absolute inset-0 scanlines" />
        <div className="absolute left-2 top-2 flex items-center gap-2">
          <img src={f.sigil} alt={f.name} className="h-8 w-8 object-contain torch-flicker" />
          <p className="pixel text-[8px] text-shadow-pixel text-gold">{f.name}</p>
        </div>
      </div>

      <div className="p-3">
        <StatBar />
      </div>

      <div className="px-3">
        <h2 className="pixel text-[10px] text-gold mb-2">▣ Hub</h2>
        <div className="grid grid-cols-1 gap-2">
          <ActionTile title="Vendors" desc="Buy potions and gear." icon="⚒" onClick={() => setScreen("vendor")} />
          <ActionTile title="Quest Board" desc="Take on jobs for gold." icon="✦" onClick={() => setScreen("quests")} />
          <ActionTile
            title={trainer ? trainer.name : "Trainer"}
            desc={level < 3 ? `Class trainer — unlocks at Lv 3 (Lv ${level})` : skillPoints > 0 ? `${skillPoints} skill point${skillPoints>1?"s":""} to spend!` : "Spend skill points & class quests."}
            icon="✦"
            onClick={() => setScreen("trainer")}
            badge={skillPoints > 0 && level >= 3 ? String(skillPoints) : undefined}
          />
          <ActionTile title="Crafter's Row" desc="Professions & recipes." icon="⚒" onClick={() => setScreen("profession")} />
          <ActionTile title="Auction House" desc="Bid on rare relics." icon="⚖" onClick={() => setScreen("auction")} />
          <ActionTile title="Descend Dungeon" desc="Brave the depths." icon="▼" onClick={enter} accent />
        </div>
      </div>

      <div className="mx-3 mt-4 flex-1 overflow-hidden border-2 border-black bg-card/60 p-2">
        <p className="pixel text-[8px] text-muted-foreground mb-1">▣ Journal</p>
        <div className="font-body max-h-40 overflow-y-auto text-sm leading-tight text-muted-foreground">
          {log.slice().reverse().map((l, i) => <p key={i}>› {l}</p>)}
        </div>
      </div>

      <button onClick={reset} className="m-3 pixel-btn !text-[8px] text-center">← Abandon Run</button>
    </div>
  );
}

function ActionTile({ title, desc, icon, onClick, accent, badge }: { title: string; desc: string; icon: string; onClick: () => void; accent?: boolean; badge?: string }) {
  return (
    <button onClick={onClick} className={`pixel-btn flex items-center gap-3 ${accent ? "pixel-btn-primary" : ""}`}>
      <span className="text-2xl">{icon}</span>
      <span className="flex-1">
        <span className="block pixel text-[9px]">{title}</span>
        <span className="block font-body text-sm opacity-80 mt-1">{desc}</span>
      </span>
      {badge && <span className="pixel text-[8px] bg-gold text-black px-1.5 py-1 border border-black">{badge}</span>}
      <span className="pixel text-[10px]">›</span>
    </button>
  );
}
