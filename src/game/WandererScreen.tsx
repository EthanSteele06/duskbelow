import { useState } from "react";
import { useGame } from "@/game/store";
import { CLASSES, FACTIONS, RARITY_CLASS, SLOT_ICON, SLOT_LABEL, type GearItem, type GearSlot } from "@/game/data";
import {
  ACCOUNT_UNLOCKS, accountXpForLevel, ACCOUNT_LEVEL_CAP, nextUnlock, stashCapacity,
} from "@/game/meta";
import { StatBar } from "./StatBar";

type Tab = "stash" | "profile" | "unlocks" | "collection";

const SLOTS: GearSlot[] = ["head", "chest", "legs", "weapon", "offhand", "trinket"];

export function WandererScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const meta = useGame((s) => s.meta);
  const player = useGame((s) => s.player);
  const withdraw = useGame((s) => s.withdrawStash);
  const stashItem = useGame((s) => s.stashItem);
  const setOption = useGame((s) => s.setOption);
  const [tab, setTab] = useState<Tab>("stash");
  const stashCap = stashCapacity(meta.account.level);
  const stashFull = meta.stash.length >= stashCap;

  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <StatBar />
      <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>
      <header className="border-2 border-black bg-card p-3">
        <h2 className="pixel text-[12px] text-gold">☥ The Wanderer</h2>
        <p className="font-body text-xs italic text-muted-foreground mt-1">
          Each life ends. The Wanderer endures, carrying echoes between worlds.
        </p>
      </header>

      <nav className="grid grid-cols-4 gap-1">
        {([
          ["stash", "Stash"],
          ["profile", "Profile"],
          ["unlocks", "Unlocks"],
          ["collection", "Codex"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`pixel-btn !text-[8px] !py-2 ${tab === id ? "pixel-btn-gold" : ""}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "stash" && (
        <StashTab
          stash={meta.stash}
          cap={stashCap}
          stashFull={stashFull}
          equipment={player.equipment}
          onWithdraw={withdraw}
          onStashSlot={(slot) => stashItem("", slot)}
        />
      )}
      {tab === "profile" && (
        <ProfileTab
          meta={meta}
          autoSell={meta.options.autoSellCommon}
          onToggleAutoSell={(v) => setOption("autoSellCommon", v)}
        />
      )}
      {tab === "unlocks" && <UnlocksTab level={meta.account.level} xp={meta.account.xp} />}
      {tab === "collection" && (
        <CollectionTab
          collection={meta.collection}
          unlocked={meta.unlockedClasses}
          owned={meta.ownedClasses}
          onOpenLore={() => setScreen("journal")}
        />
      )}
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────

function StashTab({
  stash, cap, stashFull, equipment, onWithdraw, onStashSlot,
}: {
  stash: GearItem[];
  cap: number;
  stashFull: boolean;
  equipment: Partial<Record<GearSlot, GearItem>>;
  onWithdraw: (i: number) => boolean;
  onStashSlot: (slot: GearSlot) => boolean;
}) {
  const equipped = SLOTS.map((s) => [s, equipment[s]] as const).filter(([, it]) => !!it) as [GearSlot, GearItem][];
  return (
    <section className="space-y-3">
      <div>
        <p className="pixel text-[9px] text-gold">▣ Heirloom Stash ({stash.length}/{cap})</p>
        <p className="font-body text-xs text-muted-foreground">
          Items here survive death. New characters auto-equip what fits, the rest land in their bag.
        </p>
      </div>
      {cap === 0 && (
        <p className="font-body text-sm text-muted-foreground italic">Unlock your first stash slot at Wanderer Lv 3.</p>
      )}
      {stash.length === 0 && cap > 0 && (
        <p className="font-body text-sm text-muted-foreground italic">Empty. Stash items from below or your Equipment screen.</p>
      )}
      {stash.map((it, idx) => (
        <div key={`${it.id}-${idx}`} className={`border-2 border-black bg-card p-2 rarity-frame-${it.rarity}`}>
          <div className="flex items-baseline justify-between gap-2">
            <span className={`pixel text-[9px] ${RARITY_CLASS[it.rarity]}`}>{SLOT_ICON[it.slot]} {it.name}</span>
            <span className="pixel text-[7px] text-muted-foreground">iLvl {it.ilvl}</span>
          </div>
          {it.legendaryDesc && (
            <p className="pixel text-[7px] text-rarity-legendary mt-1">✦ {it.legendaryDesc}</p>
          )}
          <button onClick={() => onWithdraw(idx)} className="pixel-btn !text-[8px] mt-2 w-full">Withdraw to bag</button>
        </div>
      ))}

      {equipped.length > 0 && cap > 0 && (
        <div className="mt-2">
          <p className="pixel text-[9px] text-gold mb-1">▣ Stash from equipment</p>
          <p className="font-body text-xs text-muted-foreground mb-2">Send currently-equipped gear straight to the heirloom stash.</p>
          <div className="grid grid-cols-2 gap-2">
            {equipped.map(([slot, it]) => (
              <button
                key={slot}
                disabled={stashFull}
                onClick={() => onStashSlot(slot)}
                className={`border-2 border-black bg-card p-2 text-left rarity-frame-${it.rarity} disabled:opacity-40`}
              >
                <p className="pixel text-[7px] text-muted-foreground">{SLOT_ICON[slot]} {SLOT_LABEL[slot]}</p>
                <p className={`pixel text-[8px] mt-0.5 ${RARITY_CLASS[it.rarity]} truncate`}>{it.name}</p>
                <p className="pixel text-[7px] text-gold mt-1">→ Stash</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ProfileTab({
  meta, autoSell, onToggleAutoSell,
}: {
  meta: ReturnType<typeof useGame.getState>["meta"];
  autoSell: boolean;
  onToggleAutoSell: (v: boolean) => void;
}) {
  const lt = meta.lifetime;
  const j = meta.journal;
  return (
    <section className="space-y-2">
      <p className="pixel text-[9px] text-gold">▣ Lifetime</p>
      <div className="border-2 border-black bg-card p-2 grid grid-cols-2 gap-1 font-body text-sm">
        <div>Wanderer level</div><div className="text-right text-gold">{meta.account.level}/{ACCOUNT_LEVEL_CAP}</div>
        <div>Soul Shards</div><div className="text-right text-gold">{meta.shards}</div>
        <div>Runs completed</div><div className="text-right">{Math.max(lt.runs, j.runsCompleted)}</div>
        <div>Deepest floor</div><div className="text-right">{Math.max(lt.deepest, j.deepestFloor)}</div>
        <div>Deepest (cursed)</div><div className="text-right">{lt.deepestCursed}</div>
        <div>Deepest (ascension)</div><div className="text-right">{lt.deepestAscension ?? 0}</div>
        <div>Chronicles done</div><div className="text-right">{meta.completedChronicles?.length ?? 0}</div>
        <div>Bosses slain</div><div className="text-right">{lt.bossesKilled}</div>
        <div>Gold earned</div><div className="text-right">{lt.goldEarned}</div>
        <div>Legendaries found</div><div className="text-right text-rarity-legendary">{lt.legendariesFound}</div>
      </div>

      {j.bestRun && (
        <div className="border-2 border-black bg-card/60 p-2">
          <p className="pixel text-[8px] text-gold">★ Best Run</p>
          <p className="font-body text-xs text-muted-foreground mt-0.5">
            Floor {j.bestRun.floors} · {j.bestRun.kills} kills · {j.bestRun.gold}g
          </p>
        </div>
      )}

      <p className="pixel text-[9px] text-gold mt-2">▣ Quality of Life</p>
      <label className="flex items-center justify-between border-2 border-black bg-card p-2 gap-2">
        <span className="font-body text-sm">
          Auto-sell common drops
          <span className="block text-xs text-muted-foreground">Greys go straight to gold — bag stays clean.</span>
        </span>
        <input type="checkbox" checked={autoSell} onChange={(e) => onToggleAutoSell(e.target.checked)} />
      </label>
    </section>
  );
}

function UnlocksTab({ level, xp }: { level: number; xp: number }) {
  const next = nextUnlock(level);
  const xpForNext = level < ACCOUNT_LEVEL_CAP ? accountXpForLevel(level) : 0;
  const pct = xpForNext > 0 ? Math.min(100, Math.floor((xp / xpForNext) * 100)) : 100;
  return (
    <section className="space-y-2">
      <div className="border-2 border-black bg-card p-2">
        <p className="pixel text-[9px] text-gold">Wanderer Lv {level}</p>
        {level < ACCOUNT_LEVEL_CAP ? (
          <>
            <div className="mt-1 h-2 border border-black bg-background/60 overflow-hidden">
              <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
            </div>
            <p className="pixel text-[7px] text-muted-foreground mt-1">{xp}/{xpForNext} XP to next</p>
            {next && <p className="font-body text-xs text-gold mt-1">Next: {next.label} (Lv {next.level})</p>}
          </>
        ) : (
          <p className="pixel text-[8px] text-gold mt-1">— MAX —</p>
        )}
      </div>

      <p className="pixel text-[9px] text-gold mt-1">▣ Unlock Track</p>
      <div className="space-y-1">
        {ACCOUNT_UNLOCKS.map((u) => {
          const earned = level >= u.level;
          return (
            <div key={`${u.level}-${u.label}`} className={`border-2 border-black p-2 flex items-center justify-between gap-2 ${earned ? "bg-card" : "bg-card/40 opacity-70"}`}>
              <span className={`pixel text-[8px] ${earned ? "text-gold" : "text-muted-foreground"}`}>Lv {u.level}</span>
              <span className="font-body text-sm flex-1">{u.label}</span>
              <span className={`pixel text-[8px] ${earned ? "text-divine" : "text-muted-foreground"}`}>{earned ? "✓" : "—"}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CollectionTab({
  collection, unlocked, owned, onOpenLore,
}: {
  collection: ReturnType<typeof useGame.getState>["meta"]["collection"];
  unlocked: string[];
  owned: string[];
  onOpenLore: () => void;
}) {
  const totalClasses = CLASSES.length;
  const playedSet = new Set(collection.classesPlayed ?? []);
  const factionSet = new Set(collection.factionsPlayed ?? []);

  return (
    <section className="space-y-2">
      <p className="pixel text-[9px] text-gold">▣ Heroes ({playedSet.size}/{totalClasses})</p>
      <div className="grid grid-cols-2 gap-2">
        {CLASSES.map((c) => {
          const isUnlocked = unlocked.includes(c.id) || owned.includes(c.id);
          const played = playedSet.has(c.id);
          const cleared = collection.classesCleared?.includes(c.id);
          const legendary = collection.legendaryClasses?.includes(c.id);
          return (
            <div key={c.id} className={`border-2 border-black bg-card p-2 ${isUnlocked ? "" : "opacity-50"}`}>
              <div className="flex items-center gap-2">
                <img src={c.portrait} alt={c.name} className="w-10 h-10 border border-black object-cover" style={{ imageRendering: "pixelated" }} />
                <div className="min-w-0">
                  <p className="pixel text-[8px] truncate" style={{ color: c.color }}>{c.name}</p>
                  <p className="pixel text-[6px] text-muted-foreground">
                    {isUnlocked ? (played ? "PLAYED" : "Available") : "LOCKED"}
                  </p>
                </div>
              </div>
              <div className="mt-1 flex gap-1 flex-wrap">
                {cleared && <span className="pixel text-[6px] text-divine">✓ Cleared</span>}
                {legendary && <span className="pixel text-[6px] text-rarity-legendary">✦ Legend</span>}
              </div>
            </div>
          );
        })}
      </div>

      <p className="pixel text-[9px] text-gold mt-2">▣ Factions ({factionSet.size}/{FACTIONS.length})</p>
      <div className="space-y-1">
        {FACTIONS.map((f) => {
          const played = factionSet.has(f.id);
          return (
            <div key={f.id} className={`border-2 border-black p-2 flex items-center gap-2 ${played ? "bg-card" : "bg-card/40 opacity-60"}`}>
              <img src={f.sigil} alt={f.name} className="h-8 w-8 object-contain" />
              <div className="flex-1 min-w-0">
                <p className="pixel text-[8px] text-gold truncate">{f.name}</p>
                <p className="font-body text-xs text-muted-foreground italic truncate">{f.motto}</p>
              </div>
              <span className={`pixel text-[8px] ${played ? "text-divine" : "text-muted-foreground"}`}>{played ? "✓" : "—"}</span>
            </div>
          );
        })}
      </div>

      <button onClick={onOpenLore} className="pixel-btn !text-[9px] w-full mt-2">▣ Open Bestiary & Lore →</button>
    </section>
  );
}
