import { useGame } from "@/game/store";
import { ECHO_TREE, hasEcho } from "@/game/meta";

export function EchoTreeScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const meta = useGame((s) => s.meta);
  const spend = useGame((s) => s.spendEcho);
  const respec = useGame((s) => s.respecEcho);

  return (
    <div className="flex min-h-full flex-col p-3 gap-3">
      <button onClick={() => setScreen("city")} className="pixel-btn !text-[8px] w-fit">← Back to City</button>
      <h1 className="pixel text-[14px] text-gold">✦ Echo Tree</h1>
      <p className="font-body text-sm text-muted-foreground">Persistent passives. Echoes survive every death.</p>
      <div className="border-2 border-black bg-card p-2 text-center">
        <span className="pixel text-[10px]" style={{ color: "var(--color-arcane)" }}>✦ {meta.shards} Soul Shards</span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {ECHO_TREE.map((n) => {
          const owned = hasEcho(meta, n.id);
          const reqOk = !n.requires || hasEcho(meta, n.requires);
          const canBuy = !owned && reqOk && meta.shards >= n.cost;
          return (
            <div key={n.id} className={`border-2 border-black bg-card p-2 ${owned ? "rarity-frame-rare" : ""}`}>
              <div className="flex items-baseline justify-between">
                <p className="pixel text-[9px] text-gold">{n.name}</p>
                <p className="pixel text-[8px]" style={{ color: "var(--color-arcane)" }}>✦ {n.cost}</p>
              </div>
              <p className="font-body text-xs text-muted-foreground mt-1 leading-snug">{n.desc}</p>
              {n.requires && !reqOk && <p className="pixel text-[7px] text-blood mt-1">Requires: {ECHO_TREE.find((x) => x.id === n.requires)?.name}</p>}
              {owned ? (
                <p className="pixel text-[8px] text-divine mt-1">✓ Learned</p>
              ) : (
                <button
                  onClick={() => spend(n.id)}
                  disabled={!canBuy}
                  className="pixel-btn pixel-btn-gold !text-[8px] mt-1 disabled:opacity-40"
                >Learn</button>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={respec} className="pixel-btn !text-[8px] mt-3">↺ Refund all (free)</button>
    </div>
  );
}
