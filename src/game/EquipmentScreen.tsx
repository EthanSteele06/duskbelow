import { useGame, bagCap } from "@/game/store";
import { SLOT_LABEL, SLOT_ICON, RARITY_CLASS, RARITY_LABEL, gearScore, gearSellPrice, type GearSlot, type GearItem } from "@/game/data";
import { StatBar } from "./StatBar";

const SLOTS: GearSlot[] = ["head", "chest", "legs", "weapon", "offhand", "trinket"];

function statsLine(it: GearItem) {
  const s = it.stats;
  const parts: string[] = [];
  if (s.atk) parts.push(`+${s.atk} ATK`);
  if (s.mag) parts.push(`+${s.mag} MAG`);
  if (s.maxHp) parts.push(`+${s.maxHp} HP`);
  if (s.crit) parts.push(`+${s.crit}% crit`);
  if (s.dodge) parts.push(`+${s.dodge}% dodge`);
  return parts.join(" · ");
}

export function EquipmentScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const player = useGame((s) => s.player);
  const equip = useGame((s) => s.equip);
  const unequip = useGame((s) => s.unequip);
  const sell = useGame((s) => s.sellBagItem);
  const discard = useGame((s) => s.discardBagItem);
  const meta = useGame((s) => s.meta);
  const cap = bagCap(player, meta);

  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <StatBar />
      <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>
      <h2 className="pixel text-[12px] text-gold">▩ Equipment</h2>

      <div className="grid grid-cols-3 gap-2">
        {SLOTS.map((slot) => {
          const it = player.equipment[slot];
          return (
            <button
              key={slot}
              onClick={() => it && unequip(slot)}
              disabled={!it}
              className={`border-2 border-black bg-card p-2 text-left min-h-24 disabled:opacity-100 disabled:cursor-default ${it ? `rarity-frame-${it.rarity}` : ""}`}
            >
              <p className="pixel text-[7px] text-muted-foreground">{SLOT_ICON[slot]} {SLOT_LABEL[slot]}</p>
              {it ? (
                <>
                  <p className={`pixel text-[8px] mt-1 ${RARITY_CLASS[it.rarity]}`}>{it.name}</p>
                  <p className="font-body text-xs opacity-80 leading-tight mt-1">{statsLine(it)}</p>
                  {it.legendaryDesc && (
                    <p className="pixel text-[6px] text-rarity-legendary mt-1 leading-tight">✦ {it.legendaryDesc}</p>
                  )}
                  <p className="pixel text-[7px] text-muted-foreground mt-1">iLvl {it.ilvl}</p>
                </>
              ) : (
                <p className="font-body text-xs text-muted-foreground italic mt-1">Empty</p>
              )}
            </button>
          );
        })}
      </div>

      <div className="border-2 border-black bg-card/60 p-2">
        <p className="pixel text-[9px] text-gold">Crit {player.crit}% · Dodge {player.dodge}%</p>
      </div>

      <h3 className="pixel text-[10px] text-gold mt-1">▣ Bag ({player.bag.length}/{cap})</h3>
      {player.bag.length === 0 && (
        <p className="font-body text-sm text-muted-foreground">Empty. Slay things to fill it.</p>
      )}
      <div className="space-y-2">
        {player.bag.map((it) => {
          const equipped = player.equipment[it.slot];
          const delta = equipped ? gearScore(it) - gearScore(equipped) : gearScore(it);
          return (
            <div key={it.id} className={`border-2 border-black bg-card p-2 rarity-frame-${it.rarity}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={`pixel text-[9px] ${RARITY_CLASS[it.rarity]}`}>{SLOT_ICON[it.slot]} {it.name}</span>
                <span className="pixel text-[7px] text-muted-foreground">iLvl {it.ilvl} · {RARITY_LABEL[it.rarity]}</span>
              </div>
              <p className="font-body text-sm opacity-90 mt-1">{statsLine(it)}</p>
              {it.legendaryDesc && (
                <p className="pixel text-[7px] text-rarity-legendary mt-1">✦ {it.legendaryDesc}</p>
              )}
              <p className={`pixel text-[7px] mt-1 ${delta > 0 ? "text-divine" : delta < 0 ? "text-blood" : "text-muted-foreground"}`}>
                {delta > 0 ? `▲ +${delta} vs equipped` : delta < 0 ? `▼ ${delta} vs equipped` : "= same score"}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button onClick={() => equip(it.id)} className="pixel-btn pixel-btn-gold !text-[8px]">Equip</button>
                <button onClick={() => sell(it.id)} className="pixel-btn !text-[8px]">Sell {gearSellPrice(it)}g</button>
                <button onClick={() => discard(it.id)} className="pixel-btn !text-[8px]">Discard</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
