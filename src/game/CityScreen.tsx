import { useEffect, useState } from "react";
import { useGame } from "@/game/store";
import { FACTIONS, TRAINERS, SPECS, OATHS, DAILY_CONTRACTS, type OathId } from "@/game/data";
import { nextUnlock } from "@/game/meta";
import { playMusic } from "@/game/audio";
import { SettingsButton } from "@/game/Settings";
import { TutorialTip } from "@/game/Tutorial";
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
  const ensureDaily = useGame((s) => s.ensureDailyRoll);
  const ensureRelics = useGame((s) => s.ensureRelicRoll);
  useEffect(() => { claimIdle(); ensureDaily(); ensureRelics(); }, [claimIdle, ensureDaily, ensureRelics]);
  useEffect(() => {
    playMusic(player.faction === "brigade" ? "city-brigade" : "city-kingdom");
  }, [player.faction]);

  const f = FACTIONS.find((x) => x.id === player.faction)!;
  const trainer = player.classId ? TRAINERS[player.classId] : null;
  const spec = player.specId ? SPECS.find((s) => s.id === player.specId) : null;
  const newGear = player.bag.length > 0;
  const firstRunDone = meta.hasCompletedFirstRun;
  const upNext = nextUnlock(meta.account.level);

  const dc = meta.dailyContract;
  const dcDef = dc ? DAILY_CONTRACTS.find((c) => c.id === dc.defId) : null;
  const dcNeed =
    dcDef?.objective.kind === "kill_enemy" ? dcDef.objective.count :
    dcDef?.objective.kind === "kill_boss" ? dcDef.objective.count :
    dcDef?.objective.kind === "turn_in_material" ? dcDef.objective.count :
    dcDef?.objective.kind === "reach_floor" ? 1 : 1;
  const dcReady = dc && dc.accepted && !dc.claimed && dc.progress >= dcNeed;
  const dcDesc = dcDef
    ? dc?.claimed ? "Claimed — back tomorrow." : dcReady ? "Reward ready!" : dc?.accepted ? `${dc.progress}/${dcNeed} progress` : "New work posted."
    : "Check the board.";

  const [oathModal, setOathModal] = useState<null | "normal" | "cursed">(null);
  const [chosenOaths, setChosenOaths] = useState<OathId[]>([]);
  const toggleOath = (id: OathId) =>
    setChosenOaths((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const beginDescent = () => {
    if (!oathModal) return;
    enter(oathModal, chosenOaths);
    setOathModal(null);
    setChosenOaths([]);
  };

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
        <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
          {player.isChampion && (
            <div className="pixel text-[8px] text-shadow-pixel text-gold border border-gold px-1 py-0.5">★ CHAMPION</div>
          )}
          <SettingsButton />
        </div>
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
          <ActionTile title="Rotating Relics" desc="Three relics, daily." icon="⚖" onClick={() => setScreen("auction")} />
          <ActionTile
            title="Contract Board"
            desc={dcDesc}
            icon="▣"
            onClick={() => setScreen("daily")}
            badge={dcReady ? "✦" : !dc?.accepted && dcDef ? "NEW" : undefined}
            accent={!!dcReady}
          />
          <ActionTile title="Auction House" desc="Bid on relics (soon)." icon="⚖" onClick={() => setScreen("auction_house")} />
        </Section>

        <Section title="▣ Meta">
          <ActionTile title="Echo Tree" desc={`✦ ${meta.shards} shards`} icon="✦" onClick={() => setScreen("echo")} />
          <ActionTile title="The Wanderer" desc={`Lv ${meta.account.level}${upNext ? ` · ${upNext.label}` : " · MAX"}`} icon="☥" onClick={() => setScreen("wanderer")} />
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

        <button
          onClick={() => { setChosenOaths([]); setOathModal("normal"); }}
          className="pixel-btn pixel-btn-primary w-full text-center !text-[12px] !py-4"
        >▼ DESCEND DUNGEON</button>
        {meta.hasClearedNormal && (
          <button
            onClick={() => { setChosenOaths([]); setOathModal("cursed"); }}
            className="pixel-btn pixel-btn-danger w-full text-center !text-[10px] !py-3"
          >☠ DESCEND CURSED DEPTHS (Hard)</button>
        )}
      </div>

      <div className="mx-3 mt-2 mb-2 flex-1 overflow-hidden border-2 border-black bg-card/60 p-2">
        <p className="pixel text-[8px] text-muted-foreground mb-1">▣ Journal</p>
        <div className="font-body max-h-32 overflow-y-auto text-sm leading-tight text-muted-foreground">
          {log.slice().reverse().map((l, i) => <p key={i}>› {l}</p>)}
        </div>
      </div>

      <button onClick={reset} className="m-3 pixel-btn !text-[8px] text-center">← Abandon Run</button>

      <TutorialTip
        id="city-tour"
        title="Your Hub"
        body="Visit the Trainer to spec, Vendors for blessings, Crafter's Row for professions. Echo Tree spends shards between runs. When ready, Descend."
      />

      {oathModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
          <div className="w-full max-w-md border-2 border-gold bg-background p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="pixel text-[12px] text-gold">Swear Oaths Before You Descend</h3>
              <button onClick={() => setOathModal(null)} className="pixel text-[10px] text-muted-foreground">✕</button>
            </div>
            <p className="font-body text-sm text-muted-foreground">
              Optional vows that scar this descent. Take none, take all — each one cuts both ways.
            </p>
            <div className="space-y-2">
              {OATHS.map((o) => {
                const on = chosenOaths.includes(o.id);
                return (
                  <button
                    key={o.id}
                    onClick={() => toggleOath(o.id)}
                    className={`w-full text-left border-2 p-2 ${on ? "border-gold bg-card" : "border-black bg-card/60"}`}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="pixel text-[9px] text-gold">{o.name}</span>
                      <span className="pixel text-[7px]">{on ? "SWORN" : "TAP TO SWEAR"}</span>
                    </div>
                    <p className="font-body text-xs text-muted-foreground mt-1">{o.desc}</p>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => setOathModal(null)} className="pixel-btn !text-[9px]">Cancel</button>
              <button
                onClick={beginDescent}
                className={`pixel-btn !text-[9px] ${oathModal === "cursed" ? "pixel-btn-danger" : "pixel-btn-primary"}`}
              >
                {chosenOaths.length === 0 ? "Descend (no oaths)" : `Descend with ${chosenOaths.length} oath${chosenOaths.length > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
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
