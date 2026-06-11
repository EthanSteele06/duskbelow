import { useGame } from "@/game/store";
import { stashCapacity, LORE_FRAGMENTS } from "@/game/meta";
import { RARITY_CLASS, SLOT_LABEL, gearScore, OATHS } from "@/game/data";

export function RunSummaryScreen() {
  const run = useGame((s) => s.lastRun);
  const meta = useGame((s) => s.meta);
  const player = useGame((s) => s.player);
  const stashItem = useGame((s) => s.stashItem);
  const wipe = useGame((s) => s.wipeCharacter);
  const markSeen = useGame((s) => s.markSeenWipeIntro);

  if (!run) {
    return (
      <div className="p-6 text-center">
        <button onClick={wipe} className="pixel-btn pixel-btn-primary">Continue</button>
      </div>
    );
  }
  const cap = stashCapacity(meta.account.level);
  const stashFree = cap - meta.stash.length;
  const showWipeIntro = run.outcome === "defeat" && !meta.seenWipeIntro;
  const newLore = run.loreFound.length > 0 ? LORE_FRAGMENTS.find((l) => l.id === run.loreFound[run.loreFound.length - 1]) : null;

  return (
    <div className="flex min-h-full flex-col p-4 gap-3">
      <h1 className={`pixel text-2xl text-shadow-pixel text-center ${run.outcome === "victory" ? "text-gold" : "text-blood"}`}>
        {run.outcome === "victory" ? "VICTORY" : "YOU DIED"}
      </h1>

      {showWipeIntro && (
        <div className="border-2 border-gold bg-card/80 p-3 text-center">
          <p className="font-body text-sm leading-snug">
            Your hero falls — but the <span className="text-gold">Wanderer endures</span>.
            Spend Soul Shards. Recover heirlooms. Descend again.
          </p>
        </div>
      )}

      {(run.oaths?.length ?? 0) > 0 && (
        <div className="border-2 border-black bg-card/80 p-3">
          <p className="pixel text-[9px] text-gold mb-2">✦ Oaths Sworn</p>
          <div className="space-y-1">
            {(run.oaths ?? []).map((id) => {
              const oath = OATHS.find((o) => o.id === id);
              return oath ? (
                <p key={id} className="font-body text-xs text-muted-foreground">
                  <span className="text-foreground">{oath.name}</span> — {oath.desc}
                </p>
              ) : null;
            })}
          </div>
        </div>
      )}

      <div className="border-2 border-black bg-card p-3 grid grid-cols-2 gap-2 text-sm font-body">
        <div>Floors</div><div className="text-right text-gold">{run.floors}</div>
        <div>Kills</div><div className="text-right">{run.kills}</div>
        <div>Gold earned</div><div className="text-right text-gold">{run.gold}g</div>
        <div>XP earned</div><div className="text-right text-divine">{run.xp}</div>
        <div>Soul Shards</div><div className="text-right" style={{ color: "var(--color-arcane)" }}>✦ {run.shards}</div>
      </div>

      {run.outcome === "defeat" && (run.retainedGold || run.hoarderKept) && (
        <div className="border-2 border-gold bg-card/80 p-3">
          <p className="pixel text-[9px] text-gold mb-2">✦ Echo Retention</p>
          {run.retainedGold ? (
            <p className="font-body text-xs text-muted-foreground">
              Buried Coin — <span className="text-gold">{run.retainedGold}g</span> waits for your next wanderer.
            </p>
          ) : null}
          {run.hoarderKept ? (
            <p className="font-body text-xs text-muted-foreground mt-1">
              Hoarder — <span className="text-divine">{run.hoarderKept.name}</span> clings to your pack through the wipe.
            </p>
          ) : null}
        </div>
      )}

      {newLore && (
        <div className="border-2 border-arcane bg-card/70 p-2">
          <p className="pixel text-[9px] text-gold">✦ Lore Found — {newLore.title}</p>
          <p className="font-body text-sm italic text-muted-foreground mt-1 leading-snug">"{newLore.text}"</p>
        </div>
      )}

      {cap > 0 && (
        <div className="border-2 border-black bg-card p-2">
          <p className="pixel text-[9px] text-gold mb-2">▩ Heirloom Stash ({meta.stash.length}/{cap})</p>
          <p className="font-body text-xs text-muted-foreground mb-2">
            Items moved here survive the wipe and auto-equip on your next character.
          </p>
          {stashFree === 0 ? (
            <p className="font-body text-xs text-blood">Stash full. Respec via Echo Tree or pick fewer.</p>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto">
              {[
                ...run.equipment.map((it) => ({ it, from: it.slot as string, source: "equipment" as const })),
                ...run.bag.map((it) => ({ it, from: "bag", source: "bag" as const })),
              ].map(({ it, source }) => (
                <div key={it.id} className="flex items-center gap-2 border border-black bg-stone/30 p-1.5">
                  <span className={`pixel text-[8px] flex-1 truncate ${RARITY_CLASS[it.rarity]}`}>
                    {it.name} · {SLOT_LABEL[it.slot]} · iLvl {it.ilvl} · GS {gearScore(it)}
                  </span>
                  <button
                    onClick={() => stashItem(it.id, source === "equipment" ? it.slot : undefined)}
                    disabled={stashFree === 0 || meta.stash.some((s) => s.id === it.id)}
                    className="pixel-btn pixel-btn-gold !text-[7px] !p-1 disabled:opacity-40"
                  >
                    {meta.stash.some((s) => s.id === it.id) ? "✓ Stashed" : "Stash"}
                  </button>
                </div>
              ))}
              {run.bag.length === 0 && run.equipment.length === 0 && (
                <p className="font-body text-xs text-muted-foreground italic">Nothing to stash.</p>
              )}
            </div>
          )}
        </div>
      )}

      {cap === 0 && (
        <div className="border-2 border-dashed border-muted-foreground bg-card/40 p-2 text-center">
          <p className="pixel text-[8px] text-muted-foreground">Heirloom Stash locked.</p>
          <p className="font-body text-xs text-muted-foreground mt-1">Unlocks at Wanderer Lv 3.</p>
        </div>
      )}

      <button
        onClick={() => { markSeen(); wipe(); }}
        className="pixel-btn pixel-btn-primary mt-auto w-full text-center"
      >
        {run.outcome === "victory" ? "▶ Forge a new run" : "▶ Wake in the city"}
      </button>
    </div>
  );
}
