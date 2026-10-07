export type ParticipantForDisplay = {
  guest_name: string | null;
  score: number | null;
  position: number | null;
  is_winner: boolean;
  confirmation_status?: string;
  profile: { username: string; display_name: string | null; avatar_url?: string | null } | null;
};

export function participantDisplayName(p: ParticipantForDisplay): string {
  return p.profile?.display_name || p.profile?.username || p.guest_name || "Unknown";
}

export function sortParticipants<T extends ParticipantForDisplay>(participants: T[]): T[] {
  return [...participants].sort((a, b) => {
    if (a.is_winner !== b.is_winner) return a.is_winner ? -1 : 1;
    if (a.score !== null && b.score !== null) return b.score - a.score;
    if (a.position !== null && b.position !== null) return a.position - b.position;
    return 0;
  });
}

export function relativeTime(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  const diffWeek = Math.round(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function sessionHeadline(
  scoringType: string,
  cooperativeOutcome: string | null,
  winnerName: string | null | undefined,
): string {
  if (scoringType === "cooperative") {
    return `The team ${cooperativeOutcome === "win" ? "won" : "lost"}`;
  }
  return winnerName ? `🏆 ${winnerName} won` : "Game logged";
}
