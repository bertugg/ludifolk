import { ImageResponse } from "next/og";
import { participantDisplayName, sessionHeadline, sortParticipants } from "@/lib/session-display";
import { getSessionData } from "./data";

export const alt = "Ludifolk game result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TERRACOTTA = "#C75A3A";
const FOREST = "#2E6B57";
const CREAM = "#FBF5EE";
const CHARCOAL = "#1F2033";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionData(id);

  if (!session || !session.game) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: CREAM,
            fontSize: 64,
            color: TERRACOTTA,
            fontWeight: 700,
          }}
        >
          Ludifolk
        </div>
      ),
      size,
    );
  }

  const game = session.game;
  const players = sortParticipants(session.participants);
  const winner = players.find((p) => p.is_winner);
  const winnerName = winner && participantDisplayName(winner);
  const headline = sessionHeadline(game.scoring_type, session.cooperative_outcome, winnerName);
  const others = winner ? players.filter((p) => p !== winner).slice(0, 4) : players.slice(0, 5);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: CREAM,
          padding: 56,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: TERRACOTTA }}>Ludifolk</div>
            <div style={{ display: "flex", fontSize: 28, color: CHARCOAL, opacity: 0.7 }}>{game.title}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: CHARCOAL }}>{headline}</div>
            {game.scoring_type !== "cooperative" && winner?.score !== null && winner?.score !== undefined && (
              <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: TERRACOTTA }}>
                {winner.score} points
              </div>
            )}
            {game.scoring_type === "cooperative" && session.cooperative_score !== null && (
              <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: FOREST }}>
                {session.cooperative_score} points
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {others.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  fontSize: 24,
                  color: CHARCOAL,
                  background: "rgba(167,183,163,0.3)",
                  padding: "8px 16px",
                  borderRadius: 999,
                }}
              >
                {participantDisplayName(p)}
              </div>
            ))}
          </div>
        </div>

        {game.image_url && (
          <div
            style={{
              display: "flex",
              width: 360,
              height: "100%",
              borderRadius: 24,
              overflow: "hidden",
              marginLeft: 32,
            }}
          >
            <img src={game.image_url} width={360} height="100%" style={{ objectFit: "cover" }} alt="" />
          </div>
        )}
      </div>
    ),
    size,
  );
}
