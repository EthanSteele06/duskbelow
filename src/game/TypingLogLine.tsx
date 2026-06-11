import { useEffect, useState } from "react";

interface Props {
  text: string;
  active: boolean;
  className?: string;
  charMs?: number;
}

export function TypingLogLine({ text, active, className = "", charMs = 38 }: Props) {
  const [visible, setVisible] = useState(active ? 0 : text.length);

  useEffect(() => {
    if (!active) {
      setVisible(text.length);
      return;
    }
    setVisible(0);
  }, [text, active]);

  useEffect(() => {
    if (!active || visible >= text.length) return;
    const id = window.setTimeout(() => setVisible((v) => v + 1), charMs);
    return () => clearTimeout(id);
  }, [active, visible, text.length, charMs]);

  return (
    <p className={`log-line-appear ${className}`}>
      › {text.slice(0, visible)}
      {active && visible < text.length && <span className="log-cursor">▌</span>}
    </p>
  );
}
