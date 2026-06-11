import { useEffect } from "react";
import { useGame, bagFreeSlots } from "@/game/store";
import { VENDOR_ITEMS, AUCTION_LISTINGS, rollRelicListings, RARITY_LABEL, SLOT_ICON, type GearItem } from "@/game/data";
import { DAILY_ROTATION_MS } from "@/game/meta";
import { StatBar } from "./StatBar";
import { GearCompare } from "./GearCompare";

function statsLine(it: GearItem) {
  const s = it.stats;
  const parts: string[] = [];
  if (s.atk) parts.push(`+${s.atk} ATK`);
  if (s.mag) parts.push(`+${s.mag} MAG`);
  if (s.maxHp) parts.push(`+${s.maxHp} HP`);
  if (s.crit) parts.push(`+${s.crit}% crit`);
  if (s.dodge) parts.push(`+${s.dodge}% dodge`);
  return parts.join(" · ") || "—";
}

export function VendorScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const buy = useGame((s) => s.buy);
  const use = useGame((s) => s.use);
  const gold = useGame((s) => s.player.gold);
  const player = useGame((s) => s.player);
  const meta = useGame((s) => s.meta);
  const inv = player.inventory;
  const activeBuffs = player.activeBuffs;
  const bagFree = bagFreeSlots(player, meta);

  const buffSummary = activeBuffs.length
    ? activeBuffs.reduce<{ atk: number; mag: number; maxHp: number; goldMult: number }>(
        (acc, b) => ({
          atk: acc.atk + (b.atk ?? 0),
          mag: acc.mag + (b.mag ?? 0),
          maxHp: acc.maxHp + (b.maxHp ?? 0),
          goldMult: acc.goldMult + (b.goldMult ?? 0),
        }),
        { atk: 0, mag: 0, maxHp: 0, goldMult: 0 },
      )
    : null;

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
          const potionBlocked = it.kind === "potion" && bagFree <= 0;
          const canBuy = gold >= it.price && !potionBlocked;
          return (
            <div key={it.id} className="border-2 border-black bg-card p-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="pixel text-[9px] text-foreground">{it.name}</span>
                <span className="pixel text-[9px] text-gold">{it.price}g</span>
              </div>
              <p className="font-body text-sm text-muted-foreground">{it.desc}</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => buy(it.id)} disabled={!canBuy} className="pixel-btn pixel-btn-gold !text-[8px] disabled:opacity-40">
                  {potionBlocked ? "Bag Full" : it.kind === "buff" ? "Buy Blessing" : "Buy"}
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

function timeLeft(ms: number) {
  const total = Math.max(0, ms);
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  return `${h}h ${m}m`;
}

// Renamed: "Rotating Relics" — replaces the old Auction House stub.
export function AuctionScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const ensureRelicRoll = useGame((s) => s.ensureRelicRoll);
  const purchase = useGame((s) => s.purchaseRelic);
  const meta = useGame((s) => s.meta);
  const player = useGame((s) => s.player);
  useEffect(() => { ensureRelicRoll(); }, [ensureRelicRoll]);

  const v = meta.relicVendor;
  const listings = v ? rollRelicListings(v.seed, player.faction ?? null) : [];
  const remaining = v ? v.rolledAt + DAILY_ROTATION_MS - Date.now() : 0;

  const rarityColor = (r: string) =>
    r === "legendary" ? "text-gold" : r === "epic" ? "text-arcane" : r === "rare" ? "text-allies" : "text-muted-foreground";

  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <StatBar />
      <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>
      <div className="flex items-baseline justify-between">
        <h2 className="pixel text-[12px] text-gold">⚖ Rotating Relics</h2>
        {v && <p className="pixel text-[7px] text-muted-foreground">Rotates in {timeLeft(remaining)}</p>}
      </div>
      <p className="font-body text-sm text-muted-foreground -mt-2">
        A traveling fence lays out three relics each day. When they're sold, they're gone — until tomorrow.
      </p>

      <div className="space-y-2">
        {listings.map((entry, i) => {
          const key = `${i}:${entry.listing.id}`;
          const sold = v?.sold.includes(key);
          const canAfford = player.gold >= entry.price;
          const equipped = player.equipment[entry.listing.slot];
          return (
            <div key={key} className={`border-2 border-black bg-card p-2 ${sold ? "opacity-50" : ""}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="pixel text-[9px]">{entry.listing.name}</span>
                <span className={`pixel text-[7px] uppercase ${rarityColor(entry.listing.rarity)}`}>
                  {RARITY_LABEL[entry.listing.rarity]}
                </span>
              </div>
              <p className="pixel text-[7px] text-muted-foreground mt-0.5">
                {SLOT_ICON[entry.listing.slot]} {entry.listing.slot.toUpperCase()} · iLvl {entry.listing.ilvl}
              </p>
              <p className="font-body text-xs text-foreground mt-1">{statsLine(entry.listing)}</p>
              {entry.flavor && <p className="font-body text-xs italic text-muted-foreground mt-1">"{entry.flavor}"</p>}
              <div className="mt-1">
                <GearCompare item={entry.listing} equipped={equipped} compact />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="pixel text-[9px] text-gold">{entry.price}g</span>
                <button
                  className="pixel-btn pixel-btn-gold !text-[8px] disabled:opacity-40"
                  disabled={sold || !canAfford}
                  onClick={() => purchase(i)}
                >
                  {sold ? "Sold" : canAfford ? "Acquire" : "Too costly"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Auction House (stub) ────────────────────────────────────────────────────
// Re-added as a teaser surface. Bidding is non-functional in v1; the screen
// exists so players can see what's coming and so the city tile reads as alive.
export function AuctionHouseScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const rarityColor = (r: string) =>
    r === "epic" ? "text-arcane" : r === "rare" ? "text-allies" : "text-muted-foreground";
  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <StatBar />
      <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>
      <h2 className="pixel text-[12px] text-gold">⚖ Auction House</h2>
      <p className="font-body text-sm text-muted-foreground -mt-2">
        Listings from delvers across the realm. Bidding opens in a future patch — for now, browse and dream.
      </p>
      <div className="border-2 border-black bg-card/60 p-2">
        <p className="pixel text-[7px] text-gold">COMING SOON</p>
        <p className="font-body text-xs text-muted-foreground mt-1">
          Real player-driven auctions will live here. Today's slate is a preview.
        </p>
      </div>

      <div className="space-y-2">
        {AUCTION_LISTINGS.map((l) => (
          <div key={l.id} className="border-2 border-black bg-card p-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="pixel text-[9px]">{l.name}</span>
              <span className={`pixel text-[7px] uppercase ${rarityColor(l.rarity)}`}>{l.rarity}</span>
            </div>
            <p className="font-body text-xs text-muted-foreground">Seller: {l.seller}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="pixel text-[9px] text-gold">Top bid {l.bid}g</span>
              <button className="pixel-btn !text-[8px] opacity-60" disabled>Bid (soon)</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
