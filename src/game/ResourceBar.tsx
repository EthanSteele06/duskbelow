import type { ClassId } from "@/game/data";
import { resourceDef, resourceBarPct } from "@/game/resources";

interface ResourceBarProps {
  classId: ClassId | null;
  current: number;
  max: number;
  /** compact = stat screens; combat = large bar above ability buttons */
  size?: "compact" | "combat";
}

export function ResourceBar({ classId, current, max, size = "compact" }: ResourceBarProps) {
  const def = resourceDef(classId);
  if (!def || max <= 0) return null;

  const pct = resourceBarPct(current, max);
  const combat = size === "combat";

  return (
    <div
      className={
        combat
          ? "rounded-sm border-2 border-black bg-card/95 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
          : undefined
      }
    >
      <div
        className={`flex items-baseline justify-between gap-2 ${
          combat ? "mb-2" : "mb-0.5 leading-none"
        }`}
      >
        <span
          className={
            combat
              ? "pixel text-[11px] uppercase tracking-wide text-gold"
              : "font-body text-[9px] text-muted-foreground"
          }
        >
          {def.label}
        </span>
        <span className={combat ? "pixel text-[14px] tabular-nums" : "font-body text-[9px] tabular-nums"}>
          {Math.floor(current)}
          <span className={combat ? "text-muted-foreground text-[11px]" : ""}>/{max}</span>
        </span>
      </div>
      <div
        className={`w-full overflow-hidden bg-stone border-black ${
          combat ? "h-6 border-2" : "h-2 border"
        }`}
      >
        <div
          className={`h-full transition-all duration-300 ${def.barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
