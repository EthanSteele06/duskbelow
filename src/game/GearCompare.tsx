import { RARITY_CLASS, SLOT_ICON, gearScore, formatGearStatsLine, type GearItem } from "@/game/data";

/** Compact comparison block for a gear pickup vs whatever's equipped in that slot.
 *  Used on the dungeon victory screen, the equipment bag, and anywhere else gear
 *  is offered to the player. */
export function GearCompare({ item, equipped, compact }: { item: GearItem; equipped?: GearItem; compact?: boolean }) {
  const delta = gearScore(item) - (equipped ? gearScore(equipped) : 0);
  const deltaCls = delta > 0 ? "text-divine" : delta < 0 ? "text-blood" : "text-muted-foreground";
  const deltaLabel = !equipped
    ? "▲ slot empty"
    : delta > 0 ? `▲ +${delta} vs equipped`
    : delta < 0 ? `▼ ${delta} vs equipped`
    : "= same score";
  const itemLine = formatGearStatsLine(item) || "—";
  const equippedLine = equipped ? formatGearStatsLine(equipped) || "—" : "";
  return (
    <div className={compact ? "space-y-0.5" : "space-y-1"}>
      <p className={`pixel text-[7px] ${deltaCls}`}>{deltaLabel}</p>
      {equipped && (
        <p className="pixel text-[6px] text-muted-foreground leading-tight">
          {SLOT_ICON[equipped.slot]} <span className={RARITY_CLASS[equipped.rarity]}>{equipped.name}</span>
          {" "}· iLvl {equipped.ilvl} · {equippedLine}
        </p>
      )}
      {!compact && itemLine !== "—" && (
        <p className="pixel text-[6px] text-foreground/80 leading-tight">Pick up: {itemLine}</p>
      )}
    </div>
  );
}
