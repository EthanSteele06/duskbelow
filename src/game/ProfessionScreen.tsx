import { useEffect, useState } from "react";
import { useGame } from "@/game/store";
import {
  PROFESSIONS, RECIPES, MATERIALS, profXpForLevel, VENDOR_ITEMS,
  IDLE_YIELDS, IDLE_SECONDS_PER_UNIT,
  type ProfessionId,
} from "@/game/data";
import { StatBar } from "./StatBar";

export function ProfessionScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const p = useGame((s) => s.player);
  const pick = useGame((s) => s.pickProfession);
  const swap = useGame((s) => s.switchProfession);
  const claim = useGame((s) => s.claimIdleProfession);
  const craft = useGame((s) => s.craft);
  const sell = useGame((s) => s.sellMaterial);
  const buyRecipe = useGame((s) => s.buyRecipe);
  const [pendingSwap, setPendingSwap] = useState<ProfessionId | null>(null);

  // Claim accrued idle materials on mount and every minute while open.
  useEffect(() => {
    claim();
    const t = window.setInterval(() => claim(), 60_000);
    return () => window.clearInterval(t);
  }, [claim]);

  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <StatBar />
      <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>
      <h2 className="pixel text-[12px] text-gold">⚒ Crafter's Row</h2>
      <p className="font-body text-sm text-muted-foreground -mt-2">
        Work between dungeon runs. Your craft also gathers materials idly while you're away —
        1× per {Math.round(IDLE_SECONDS_PER_UNIT / 60)} min.
      </p>

      {!p.profession ? (
        <>
          <p className="pixel text-[9px] text-foreground mt-1">Choose a profession to begin:</p>
          <div className="grid grid-cols-2 gap-2">
            {PROFESSIONS.map((prof) => (
              <button key={prof.id} onClick={() => pick(prof.id)} className="pixel-btn !p-3 flex flex-col items-start gap-1">
                <span className="pixel text-[10px] text-gold">{prof.icon} {prof.name}</span>
                <span className="font-body text-sm text-muted-foreground">{prof.desc}</span>
                <span className="pixel text-[7px] text-divine">Idle yield: {MATERIALS[IDLE_YIELDS[prof.id]]?.name}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <ProfHeader />
          <SwitchBar />
          <Materials onSell={sell} />
          <Recipes onCraft={craft} onBuy={buyRecipe} />
        </>
      )}
    </div>
  );

  function ProfHeader() {
    const def = PROFESSIONS.find((x) => x.id === p.profession)!;
    const need = profXpForLevel(p.profLevel);
    const pct = (p.profXp / need) * 100;
    const idleMat = MATERIALS[IDLE_YIELDS[def.id]]?.name ?? "—";
    return (
      <div className="border-2 border-black bg-card p-3">
        <div className="flex items-baseline justify-between">
          <span className="pixel text-[10px] text-gold">{def.icon} {def.name}</span>
          <span className="pixel text-[9px] text-muted-foreground">Lv {p.profLevel}</span>
        </div>
        <div className="mt-2 h-2 w-full bg-stone border border-black">
          <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
        <p className="font-body text-sm text-muted-foreground mt-1">{p.profXp} / {need} xp</p>
        <p className="pixel text-[7px] text-divine mt-1">Idly gathering: {idleMat}</p>
      </div>
    );
  }

  function SwitchBar() {
    const others = PROFESSIONS.filter((x) => x.id !== p.profession);
    return (
      <div className="border-2 border-black bg-card/60 p-2">
        <p className="pixel text-[8px] text-muted-foreground mb-1">Switch craft</p>
        <div className="grid grid-cols-2 gap-1">
          {others.map((prof) => (
            <button
              key={prof.id}
              onClick={() => setPendingSwap(prof.id)}
              className="pixel-btn !text-[7px] !p-1.5"
            >
              {prof.icon} {prof.name}
            </button>
          ))}
        </div>
        {pendingSwap && (() => {
          const target = PROFESSIONS.find((x) => x.id === pendingSwap)!;
          return (
            <div className="mt-2 border-2 border-blood bg-background p-2">
              <p className="pixel text-[8px] text-blood">⚠ Abandon your current craft?</p>
              <p className="font-body text-xs text-muted-foreground mt-1">
                Switching to <span className="text-gold">{target.name}</span> wipes your profession level,
                XP, materials, and known recipes. This cannot be undone.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1">
                <button
                  onClick={() => { swap(pendingSwap); setPendingSwap(null); }}
                  className="pixel-btn pixel-btn-primary !text-[8px]"
                >Confirm wipe</button>
                <button onClick={() => setPendingSwap(null)} className="pixel-btn !text-[8px]">Cancel</button>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  function Materials({ onSell }: { onSell: (id: string) => void }) {
    const entries = Object.entries(p.materials).filter(([, c]) => c > 0);
    return (
      <div>
        <h3 className="pixel text-[10px] text-gold mb-1">Materials</h3>
        {entries.length === 0 && <p className="font-body text-sm text-muted-foreground">No materials yet. Slay things below — or let your craft idle.</p>}
        <div className="grid grid-cols-1 gap-1.5">
          {entries.map(([id, count]) => {
            const def = MATERIALS[id];
            if (!def) return null;
            return (
              <div key={id} className="border-2 border-black bg-card p-2 flex items-center justify-between">
                <div>
                  <span className="pixel text-[8px]">{def.name}</span>
                  <span className="font-body text-sm text-muted-foreground"> ×{count}</span>
                </div>
                <button onClick={() => onSell(id)} className="pixel-btn !text-[8px]">Sell 1 ({def.sellPrice}g)</button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function Recipes({ onCraft, onBuy }: { onCraft: (id: string) => void; onBuy: (id: string) => void }) {
    if (!p.profession) return null;
    const recipes = RECIPES.filter((r) => r.profession === p.profession);
    return (
      <div>
        <h3 className="pixel text-[10px] text-gold mb-1 mt-2">Recipes</h3>
        <div className="space-y-2">
          {recipes.map((r) => {
            const known = p.knownRecipes.includes(r.id);
            const levelOk = p.profLevel >= r.levelReq;
            const matsOk = Object.entries(r.inputs).every(([m, c]) => (p.materials[m] ?? 0) >= c);
            const ro = r.output;
            const out =
              ro.kind === "vendor"
                ? VENDOR_ITEMS.find((v) => v.id === ro.itemId)?.name ?? "Item"
                : `${ro.gold}g`;
            return (
              <div key={r.id} className="border-2 border-black bg-card p-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="pixel text-[9px]">{r.name}</span>
                  <span className="pixel text-[8px] text-gold">Lv {r.levelReq}</span>
                </div>
                <p className="font-body text-sm text-muted-foreground">{r.desc}</p>
                <p className="font-body text-sm mt-1">
                  Needs: {Object.entries(r.inputs).map(([m, c]) => `${MATERIALS[m]?.name ?? m} ×${c}`).join(", ")}
                </p>
                <p className="font-body text-sm">Produces: <span className="text-gold">{out}</span> · +{r.xp} xp</p>
                <div className="mt-2 flex gap-2">
                  {!known && r.buyPrice && (
                    <button onClick={() => onBuy(r.id)} disabled={p.gold < r.buyPrice} className="pixel-btn !text-[8px] disabled:opacity-40">
                      Buy Recipe ({r.buyPrice}g)
                    </button>
                  )}
                  {!known && !r.buyPrice && (
                    <span className="pixel text-[8px] text-muted-foreground">Found as dungeon drop</span>
                  )}
                  {known && (
                    <button onClick={() => onCraft(r.id)} disabled={!matsOk || !levelOk} className="pixel-btn pixel-btn-gold !text-[8px] disabled:opacity-40">
                      Craft
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
