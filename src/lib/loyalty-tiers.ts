export const TIERS = [
  { name: "bronze", label: "Bronze", minPoints: 0, multiplier: 1, color: "bg-amber-600" },
  { name: "silver", label: "Silver", minPoints: 500, multiplier: 1.5, color: "bg-gray-400" },
  { name: "gold", label: "Gold", minPoints: 2000, multiplier: 2, color: "bg-yellow-500" },
  { name: "platinum", label: "Platinum", minPoints: 5000, multiplier: 3, color: "bg-slate-300" },
] as const;

export function getTier(points: number) {
  let tier: { name: string; label: string; minPoints: number; multiplier: number; color: string } = TIERS[0];
  for (const t of TIERS) {
    if (points >= t.minPoints) tier = t;
  }
  return tier;
}

export function getNextTier(points: number) {
  for (const t of TIERS) {
    if (points < t.minPoints) return t;
  }
  return null;
}
