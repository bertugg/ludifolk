"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "feed", label: "Feed" },
  { key: "members", label: "Members" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function GroupTabs({ feed, members }: { feed: ReactNode; members: ReactNode }) {
  const [tab, setTab] = useState<TabKey>("feed");

  return (
    <>
      <div className="flex gap-4 border-b border-border">
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

      {tab === "feed" ? feed : members}
    </>
  );
}
