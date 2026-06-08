import { useEffect } from "react";
import { useGame } from "@/game/store";
import { FACTIONS, TRAINERS, SPECS } from "@/game/data";
import { nextUnlock } from "@/game/meta";
import { playMusic } from "@/game/audio";
import { SettingsButton } from "@/game/Settings";
import cityImg from "@/assets/city.jpg";
import cityAlliesImg from "@/assets/city-allies.jpg";
import cityBrigadeImg from "@/assets/city-brigade.jpg";

export function CityScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const enter = useGame((s) => s.enterDungeon);
  const reset = useGame((s) => s.reset);
  const player = useGame((s) => s.player);
  const meta = useGame((s) => s.meta);
  const log = useGame((s) => s.log);
  const claimIdle = useGame((s) => s.claimIdleProfession);
  useEffect(() => { claimIdle(); }, [claimIdle]);
  useEffect(() => {
    playMusic(player.faction === "brigade" ? "city-brigade" : "city-kingdom");
  }, [player.faction]);
  const f = FACTIONS.find((x) => x.id === player.faction)!;
  const trainer = player.classId ? TRAINERS[player.classId] : null;
  const spec = player.specId ? SPECS.find((s) => s.id === player.specId) : null;
  const newGear = player.bag.length > 0;
  const firstRunDone = meta.hasCompletedFirstRun;
  const upNext = nextUnlock(meta.account.level);

  return (
    <div className="relative flex min-h-full flex-col">
      <div className="relative h-40 overflow-hidden border-b-2 border-black">
        <img src={player.faction === "allies" ? cityAlliesImg : player.faction === "brigade" ? cityBrigadeImg : cityImg} alt={f.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 vignette" />
        <div className="absolute inset-0 scanlines" />
        <div className="absolute left-2 top-2 flex items-center gap-2">
          <img src={f.sigil} alt={f.name} className="h-8 w-8 object-contain torch-flicker" />
          <p className="pixel text-[8px] text-shadow-pixel text-gold">{f.name}</p>
        </div>
        {player.isChampion && (
          <div className="absolute right-2 top-2 pixel text-[8px] text-shadow-pixel text-gold border border-gold px-1 py-0.5">★ CHAMPION</div>
        )}
        {!player.isChampion && (
          <div className="absolute right-2 top-2 z-10"><SettingsButton /></div>
        )}
        {spec && (
          <div className="absolute right-2 bottom-2 pixel text-[8px] text-shadow-pixel" style={{ color: spec.color }}>{spec.name}</div>
        )}
      </div>

      <div className="p-3 space-y-3">
        <Section title="▣ Character">
          <ActionTile title="Equipment" desc={newGear ? `New gear (${player.bag.length})` : "Manage gear."} icon="▩" onClick={() => setScreen("equipment")} badge={newGear ? "NEW" : undefined} />
          <ActionTile
            title={trainer ? trainer.name : "Trainer"}
            desc={player.level < 3 ? `Talents at Lv 3` : player.talentPoints > 0 ? `${player.talentPoints} point${player.talentPoints>1?"s":""}!` : spec ? `${spec.name}` : "Choose a spec."}
            icon="✦"
            onClick={() => setScreen("talents")}
            badge={player.talentPoints > 0 && player.level >= 3 ? String(player.talentPoints) : undefined}
          />
        </Section>

        <Section title="▣ City">
          <ActionTile title="Vendors" desc="Buy potions & gear." icon="⚒" onClick={() => setScreen("vendor")} />
          <ActionTile title="Quest Board" desc="Jobs for gold." icon="✦" onClick={() => setScreen("quests")} />
          <ActionTile title="Crafter's Row" desc="Professions." icon="⚒" onClick={() => setScreen("profession")} />
          <ActionTile title="Auction House" desc="Bid on relics." icon="⚖" onClick={() => setScreen("auction")} />
        </Section>

        <Section title="▣ Meta">
          <ActionTile title="Echo Tree" desc={`✦ ${meta.shards} shards`} icon="✦" onClick={() => setScreen("echo")} />
          <ActionTile title="Journal" desc={`Wanderer Lv ${meta.account.level}${upNext ? ` · ${upNext.label}` : " · MAX"}`} icon="▣" onClick={() => setScreen("journal")} />
          {firstRunDone ? (
            <ActionTile title="Cobalt Vault" desc="Cosmetics & heroes." icon="◆" onClick={() => setScreen("shop")} />
          ) : (
            <ActionTile title="Cobalt Vault" desc="After first descent." icon="◆" onClick={() => undefined} />
          )}
          {firstRunDone ? (
            <ActionTile title="Champion's Pass" desc={player.isChampion ? "Active." : "+50% XP & more."} icon="★" onClick={() => setScreen("champion")} accent={!player.isChampion} />
          ) : (
            <ActionTile title="Champion's Pass" desc="After first descent." icon="★" onClick={() => undefined} />
          )}
        </Section>

        <button onClick={enter} className="pixel-btn pixel-btn-primary w-full text-center !text-[12px] !py-4">▼ DESCEND DUNGEON</button>
      </div>

      <div className="mx-3 mt-2 mb-2 flex-1 overflow-hidden border-2 border-black bg-card/60 p-2">
        <p className="pixel text-[8px] text-muted-foreground mb-1">▣ Journal</p>
        <div className="font-body max-h-32 overflow-y-auto text-sm leading-tight text-muted-foreground">
          {log.slice().reverse().map((l, i) => <p key={i}>› {l}</p>)}
        </div>
      </div>

      <button onClick={reset} className="m-3 pixel-btn !text-[8px] text-center">← Abandon Run</button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="pixel text-[10px] text-gold mb-1.5">{title}</h2>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function ActionTile({ title, desc, icon, onClick, accent, badge }: { title: string; desc: string; icon: string; onClick: () => void; accent?: boolean; badge?: string }) {
  return (
    <button onClick={onClick} className={`pixel-btn flex items-center gap-2 !p-2 ${accent ? "pixel-btn-primary" : ""}`}>
      <span className="text-xl">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block pixel text-[8px] truncate">{title}</span>
        <span className="block font-body text-xs opacity-80 mt-0.5 truncate">{desc}</span>
      </span>
      {badge && <span className="pixel text-[7px] bg-gold text-black px-1 py-0.5 border border-black">{badge}</span>}
    </button>
  );
}
