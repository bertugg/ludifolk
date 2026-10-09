"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "all", label: "All" },
  { key: "for-you", label: "For You" },
  { key: "friends", label: "Friends" },
  { key: "groups", label: "Groups" },
] as const;

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
      <div className="flex gap-4 border-b border-border px-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-0.5 py-2.5 text-sm font-medium",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {panels[tab]}
    </>
  );
}
