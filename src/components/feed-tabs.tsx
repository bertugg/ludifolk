"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "all", label: "All", hidden: false },
  { key: "for-you", label: "For You", hidden: true },
  { key: "friends", label: "Friends", hidden: true },
  { key: "groups", label: "Groups", hidden: true },
] as const;

const VISIBLE_TABS = TABS.filter((t) => !t.hidden);

type TabKey = (typeof TABS)[number]["key"];

export function FeedTabs({
  all,
  forYou,
  friends,
  groups,
}: {
  all: ReactNode;
  forYou: ReactNode;
  friends: ReactNode;
  groups: ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>("all");
  const panels = { all, "for-you": forYou, friends, groups };

  return (
    <>
      {/* A single visible tab needs no switcher — just show its panel. */}
      {VISIBLE_TABS.length > 1 && (
        <div
          className="grid border-b border-border/70"
          style={{ gridTemplateColumns: `repeat(${Math.max(3, VISIBLE_TABS.length)}, minmax(0, 1fr))` }}
        >
          {VISIBLE_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px mx-auto w-4/5 border-b-2 py-2.5 text-sm",
                tab === t.key
                  ? "border-primary font-medium text-primary"
                  : "border-transparent text-foreground/75",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {panels[tab]}
    </>
  );
}
