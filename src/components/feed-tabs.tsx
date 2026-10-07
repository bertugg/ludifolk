"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "for-you", label: "For You" },
  { key: "friends", label: "Friends" },
  { key: "groups", label: "Groups" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function FeedTabs({ forYou, friends }: { forYou: ReactNode; friends: ReactNode }) {
  const [tab, setTab] = useState<TabKey>("for-you");

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

      {tab === "for-you" && forYou}
      {tab === "friends" && friends}
      {tab === "groups" && (
        <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
          <p className="text-sm font-medium">Coming soon</p>
          <p className="text-xs text-muted-foreground">Join a group to see its activity here.</p>
        </div>
      )}
    </>
  );
}
