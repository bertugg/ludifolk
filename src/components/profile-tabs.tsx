"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "history", label: "History" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ProfileTabs({ overview, history }: { overview: ReactNode; history: ReactNode }) {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div className="w-full max-w-sm">
      <div className="flex gap-4 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-0.5 py-2.5 text-sm font-medium",
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? overview : history}
    </div>
  );
}
