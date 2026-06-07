import { useState } from "react";
import { useGame } from "@/game/store";
import { COSMETICS, GEM_PACKS, type CosmeticKind } from "@/game/data";
import { StatBar } from "./StatBar";
import shopBg from "@/assets/shop-bg.jpg";

const TABS: { id: "cosmetics" | "gems" | "collection"; label: string }[] = [
  { id: "cosmetics",  label: "Shop" },
  { id: "collection", label: "Collection" },
  { id: "gems",       label: "Gems" },
];

const KIND_LABEL: Record<CosmeticKind, string> = {
  mount: "Mounts", weaponGlow: "Weapon Glows", namePlate: "Name Plates", portraitFrame: "Portrait Frames",
};

export function ShopScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const player = useGame((s) => s.player);
  const buy = useGame((s) => s.buyCosmetic);
  const equip = useGame((s) => s.equipCosmetic);
  const [tab, setTab] = useState<"cosmetics" | "gems" | "collection">("cosmetics");

  const owned = new Set(player.ownedCosmetics);

  return (
    <div className="flex min-h-full flex-col">
      <div className="relative h-32 overflow-hidden border-b-2 border-black">
        <img src={shopBg} alt="" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 vignette" />
        <div className="absolute inset-0 scanlines" />
        <div className="absolute left-2 bottom-2 right-2 flex items-center justify-between">
          <p className="pixel text-[12px] text-gold text-shadow-pixel">✦ The Cobalt Vault</p>
          <p className="pixel text-[10px] text-shadow-pixel" style={{ color: "var(--color-arcane)" }}>◆ {player.gems} gems</p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <StatBar />
        <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>

        <div className="grid grid-cols-3 gap-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`pixel-btn !text-[8px] text-center ${tab === t.id ? "pixel-btn-gold" : ""}`}>{t.label}</button>
          ))}
        </div>

        {tab === "cosmetics" && (
          <div className="space-y-3">
            {(Object.keys(KIND_LABEL) as CosmeticKind[]).map((kind) => {
              const items = COSMETICS.filter((c) => c.kind === kind);
              return (
                <div key={kind}>
                  <h3 className="pixel text-[10px] text-gold mb-1">{KIND_LABEL[kind]}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((c) => {
                      const isOwned = owned.has(c.id);
                      const locked = c.championExclusive && !player.isChampion && !isOwned;
                      const canBuy = !isOwned && !locked && player.gems >= c.priceGems;
                      return (
                        <div key={c.id} className="border-2 border-black bg-card p-2">
                          <div className="h-16 border-2 border-black flex items-center justify-center text-3xl" style={{ background: c.swatch }}>
                            <span style={{ filter: "drop-shadow(2px 2px 0 #000)" }}>{c.glyph}</span>
                          </div>
                          <p className="pixel text-[8px] mt-2">{c.name}</p>
                          <p className="font-body text-xs text-muted-foreground leading-tight">{c.desc}</p>
                          <div className="mt-2">
                            {isOwned ? (
                              <span className="pixel text-[7px] text-divine">✓ Owned</span>
                            ) : locked ? (
                              <span className="pixel text-[7px] text-gold">★ Champion only</span>
                            ) : (
                              <button onClick={() => buy(c.id)} disabled={!canBuy} className="pixel-btn pixel-btn-gold !text-[7px] !p-2 disabled:opacity-40 w-full text-center">
                                ◆ {c.priceGems}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "collection" && (
          <div className="space-y-3">
            {(Object.keys(KIND_LABEL) as CosmeticKind[]).map((kind) => {
              const items = COSMETICS.filter((c) => c.kind === kind && owned.has(c.id));
              if (items.length === 0) return (
                <div key={kind}>
                  <h3 className="pixel text-[10px] text-gold mb-1">{KIND_LABEL[kind]}</h3>
                  <p className="font-body text-sm text-muted-foreground">Nothing yet.</p>
                </div>
              );
              return (
                <div key={kind}>
                  <h3 className="pixel text-[10px] text-gold mb-1">{KIND_LABEL[kind]}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((c) => {
                      const isEquipped = player.equippedCosmetics[c.kind] === c.id;
                      return (
                        <button key={c.id} onClick={() => equip(c.id)} className={`border-2 border-black bg-card p-2 text-left ${isEquipped ? "rarity-frame-legendary" : ""}`}>
                          <div className="h-12 border-2 border-black flex items-center justify-center text-2xl" style={{ background: c.swatch }}>
                            <span style={{ filter: "drop-shadow(2px 2px 0 #000)" }}>{c.glyph}</span>
                          </div>
                          <p className="pixel text-[7px] mt-1">{c.name}</p>
                          <p className="pixel text-[7px] text-gold mt-1">{isEquipped ? "✓ EQUIPPED" : "Tap to equip"}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "gems" && (
          <div className="space-y-2">
            <p className="font-body text-sm text-muted-foreground">Buy gems to spend on cosmetics. Real payments unlock at launch — for now you have a starter stash.</p>
            {GEM_PACKS.map((p) => (
              <div key={p.id} className="border-2 border-black bg-card p-2 flex items-center gap-3">
                <div className="text-2xl" style={{ color: "var(--color-arcane)" }}>◆</div>
                <div className="flex-1">
                  <p className="pixel text-[9px]">{p.gems}{p.bonus ? <span className="text-gold"> +{p.bonus} bonus</span> : null} gems</p>
                  <p className="font-body text-sm text-muted-foreground">${p.priceUsd.toFixed(2)}</p>
                </div>
                <button onClick={() => alert("Real payments coming at launch.")} className="pixel-btn pixel-btn-gold !text-[8px]">Buy</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
