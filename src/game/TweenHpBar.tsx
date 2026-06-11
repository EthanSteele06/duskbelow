import { useEffect, useRef, useState } from "react";

interface Props {
  current: number;
  max: number;
  className?: string;
  barClassName?: string;
  durationMs?: number;
}

export function TweenHpBar({ current, max, className = "", barClassName = "bg-blood", durationMs = 420 }: Props) {
  const safeMax = Math.max(1, max);
  const targetPct = Math.max(0, Math.min(100, (current / safeMax) * 100));
  const [displayPct, setDisplayPct] = useState(targetPct);
  const displayRef = useRef(targetPct);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const start = displayRef.current;
    const delta = targetPct - start;
    if (Math.abs(delta) < 0.5) {
      displayRef.current = targetPct;
      setDisplayPct(targetPct);
      return;
    }
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = start + delta * eased;
      displayRef.current = next;
      setDisplayPct(next);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [current, max, targetPct, durationMs]);

  return (
    <div className={className}>
      <div
        className={`h-full transition-[filter] duration-150 ${barClassName} ${targetPct < displayPct ? "hp-bar-drain" : "hp-bar-heal"}`}
        style={{ width: `${displayPct}%` }}
      />
    </div>
  );
}
