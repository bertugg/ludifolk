import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { basicStats } from "@/lib/stats";

export const alt = "Boardly profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TERRACOTTA = "#C75A3A";
const FOREST = "#2E6B57";
const CREAM = "#FBF5EE";
const CHARCOAL = "#1F2033";

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
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

  const { data: participations } = await supabase
    .from("game_participants")
    .select("score, position, is_winner")
    .eq("profile_id", profile.id)
    .eq("confirmation_status", "confirmed");

  const { gamesPlayed, wins, winRate } = basicStats(participations ?? []);
  const name = profile.display_name || profile.username;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CREAM,
          padding: 64,
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: TERRACOTTA }}>Boardly</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              width={96}
              height={96}
              style={{ borderRadius: "50%", objectFit: "cover" }}
              alt=""
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: FOREST,
                color: CREAM,
                fontSize: 40,
                fontWeight: 700,
              }}
            >
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: CHARCOAL }}>{name}</div>
          <div style={{ display: "flex", fontSize: 28, color: CHARCOAL, opacity: 0.6 }}>@{profile.username}</div>
        </div>

        {gamesPlayed > 0 && (
          <div style={{ display: "flex", gap: 48 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: CHARCOAL }}>{gamesPlayed}</div>
              <div style={{ display: "flex", fontSize: 20, color: CHARCOAL, opacity: 0.6 }}>games</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: CHARCOAL }}>{wins}</div>
              <div style={{ display: "flex", fontSize: 20, color: CHARCOAL, opacity: 0.6 }}>wins</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: CHARCOAL }}>{winRate}%</div>
              <div style={{ display: "flex", fontSize: 20, color: CHARCOAL, opacity: 0.6 }}>win rate</div>
            </div>
          </div>
        )}
      </div>
    ),
    size,
  );
}
