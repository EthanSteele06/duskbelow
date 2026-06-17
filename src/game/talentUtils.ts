import { TALENT_TREES, type TalentNode } from "@/game/talents";

export const V2_TALENT_SPECS = new Set([
  "arms",
  "fury",
  "protection",
  "assassination",
  "outlaw",
  "subtlety",
  "blood_dk",
  "frost_dk",
  "unholy",
]);

export function isV2TalentTree(specId: string | null): boolean {
  return !!specId && V2_TALENT_SPECS.has(specId);
}

export function normalizeRequires(req?: string | string[]): string[] {
  if (!req) return [];
  return Array.isArray(req) ? req : [req];
}

export function pointsSpentInTree(talentRanks: Record<string, number>): number {
  return Object.values(talentRanks).reduce((sum, r) => sum + r, 0);
}

export function requirementsMet(node: TalentNode, talentRanks: Record<string, number>): boolean {
  return normalizeRequires(node.requires).every((id) => (talentRanks[id] ?? 0) >= 1);
}

export function rowUnlocked(node: TalentNode, talentRanks: Record<string, number>): boolean {
  const need = node.requiresPoints ?? 0;
  return pointsSpentInTree(talentRanks) >= need;
}

export function choiceGroupTaken(
  node: TalentNode,
  specId: string,
  talentRanks: Record<string, number>,
): boolean {
  if (!node.choiceGroup) return false;
  const tree = TALENT_TREES[specId] ?? [];
  return tree.some(
    (n) =>
      n.choiceGroup === node.choiceGroup &&
      n.id !== node.id &&
      (talentRanks[n.id] ?? 0) > 0,
  );
}

export function capstoneBlocked(
  node: TalentNode,
  specId: string,
  talentRanks: Record<string, number>,
): boolean {
  if (!node.capstone || node.choiceGroup) return false;
  const tree = TALENT_TREES[specId] ?? [];
  return tree.some((n) => n.capstone && !n.choiceGroup && n.id !== node.id && (talentRanks[n.id] ?? 0) > 0);
}

export function canLearnTalent(
  node: TalentNode,
  specId: string | null,
  talentRanks: Record<string, number>,
  talentPoints: number,
): { ok: boolean; reason?: string } {
  if (!specId) return { ok: false, reason: "No specialization" };
  const rank = talentRanks[node.id] ?? 0;
  const maxRank = node.maxRank ?? 1;
  if (rank >= maxRank) return { ok: false, reason: "Max rank" };
  if (talentPoints < 1) return { ok: false, reason: "No points" };
  if (!requirementsMet(node, talentRanks)) return { ok: false, reason: "Requires parent" };
  if (!rowUnlocked(node, talentRanks)) return { ok: false, reason: "Need more points in tree" };
  if (choiceGroupTaken(node, specId, talentRanks)) return { ok: false, reason: "Choice taken" };
  if (capstoneBlocked(node, specId, talentRanks)) return { ok: false, reason: "Capstone taken" };
  return { ok: true };
}

export function treeLayout(specId: string): { rows: number; cols: number; nodes: TalentNode[] } {
  const nodes = TALENT_TREES[specId] ?? [];
  let rows = 1;
  let cols = 1;
  for (const n of nodes) {
    if (n.row != null) rows = Math.max(rows, n.row + 1);
    if (n.col != null) cols = Math.max(cols, n.col + 1);
  }
  return { rows, cols, nodes };
}

export function rankDescription(node: TalentNode, rank: number): string {
  if (node.rankDescs && node.rankDescs[rank - 1]) return node.rankDescs[rank - 1];
  return node.desc;
}
