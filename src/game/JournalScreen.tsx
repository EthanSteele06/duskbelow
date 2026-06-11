import { useState } from "react";
import { useGame } from "@/game/store";
import { LORE_FRAGMENTS } from "@/game/meta";
import { ENEMIES, damageRange, signatureIntent, type EnemyDef } from "@/game/data";
import { bestiaryTier } from "@/game/meta";

const TIER_BADGE: Record<number, string> = {
  3: "MASTERED",
  2: "STUDIED",
  1: "OBSERVED",
  0: "SIGHTED",
};

function intentBand(e: EnemyDef, mult: number): string {
  const [lo, hi] = damageRange(e.atkBase * mult);
  return `${lo}–${hi} dmg`;
}

export function JournalScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const meta = useGame((s) => s.meta);
  const j = meta.journal;
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <button onClick={() => setScreen("wanderer")} className="pixel-btn !text-[8px] w-fit">← Back to Wanderer</button>
      <h1 className="pixel text-[14px] text-gold">▣ Bestiary & Lore</h1>
      <p className="font-body text-xs text-muted-foreground -mt-2">
        Slay an enemy three times to learn their wounds. Ten to read their tells. Twenty-five to master them. Tap a foe to see their kit.
      </p>

      <h2 className="pixel text-[10px] text-gold">Bestiary</h2>
      <div className="border-2 border-black bg-card p-2 space-y-1.5">
        {Object.entries(ENEMIES).map(([id, e]) => {
          const kills = j.enemyKills[id] ?? 0;
          const tier = bestiaryTier(kills);
          const unseen = tier < 0;
          const open = openId === id;
          const canExpand = tier >= 2; // need at least "studied" to show the full kit panel
          return (
            <div key={id} className="border-b border-black/40 last:border-0 pb-1.5 last:pb-0">
              <button
                type="button"
                disabled={!canExpand}
                onClick={() => setOpenId(open ? null : id)}
                className={`w-full text-left ${canExpand ? "" : "cursor-default"}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`pixel text-[9px] ${unseen ? "text-muted-foreground opacity-60" : "text-foreground"}`}>
                    {unseen ? "???" : e.name}
                    {canExpand && <span className="pixel text-[7px] text-muted-foreground ml-1">{open ? "▾" : "▸"}</span>}
                  </span>
                  <span className="pixel text-[7px] text-gold">{kills} slain{tier >= 0 ? ` · ${TIER_BADGE[tier]}` : ""}</span>
                </div>
                {tier >= 1 && (
                  <p className="font-body text-xs text-muted-foreground mt-0.5">
                    HP ≈ {e.hpBase} · ATK ≈ {e.atkBase}
                  </p>
                )}
                {tier === 1 && (() => {
                  const sig = signatureIntent(e);
                  return (
                    <p className="font-body text-xs text-foreground/80 mt-0.5">
                      {sig.telegraphable && <span className="text-blood">⚠ </span>}
                      Tell: {sig.label}
                    </p>
                  );
                })()}
                {tier === 2 && !open && (
                  <p className="pixel text-[7px] text-allies mt-0.5 opacity-80">Tap to inspect tells →</p>
                )}
              </button>

              {open && canExpand && (
                <div className="mt-2 border-2 border-black bg-background/60 p-2 space-y-1">
                  <p className="pixel text-[8px] text-allies">Kit — base ATK {e.atkBase}</p>
                  {e.intents.map((i) => (
                    <div key={i.id} className="flex items-baseline justify-between gap-2 border-b border-black/30 last:border-0 pb-0.5 last:pb-0">
                      <span className="font-body text-xs text-foreground">
                        {i.telegraphable && <span className="text-blood">⚠ </span>}
                        {i.label}
                      </span>
                      <span className="pixel text-[7px] text-gold whitespace-nowrap">
                        {Math.round(i.mult * 100)}% ATK · ~{intentBand(e, i.mult)}
                      </span>
                    </div>
                  ))}
                  {tier >= 3 && (
                    <p className="pixel text-[7px] text-divine pt-1">✦ Mastery — +5% damage vs {e.name}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="pixel text-[10px] text-gold">Lore Fragments ({j.loreFound.length}/{LORE_FRAGMENTS.length})</h2>
      <div className="space-y-2">
        {LORE_FRAGMENTS.map((l) => {
          const found = j.loreFound.includes(l.id);
          return (
            <div key={l.id} className={`border-2 border-black p-2 ${found ? "bg-card" : "bg-card/40"}`}>
              <p className="pixel text-[9px] text-gold">{found ? l.title : "— Sealed —"}</p>
              <p className="font-body text-xs italic text-muted-foreground mt-1 leading-snug">
                {found ? `"${l.text}"` : "Defeat the right foe and the page may turn."}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
