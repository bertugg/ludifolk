import { ImageResponse } from "next/og";
import { getWrappedData } from "./data";

export const alt = "Boardly year in review";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TERRACOTTA = "#C75A3A";
const FOREST = "#2E6B57";
const CREAM = "#FBF5EE";

function currentYear(): number {
  return new Date().getFullYear();
}

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const year = currentYear();
  const data = await getWrappedData(username, year);

  if (!data) {
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
          Boardly
        </div>
      ),
      size,
    );
  }

  const { name, gamesPlayed, wins, distinctOpponents, highlights } = data;
  const topHighlight = highlights[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, ${TERRACOTTA} 0%, ${FOREST} 100%)`,
          color: CREAM,
          padding: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, opacity: 0.85 }}>{name}&apos;s</div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
            {year} Board Game Year
          </div>
        </div>

        {gamesPlayed === 0 ? (
          <div style={{ display: "flex", fontSize: 32, opacity: 0.9 }}>The year is still young.</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 56 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 56, fontWeight: 700 }}>{gamesPlayed}</div>
                <div style={{ display: "flex", fontSize: 22, opacity: 0.8 }}>games</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 56, fontWeight: 700 }}>{wins}</div>
                <div style={{ display: "flex", fontSize: 22, opacity: 0.8 }}>wins</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 56, fontWeight: 700 }}>{distinctOpponents}</div>
                <div style={{ display: "flex", fontSize: 22, opacity: 0.8 }}>opponents</div>
              </div>
            </div>

            {topHighlight && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "rgba(251,245,238,0.15)",
                  borderRadius: 20,
                  padding: "16px 24px",
                  width: "fit-content",
                }}
              >
                <div style={{ display: "flex", fontSize: 20, fontWeight: 600, opacity: 0.8 }}>
                  {topHighlight.label.toUpperCase()}
                </div>
                <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>{topHighlight.value}</div>
              </div>
            )}
          </>
        )}
      </div>
    ),
    size,
  );
}
