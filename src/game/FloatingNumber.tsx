import { useEffect, useState } from "react";

export interface FloatingNum {
  id: number;
  value: number;
  /** "player" = enemy took damage from you; "enemy" = you took damage; "heal" = healing */
  kind: "player" | "enemy" | "heal";
  /** CSS color override (used by damage-skin cosmetic for player hits) */
  color?: string;
  /** 0–100 % horizontal position within container */
  x?: number;
}

let _seq = 0;
export const nextFloatingId = () => ++_seq;

interface Props {
  num: FloatingNum;
  onDone: (id: number) => void;
}

export function FloatingNumber({ num, onDone }: Props) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 900);
    const t2 = setTimeout(() => onDone(num.id), 1100);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [num.id, onDone]);

  const color =
    num.color ??
    (num.kind === "heal" ? "var(--color-divine)" :
     num.kind === "enemy" ? "var(--color-blood)" :
     "var(--color-divine)");

  return (
    <span
      className="pixel text-shadow-pixel pointer-events-none absolute select-none"
      style={{
        left: `${num.x ?? 50}%`,
        top: num.kind === "player" ? "35%" : "65%",
        transform: "translate(-50%, -50%)",
        color,
        fontSize: num.kind === "player" ? 22 : 16,
        animation: gone ? "floatNumOut 200ms ease-out forwards" : "floatNumIn 800ms ease-out forwards",
      }}
    >
      {num.kind === "heal" ? "+" : ""}{num.value}
    </span>
  );
}
