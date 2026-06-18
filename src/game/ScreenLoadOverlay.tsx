import { useEffect, useState } from "react";
import type { ScreenLoadState } from "@/game/store";

interface Props {
  load: ScreenLoadState;
  onComplete: (id: number) => void;
}

export function ScreenLoadOverlay({ load, onComplete }: Props) {
  const [lineIdx, setLineIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLineIdx(0);
    setProgress(0);
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - startedAt) / load.durationMs) * 100));
    }, 40);
    const cycle = window.setInterval(
      () => {
        setLineIdx((idx) => (idx + 1) % load.lines.length);
      },
      Math.max(220, Math.floor(load.durationMs / 2)),
    );
    const done = window.setTimeout(() => onComplete(load.id), load.durationMs);

    return () => {
      clearInterval(tick);
      clearInterval(cycle);
      clearTimeout(done);
    };
  }, [load, onComplete]);

  const line = load.lines[lineIdx] ?? load.lines[0];

  return (
    <div
      className={`screen-load-overlay screen-load-${load.tone}`}
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 vignette" />
      <div className="absolute inset-0 scanlines opacity-70" />
      <div className="screen-load-grid" />

      <div className="relative z-10 flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="screen-load-orb">
          <span>▣</span>
        </div>

        <div className="screen-load-copy space-y-1">
          <p className="pixel text-[8px] uppercase tracking-[0.16em] text-muted-foreground">
            {load.status}
          </p>
          <h2 className="pixel text-shadow-pixel text-lg leading-tight text-gold">{load.label}</h2>
        </div>

        <p
          key={`${load.id}-${lineIdx}`}
          className="descent-line-swap font-body text-base italic text-foreground/90"
        >
          {line}
        </p>

        <div className="w-full max-w-xs">
          <div className="h-2 w-full border-2 border-black bg-stone/80">
            <div
              className="h-full bg-gold transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="pixel mt-2 text-[7px] text-muted-foreground">Executing screen handoff...</p>
        </div>
      </div>
    </div>
  );
}
