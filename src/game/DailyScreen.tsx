import { useEffect } from "react";
import { useGame } from "@/game/store";
import { DAILY_CONTRACTS } from "@/game/data";
import { DAILY_ROTATION_MS } from "@/game/meta";
import { StatBar } from "./StatBar";

function timeLeft(ms: number) {
  const total = Math.max(0, ms);
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function DailyScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const meta = useGame((s) => s.meta);
  const ensureRoll = useGame((s) => s.ensureDailyRoll);
  const accept = useGame((s) => s.acceptDailyContract);
  const claim = useGame((s) => s.claimDailyContract);

  useEffect(() => { ensureRoll(); }, [ensureRoll]);

  const dc = meta.dailyContract;
  const def = dc ? DAILY_CONTRACTS.find((c) => c.id === dc.defId) : null;
  const need =
    def?.objective.kind === "kill_enemy" ? def.objective.count :
    def?.objective.kind === "kill_boss" ? def.objective.count :
    def?.objective.kind === "turn_in_material" ? def.objective.count :
    def?.objective.kind === "reach_floor" ? 1 : 1;
  const ready = dc && dc.accepted && !dc.claimed && dc.progress >= need;
  const remaining = dc ? dc.rolledAt + DAILY_ROTATION_MS - Date.now() : 0;

  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <StatBar />
      <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>
      <h2 className="pixel text-[12px] text-gold">▣ Contract Board</h2>
      <p className="font-body text-sm text-muted-foreground -mt-2">
        A single contract is posted each day. Complete it for Soul Shards and Account XP. New work arrives every 24h.
      </p>

      {!def && <p className="font-body text-sm text-muted-foreground italic">No contracts posted right now.</p>}

      {def && dc && (
        <div className="border-2 border-gold bg-card p-3 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="pixel text-[10px] text-gold">{def.name}</p>
            <p className="pixel text-[7px] text-muted-foreground">Refreshes in {timeLeft(remaining)}</p>
          </div>
          <p className="font-body text-sm">{def.desc}</p>
          <div className="flex items-center gap-2">
            <span className="pixel text-[8px] text-divine">✦ {def.rewardShards} shards</span>
            <span className="pixel text-[8px] text-muted-foreground">·</span>
            <span className="pixel text-[8px] text-foreground">+{def.rewardAccountXp} account XP</span>
          </div>

          {dc.accepted && (
            <div>
              <div className="h-3 border-2 border-black bg-background overflow-hidden">
                <div className="h-full bg-gold" style={{ width: `${Math.min(100, (dc.progress / need) * 100)}%` }} />
              </div>
              <p className="pixel text-[7px] text-muted-foreground mt-1">{dc.progress} / {need}</p>
            </div>
          )}

          {!dc.accepted && (
            <button onClick={accept} className="pixel-btn pixel-btn-gold !text-[9px] w-full">Accept Contract</button>
          )}
          {dc.accepted && !dc.claimed && (
            <button onClick={claim} disabled={!ready} className="pixel-btn pixel-btn-primary !text-[9px] w-full disabled:opacity-40">
              {ready ? "Claim Reward" : "In Progress…"}
            </button>
          )}
          {dc.claimed && (
            <p className="pixel text-[8px] text-divine text-center">✓ Claimed — return tomorrow.</p>
          )}
        </div>
      )}
    </div>
  );
}
