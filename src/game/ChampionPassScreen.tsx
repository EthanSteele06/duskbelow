import { useGame } from "@/game/store";
import { CHAMPION_PERKS, CHAMPION_PRICE_USD } from "@/game/data";
import { StatBar } from "./StatBar";
import banner from "@/assets/champion-banner.jpg";

export function ChampionPassScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const player = useGame((s) => s.player);
  const toggle = useGame((s) => s.toggleChampion);

  return (
    <div className="flex min-h-full flex-col">
      <div className="relative h-40 overflow-hidden border-b-2 border-black">
        <img src={banner} alt="Champion's Pass" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 vignette" />
        <div className="absolute inset-0 scanlines" />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="pixel text-xl text-gold text-shadow-pixel">CHAMPION'S PASS</p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <StatBar />
        <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>

        <div className="border-2 border-black bg-card p-3 text-center">
          <p className="pixel text-[10px] text-gold">${CHAMPION_PRICE_USD.toFixed(2)} / month</p>
          <p className="font-body text-sm text-muted-foreground mt-1">Status: {player.isChampion ? <span className="text-divine">✓ ACTIVE</span> : <span className="text-blood">Inactive</span>}</p>
        </div>

        <div className="space-y-2">
          {CHAMPION_PERKS.map((p) => (
            <div key={p.title} className="border-2 border-black bg-card p-2 flex items-start gap-3">
              <span className="text-xl text-gold">{p.icon}</span>
              <div className="flex-1">
                <p className="pixel text-[9px]">{p.title}</p>
                <p className="font-body text-sm text-muted-foreground leading-tight mt-1">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => alert("Real payments unlock at launch. Use 'Preview' below to feel the perks now.")} className="pixel-btn pixel-btn-primary w-full text-center">
          Subscribe ${CHAMPION_PRICE_USD.toFixed(2)}/mo
        </button>

        <button onClick={toggle} className="pixel-btn !text-[8px] w-full text-center">
          {player.isChampion ? "Disable preview" : "▶ Preview perks (dev)"}
        </button>

        <p className="font-body text-xs text-muted-foreground text-center mt-2">
          The Champion's Pass funds servers and seasonal content. No power purchasable.
        </p>
      </div>
    </div>
  );
}
