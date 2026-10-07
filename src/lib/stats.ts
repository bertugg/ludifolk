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

export function percentileRank(score: number, allScores: number[]): number {
  if (!allScores.length) return 100;
  const atOrBelow = allScores.filter((s) => s <= score).length;
  return Math.round((atOrBelow / allScores.length) * 100);
}

export function performanceLabel(percentile: number): string {
  if (percentile >= 80) return "Excellent performance";
  if (percentile >= 50) return "Solid performance";
  if (percentile >= 20) return "Room to grow";
  return "Everyone has an off game";
}

export function headToHeadResult(
  scoringType: string,
  mine: StatsRow,
  theirs: StatsRow,
): "win" | "loss" | "tie" | null {
  if (scoringType === "numeric" && mine.score !== null && theirs.score !== null) {
    return mine.score > theirs.score ? "win" : mine.score < theirs.score ? "loss" : "tie";
  }
  if (scoringType === "position" && mine.position !== null && theirs.position !== null) {
    return mine.position < theirs.position ? "win" : mine.position > theirs.position ? "loss" : "tie";
  }
  if (scoringType === "winner_only") {
    return mine.is_winner === theirs.is_winner ? "tie" : mine.is_winner ? "win" : "loss";
  }
  return null;
}

export function longestWinStreak(rowsSortedByDate: { is_winner: boolean }[]): number {
  let longest = 0;
  let current = 0;
  for (const r of rowsSortedByDate) {
    if (r.is_winner) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}
