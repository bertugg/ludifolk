export type StatsRow = { score: number | null; position: number | null; is_winner: boolean };

export function basicStats(rows: StatsRow[]) {
  const gamesPlayed = rows.length;
  const wins = rows.filter((r) => r.is_winner).length;
  const winRate = gamesPlayed ? Math.round((wins / gamesPlayed) * 100) : 0;
  return { gamesPlayed, wins, winRate };
}

function average(values: number[]): number {
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function numericStats(rows: StatsRow[]) {
  const scores = rows.map((r) => r.score).filter((s): s is number => s !== null);
  if (!scores.length) return { averageScore: null, personalBest: null };
  return { averageScore: average(scores), personalBest: Math.max(...scores) };
}

export function positionStats(rows: StatsRow[]) {
  const positions = rows.map((r) => r.position).filter((p): p is number => p !== null);
  if (!positions.length) return { averagePosition: null };
  return { averagePosition: average(positions) };
}
