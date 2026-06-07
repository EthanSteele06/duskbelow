import { useGame } from "@/game/store";
import { CLASSES, COSMETICS, SPECS, FACTIONS } from "@/game/data";

/**
 * Persistent header showing the player's portrait, name, title, level, HP,
 * and equipped cosmetics. Mounted above every gameplay screen.
 */
export function CharacterHeader() {
  const p = useGame((s) => s.player);
  if (!p.classId) return null;

  const cls = CLASSES.find((c) => c.id === p.classId)!;
  const spec = p.specId ? SPECS.find((s) => s.id === p.specId) : null;
  const faction = p.faction ? FACTIONS.find((f) => f.id === p.faction) : null;

  const eq = p.equippedCosmetics ?? {};
  const titleCos    = eq.title         ? COSMETICS.find((c) => c.id === eq.title)         : null;
  const frameCos    = eq.portraitFrame ? COSMETICS.find((c) => c.id === eq.portraitFrame) : null;
  const plateCos    = eq.namePlate     ? COSMETICS.find((c) => c.id === eq.namePlate)     : null;
  const petCos      = eq.pet           ? COSMETICS.find((c) => c.id === eq.pet)           : null;

  const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
  const xpPct = Math.min(100, (p.xp / (p.level * 25)) * 100);

  const plateBorder = plateCos?.tint ?? "#000";
  const frameColor = frameCos?.tint ?? "transparent";

  return (
    <div
      className="border-b-2 bg-card/95 px-2 py-1.5"
      style={{ borderColor: plateBorder, boxShadow: plateCos ? `inset 0 0 0 1px ${plateCos.tint}` : undefined }}
    >
      <div className="flex items-center gap-2">
        {/* Pet slot */}
        <div className="w-7 h-10 flex items-center justify-center shrink-0">
          {petCos ? (
            <span className="text-xl pet-idle" title={petCos.name} style={{ filter: `drop-shadow(0 0 4px ${petCos.tint})` }}>{petCos.glyph}</span>
          ) : null}
        </div>

        {/* Portrait + frame */}
        <div className="relative shrink-0" style={{ width: 40, height: 40 }}>
          <div
            className={`absolute inset-0 border-2 border-black ${frameCos ? "frame-glow" : ""}`}
            style={{ boxShadow: frameCos ? `0 0 0 2px ${frameColor}, 0 0 10px -1px ${frameColor}` : undefined }}
          >
            <img src={cls.portrait} alt={cls.name} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Name / title / level */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="pixel text-[9px] text-gold truncate">{p.name}</span>
            {titleCos?.titleText && (
              <span className="pixel text-[7px] truncate" style={{ color: titleCos.tint }}>{titleCos.titleText}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-body text-muted-foreground leading-tight">
            <span>Lv {p.level}</span>
            <span className="opacity-50">·</span>
            <span style={{ color: cls.color }}>{cls.name}</span>
            {spec && <><span className="opacity-50">·</span><span style={{ color: spec.color }}>{spec.name}</span></>}
            {p.isChampion && <span className="pixel text-[7px] text-gold ml-auto">★</span>}
          </div>
          <div className="mt-0.5 h-1.5 w-full bg-stone border border-black">
            <div className="h-full bg-blood transition-all" style={{ width: `${hpPct}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] font-body leading-none mt-0.5">
            <span>{p.hp}/{p.maxHp}</span>
            <span className="text-gold">{p.gold}g</span>
            <span style={{ color: "var(--color-arcane)" }}>◆{p.gems}</span>
          </div>
          {p.level < 10 && (
            <div className="mt-0.5 h-[3px] w-full bg-stone border border-black">
              <div className="h-full bg-gold" style={{ width: `${xpPct}%` }} />
            </div>
          )}
        </div>

        {faction && (
          <img src={faction.sigil} alt={faction.name} className="w-6 h-6 object-contain torch-flicker shrink-0" />
        )}
      </div>
    </div>
  );
}
