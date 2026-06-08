import { useGame } from "@/game/store";

interface TutorialTipProps {
  id: string;
  title: string;
  body: string;
  /** vertical position; default "center" */
  position?: "top" | "center" | "bottom";
}

/**
 * First-run tutorial popover. Renders nothing once the user has dismissed
 * this step (or "Skip all"). Persisted via meta.tutorialSeen.
 */
export function TutorialTip({ id, title, body, position = "center" }: TutorialTipProps) {
  const seen = useGame((s) => s.meta.tutorialSeen ?? {});
  const mark = useGame((s) => s.markTutorialSeen);
  if (seen.__all || seen[id]) return null;

  const align =
    position === "top" ? "items-start pt-16"
    : position === "bottom" ? "items-end pb-16"
    : "items-center";

  return (
    <div className={`fixed inset-0 z-50 flex justify-center px-4 ${align} bg-black/70 backdrop-blur-sm fade-in-up`}>
      <div className="max-w-xs border-2 border-gold bg-card p-3 shadow-lg">
        <p className="pixel text-[9px] text-gold mb-2">✦ {title}</p>
        <p className="font-body text-sm leading-snug text-foreground">{body}</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => mark(id)}
            className="pixel-btn pixel-btn-primary flex-1 !text-[9px]"
          >
            Got it
          </button>
          <button
            onClick={() => mark(id, true)}
            className="pixel-btn !text-[9px] opacity-70"
          >
            Skip all
          </button>
        </div>
      </div>
    </div>
  );
}
