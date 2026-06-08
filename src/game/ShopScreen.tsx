import { useState } from "react";
import { useGame } from "@/game/store";
import { COSMETICS, GEM_PACKS, COSMETIC_KIND_LABEL, VENDOR_ITEMS, CLASSES, type CosmeticKind, type CosmeticDef } from "@/game/data";
import shopBg from "@/assets/shop-bg.jpg";

const TABS: { id: "shop" | "collection" | "gems"; label: string }[] = [
  { id: "shop",       label: "Shop" },
  { id: "collection", label: "Collection" },
  { id: "gems",       label: "Gems" },
];

const KIND_ORDER: CosmeticKind[] = ["title", "portraitFrame", "namePlate", "weaponGlow", "damageSkin", "pet"];

function CosmeticPreview({ c, size = 64 }: { c: CosmeticDef; size?: number }) {
  // Render a small preview matching how the cosmetic appears in the header / combat
  if (c.kind === "title") {
    return (
      <div className="flex items-center justify-center w-full h-full" style={{ background: "oklch(0.18 0.01 30)" }}>
        <span className="pixel text-[9px] truncate px-1" style={{ color: c.tint }}>{c.titleText}</span>
      </div>
    );
  }
  if (c.kind === "portraitFrame") {
    return (
      <div className="flex items-center justify-center w-full h-full" style={{ background: "oklch(0.15 0.01 30)" }}>
        <div className="border-2 border-black" style={{ width: size * 0.5, height: size * 0.5, boxShadow: `0 0 0 2px ${c.tint}, 0 0 10px -1px ${c.tint}`, background: "oklch(0.3 0.02 30)" }} />
      </div>
    );
  }
  if (c.kind === "namePlate") {
    return (
      <div className="flex items-center justify-center w-full h-full" style={{ background: "oklch(0.15 0.01 30)" }}>
        <div className="border-2 px-1.5 py-0.5 pixel text-[8px]" style={{ borderColor: c.tint, color: c.tint, background: c.swatch }}>NAME</div>
      </div>
    );
  }
  if (c.kind === "weaponGlow") {
    return (
      <div className="flex items-center justify-center w-full h-full" style={{ background: "oklch(0.15 0.01 30)" }}>
        <div className="pixel text-[8px] px-2 py-1 border-2 border-black" style={{ background: "var(--color-secondary)", boxShadow: `0 0 12px ${c.tint}, inset 0 0 6px ${c.tint}` }}>ABL</div>
      </div>
    );
  }
  if (c.kind === "damageSkin") {
    return (
      <div className="flex items-center justify-center w-full h-full" style={{ background: "oklch(0.15 0.01 30)" }}>
        <span className="pixel text-shadow-pixel" style={{ fontSize: 22, color: c.tint }}>247</span>
      </div>
    );
  }
  // pet
  return (
    <div className="flex items-center justify-center w-full h-full" style={{ background: c.swatch }}>
      <span className="text-3xl pet-idle" style={{ filter: `drop-shadow(0 0 4px ${c.tint})` }}>{c.glyph}</span>
    </div>
  );
}

export function ShopScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const player = useGame((s) => s.player);
  const meta = useGame((s) => s.meta);
  const buy = useGame((s) => s.buyCosmetic);
  const buyGem = useGame((s) => s.buyGem);
  const equip = useGame((s) => s.equipCosmetic);
  const unlockClass = useGame((s) => s.unlockClass);
  const [tab, setTab] = useState<"shop" | "collection" | "gems">("shop");
  const revives = VENDOR_ITEMS.filter((v) => v.gemPrice);
  const heroes = CLASSES.filter((c) => c.premium);

  const owned = new Set(player.ownedCosmetics);

  return (
    <div className="flex min-h-full flex-col">
      <div className="relative h-28 overflow-hidden border-b-2 border-black">
        <img src={shopBg} alt="" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 vignette" />
        <div className="absolute inset-0 scanlines" />
        <div className="absolute left-2 bottom-2 right-2 flex items-center justify-between">
          <p className="pixel text-[12px] text-gold text-shadow-pixel">✦ The Cobalt Vault</p>
          <p className="pixel text-[10px] text-shadow-pixel" style={{ color: "var(--color-arcane)" }}>◆ {player.gems} gems</p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>

        <div className="grid grid-cols-3 gap-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`pixel-btn !text-[8px] text-center ${tab === t.id ? "pixel-btn-gold" : ""}`}>{t.label}</button>
          ))}
        </div>

        <div className="border-2 border-black bg-card/60 p-2">
          <p className="pixel text-[8px] text-muted-foreground leading-relaxed">
            Cosmetics appear in the <span className="text-gold">character header</span> at the top of the screen and in combat. Mounts unlock when the world map ships.
          </p>
        </div>

        {tab === "shop" && (
          <div className="space-y-4">
            <div>
              <h3 className="pixel text-[10px] text-gold mb-1.5">Heroes</h3>
              <div className="grid grid-cols-1 gap-2">
                {heroes.map((h) => {
                  const isOwned = meta.ownedClasses.includes(h.id);
                  const canBuy = !isOwned && player.gems >= (h.gemPrice ?? 0);
                  return (
                    <div key={h.id} className="border-2 border-black bg-card p-2 flex items-center gap-2">
                      <img src={h.portrait} alt={h.name} className="h-14 w-14 object-cover border-2 border-black" />
                      <div className="flex-1 min-w-0">
                        <p className="pixel text-[9px] text-gold">{h.name} {isOwned && <span className="text-divine">✓ Owned</span>}</p>
                        <p className="font-body text-xs text-muted-foreground leading-tight">{h.tagline}</p>
                        <p className="font-body text-xs">HP {h.hp} · ATK {h.atk} · MAG {h.mag}</p>
                      </div>
                      {!isOwned && (
                        <div className="flex flex-col gap-1">
                          <button onClick={() => unlockClass(h.id)} disabled={!canBuy} className="pixel-btn pixel-btn-gold !text-[7px] !p-2 disabled:opacity-40">◆ {h.gemPrice}</button>
                          <button onClick={() => unlockClass(h.id, { devFree: true })} className="pixel-btn !text-[7px] !p-1">Test unlock</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="pixel text-[10px] text-gold mb-1.5">Run Insurance</h3>
              <div className="grid grid-cols-1 gap-2">
                {revives.map((it) => {
                  const owned = player.inventory.filter((x) => x === it.id).length;
                  const canBuy = player.gems >= (it.gemPrice ?? 0);
                  return (
                    <div key={it.id} className="border-2 border-black bg-card p-2 flex items-center gap-2">
                      <div className="flex-1">
                        <p className="pixel text-[8px] text-gold">{it.name} {owned > 0 && <span className="text-divine">×{owned}</span>}</p>
                        <p className="font-body text-xs text-muted-foreground leading-tight">{it.desc}</p>
                      </div>
                      <button onClick={() => buyGem(it.id)} disabled={!canBuy} className="pixel-btn pixel-btn-gold !text-[7px] !p-2 disabled:opacity-40">◆ {it.gemPrice}</button>
                    </div>
                  );
                })}
              </div>
            </div>
            {KIND_ORDER.map((kind) => {
              const items = COSMETICS.filter((c) => c.kind === kind);
              return (
                <div key={kind}>
                  <h3 className="pixel text-[10px] text-gold mb-1.5">{COSMETIC_KIND_LABEL[kind]}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((c) => {
                      const isOwned = owned.has(c.id);
                      const locked = c.championExclusive && !player.isChampion && !isOwned;
                      const canBuy = !isOwned && !locked && player.gems >= c.priceGems;
                      return (
                        <div key={c.id} className="border-2 border-black bg-card p-2 flex flex-col">
                          <div className="h-16 border-2 border-black overflow-hidden"><CosmeticPreview c={c} /></div>
                          <p className="pixel text-[8px] mt-2">{c.name}</p>
                          <p className="font-body text-xs text-muted-foreground leading-tight flex-1">{c.desc}</p>
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

            <div className="border-2 border-dashed border-muted-foreground bg-card/40 p-3 text-center">
              <p className="pixel text-[9px] text-muted-foreground">Mounts — Coming Soon</p>
              <p className="font-body text-sm text-muted-foreground mt-1 leading-tight">Mount visuals unlock with the world-map travel system.</p>
            </div>
          </div>
        )}

        {tab === "collection" && (
          <div className="space-y-4">
            {KIND_ORDER.map((kind) => {
              const items = COSMETICS.filter((c) => c.kind === kind && owned.has(c.id));
              return (
                <div key={kind}>
                  <h3 className="pixel text-[10px] text-gold mb-1.5">{COSMETIC_KIND_LABEL[kind]}</h3>
                  {items.length === 0 ? (
                    <p className="font-body text-sm text-muted-foreground">Nothing yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {items.map((c) => {
                        const isEquipped = player.equippedCosmetics[c.kind] === c.id;
                        return (
                          <button key={c.id} onClick={() => equip(c.id)} className={`border-2 border-black bg-card p-2 text-left ${isEquipped ? "rarity-frame-legendary" : ""}`}>
                            <div className="h-12 border-2 border-black overflow-hidden"><CosmeticPreview c={c} /></div>
                            <p className="pixel text-[7px] mt-1">{c.name}</p>
                            <p className="pixel text-[7px] text-gold mt-1">{isEquipped ? "✓ EQUIPPED" : "Tap to equip"}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
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
