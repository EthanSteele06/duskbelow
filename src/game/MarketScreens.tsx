import { useGame } from "@/game/store";
import { VENDOR_ITEMS, AUCTION_LISTINGS } from "@/game/data";
import { StatBar } from "./StatBar";

export function VendorScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const buy = useGame((s) => s.buy);
  const use = useGame((s) => s.use);
  const gold = useGame((s) => s.player.gold);
  const inv = useGame((s) => s.player.inventory);
  const activeBuffs = useGame((s) => s.player.activeBuffs);

  const buffSummary = activeBuffs.length
    ? activeBuffs.reduce(
        (acc, b) => ({
          atk: acc.atk + (b.atk ?? 0),
          mag: acc.mag + (b.mag ?? 0),
          maxHp: acc.maxHp + (b.maxHp ?? 0),
          goldMult: acc.goldMult + (b.goldMult ?? 0),
        }),
        { atk: 0, mag: 0, maxHp: 0, goldMult: 0 },
      )
    : null;

  // Only show town-relevant items (no gem-priced consumables — those live in the Vault).
  const items = VENDOR_ITEMS.filter((it) => !it.gemPrice);

  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <StatBar />
      <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>
      <h2 className="pixel text-[12px] text-gold">⚒ The Black Anvil</h2>
      <p className="font-body text-sm text-muted-foreground -mt-2">A grizzled smith eyes your purse. Blessings fade when you leave the dungeon.</p>

      {buffSummary && (
        <div className="border-2 border-gold bg-card/80 p-2">
          <p className="pixel text-[8px] text-gold">✦ Blessings queued ({activeBuffs.length})</p>
          <p className="font-body text-xs text-divine mt-1">
            {buffSummary.atk ? `+${buffSummary.atk} ATK · ` : ""}
            {buffSummary.mag ? `+${buffSummary.mag} MAG · ` : ""}
            {buffSummary.maxHp ? `+${buffSummary.maxHp} HP · ` : ""}
            {buffSummary.goldMult ? `+${Math.round(buffSummary.goldMult * 100)}% gold` : ""}
          </p>
          <p className="font-body text-[10px] text-muted-foreground mt-0.5 italic">Applied automatically on your next descent.</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((it) => {
          const owned = inv.filter((x) => x === it.id).length;
          const canBuy = gold >= it.price;
          return (
            <div key={it.id} className="border-2 border-black bg-card p-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="pixel text-[9px] text-foreground">{it.name}</span>
                <span className="pixel text-[9px] text-gold">{it.price}g</span>
              </div>
              <p className="font-body text-sm text-muted-foreground">{it.desc}</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => buy(it.id)} disabled={!canBuy} className="pixel-btn pixel-btn-gold !text-[8px] disabled:opacity-40">
                  {it.kind === "buff" ? "Buy Blessing" : "Buy"}
                </button>
                {it.kind === "potion" && owned > 0 && (
                  <button onClick={() => use(it.id)} className="pixel-btn !text-[8px]">Use ({owned})</button>
                )}
                {owned > 0 && it.kind !== "potion" && it.kind !== "buff" && (
                  <span className="pixel text-[8px] text-muted-foreground self-center">Owned ×{owned}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AuctionScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const rarityColor = { common: "text-muted-foreground", rare: "text-allies", epic: "text-arcane" };
  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <StatBar />
      <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>
      <h2 className="pixel text-[12px] text-gold">⚖ Auction House</h2>
      <p className="font-body text-sm text-muted-foreground -mt-2">Listings from delvers across the realm.</p>

      <div className="space-y-2">
        {AUCTION_LISTINGS.map((l) => (
          <div key={l.id} className="border-2 border-black bg-card p-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="pixel text-[9px]">{l.name}</span>
              <span className={`pixel text-[8px] uppercase ${rarityColor[l.rarity]}`}>{l.rarity}</span>
            </div>
            <p className="font-body text-sm text-muted-foreground">Seller: {l.seller}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="pixel text-[9px] text-gold">Bid {l.bid}g</span>
              <button className="pixel-btn !text-[8px]" onClick={() => alert("Auction House comes online in v2.")}>Place Bid</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
