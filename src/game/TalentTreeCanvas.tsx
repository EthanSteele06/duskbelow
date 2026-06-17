import { useMemo, useRef, useState, useLayoutEffect } from "react";
import type { TalentNode } from "@/game/talents";
import type { TalentRanks } from "@/game/talentCombat";
import {
  canLearnTalent,
  normalizeRequires,
  pointsSpentInTree,
  rankDescription,
  rowGateLabel,
  rowUnlocked,
  treeLayout,
  treeRows,
} from "@/game/talentUtils";

interface TalentTreeCanvasProps {
  specId: string;
  talentRanks: TalentRanks;
  talentPoints: number;
  onLearn: (node: TalentNode) => void;
}

interface NodeRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function rowGate(nodes: TalentNode[], row: number): number {
  const onRow = nodes.filter((n) => (n.row ?? 0) === row);
  if (onRow.length === 0) return 0;
  return Math.min(...onRow.map((n) => n.requiresPoints ?? 0));
}

export function TalentTreeCanvas({ specId, talentRanks, talentPoints, onLearn }: TalentTreeCanvasProps) {
  const { cols, nodes } = treeLayout(specId);
  const rowIndices = treeRows(specId);
  const gridRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<NodeRect[]>([]);
  const spent = pointsSpentInTree(talentRanks);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const next: NodeRect[] = [];
    for (const node of nodes) {
      const el = grid.querySelector(`[data-talent-id="${node.id}"]`) as HTMLElement | null;
      if (!el) continue;
      next.push({
        id: node.id,
        x: el.offsetLeft + el.offsetWidth / 2,
        y: el.offsetTop + el.offsetHeight / 2,
        w: el.offsetWidth,
        h: el.offsetHeight,
      });
    }
    setRects(next);
  }, [nodes, talentRanks, talentPoints, specId]);

  const edges = useMemo(() => {
    const out: { from: string; to: string }[] = [];
    for (const node of nodes) {
      for (const parent of normalizeRequires(node.requires)) {
        out.push({ from: parent, to: node.id });
      }
    }
    return out;
  }, [nodes]);

  const byId = useMemo(() => Object.fromEntries(rects.map((r) => [r.id, r])), [rects]);

  const renderNode = (node: TalentNode) => {
    const rank = talentRanks[node.id] ?? 0;
    const maxRank = node.maxRank ?? 1;
    const learned = rank > 0;
    const check = canLearnTalent(node, specId, talentRanks, talentPoints);
    const canBuy = check.ok;
    const needsPoints = !rowUnlocked(node, talentRanks);
    const nextRank = rank + 1;
    const desc = rankDescription(node, nextRank);

    return (
      <button
        type="button"
        onClick={() => onLearn(node)}
        disabled={!canBuy}
        className={`pixel-btn w-full !p-2 !text-left min-h-[72px] disabled:opacity-45 ${
          learned ? "rarity-frame-uncommon" : ""
        } ${node.capstone ? "border-gold" : ""} ${node.choiceGroup && !learned ? "pixel-btn-gold" : ""}`}
      >
        <div className="flex items-start justify-between gap-1">
          <span className="pixel text-[8px] text-gold leading-tight">
            {node.capstone ? "★ " : ""}
            {node.name}
          </span>
          {maxRank > 1 && (
            <span className="pixel text-[7px] text-divine shrink-0">
              {rank}/{maxRank}
            </span>
          )}
        </div>
        <span className="block font-body text-[11px] opacity-85 mt-1 leading-snug line-clamp-3">
          {desc}
        </span>
        {learned && rank >= maxRank && (
          <span className="block pixel text-[7px] text-divine mt-1">MAXED</span>
        )}
        {!canBuy && !learned && needsPoints && (
          <span className="block pixel text-[7px] text-blood mt-1">
            Need {node.requiresPoints ?? 0} pts in tree
          </span>
        )}
        {!canBuy && !learned && !needsPoints && check.reason === "Requires parent" && (
          <span className="block pixel text-[7px] text-blood mt-1">LOCKED</span>
        )}
        {!canBuy && check.reason === "Choice taken" && (
          <span className="block pixel text-[7px] text-blood mt-1">CHOICE TAKEN</span>
        )}
      </button>
    );
  };

  return (
    <div className="border-2 border-black bg-card/80 overflow-x-auto">
      <div className="min-w-[340px] p-2">
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <p className="pixel text-[8px] text-muted-foreground">
            Points in tree: <span className="text-gold">{spent}</span>
          </p>
          <p className="pixel text-[8px] text-muted-foreground">
            Unspent: <span className="text-gold">{talentPoints}</span>
          </p>
        </div>

        <div className="relative">
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            {edges.map(({ from, to }) => {
              const a = byId[from];
              const b = byId[to];
              if (!a || !b) return null;
              const active = (talentRanks[from] ?? 0) > 0 && (talentRanks[to] ?? 0) > 0;
              return (
                <line
                  key={`${from}-${to}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={active ? "var(--color-gold)" : "rgba(255,255,255,0.15)"}
                  strokeWidth={active ? 2 : 1}
                />
              );
            })}
          </svg>

          <div ref={gridRef} className="relative space-y-2">
            {rowIndices.map((row) => {
              const gate = rowGate(nodes, row);
              const gateOpen = spent >= gate;
              const rowNodes = nodes.filter((n) => (n.row ?? 0) === row);
              return (
                <div
                  key={row}
                  className="grid gap-2 items-stretch"
                  style={{ gridTemplateColumns: `52px repeat(${cols}, minmax(0, 1fr))` }}
                >
                  <div
                    className={`flex flex-col items-center justify-center border-2 px-1 py-2 ${
                      gateOpen ? "border-gold/60 bg-gold/10" : "border-black/40 bg-black/20"
                    }`}
                    title={gate > 0 ? `Spend ${gate} points in this tree to unlock this row` : "Entry row"}
                  >
                    <span className={`pixel text-[7px] leading-tight text-center ${gateOpen ? "text-gold" : "text-muted-foreground"}`}>
                      {rowGateLabel(gate)}
                    </span>
                  </div>
                  {Array.from({ length: cols }, (_, col) => {
                    const node = rowNodes.find((n) => (n.col ?? 0) === col);
                    if (!node) {
                      return <div key={col} aria-hidden />;
                    }
                    return (
                      <div key={node.id} data-talent-id={node.id}>
                        {renderNode(node)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
