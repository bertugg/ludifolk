import type { Metadata } from "next";
import { BackButton } from "@/components/back-button";
import { ShareButton } from "@/components/share-button";
import { getWrappedData } from "./data";

function currentYear(): number {
  return new Date().getFullYear();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await getWrappedData(username, currentYear());
  if (!data) return { title: "Ludifolk" };

  return {
    title: `${data.name}'s ${data.year} Board Game Year | Ludifolk`,
    description: `${data.gamesPlayed} games, ${data.wins} wins, ${data.distinctOpponents} opponents.`,
  };
}

export default async function WrappedPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const year = currentYear();
  const data = await getWrappedData(username, year);

  if (!data) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="p-2">
          <BackButton fallbackHref="/" />
        </div>
        <div className="flex flex-1 items-center justify-center p-4 pt-0">
          <p className="text-sm text-muted-foreground">
            This profile doesn&apos;t exist or is private.
          </p>
        </div>
      </div>
    );
  }

  const { profile, name, gamesPlayed, wins, distinctOpponents, highlights } = data;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <BackButton fallbackHref={`/profile/${profile.username}`} />
        <ShareButton
          title={`${name}'s ${year} Board Game Year — Ludifolk`}
          referralSource={`wrapped:${profile.username}`}
        />
      </div>

      <div className="flex flex-col gap-6 rounded-2xl bg-gradient-to-br from-terracotta via-terracotta to-forest p-6 text-cream shadow-lg">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase opacity-80">{name}&apos;s</p>
          <h1 className="font-heading text-3xl font-bold leading-tight">{year} Board Game Year</h1>
        </div>

        {gamesPlayed === 0 ? (
          <p className="text-sm opacity-90">No games logged in {year} yet — the year is still young.</p>
        ) : (
          <>
            <div className="flex gap-6">
              <div>
                <p className="font-heading text-3xl font-bold">{gamesPlayed}</p>
                <p className="text-xs opacity-80">games</p>
              </div>
              <div>
                <p className="font-heading text-3xl font-bold">{wins}</p>
                <p className="text-xs opacity-80">wins</p>
              </div>
              <div>
                <p className="font-heading text-3xl font-bold">{distinctOpponents}</p>
                <p className="text-xs opacity-80">opponents</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {highlights.map((h) => (
                <div key={h.label} className="rounded-xl bg-cream/10 p-3">
                  <p className="text-xs font-semibold tracking-wide uppercase opacity-80">{h.label}</p>
                  <p className="font-heading text-lg font-semibold">{h.value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
