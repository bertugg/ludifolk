"use client";

import { useState } from "react";
import { CheckIcon, ShareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButton({
  title,
  path,
  variant = "outline",
  size = "sm",
  iconOnly = false,
}: {
  title: string;
  /** Path to share, e.g. "/game-session/123". Defaults to the current page. */
  path?: string;
  variant?: "outline" | "ghost";
  size?: "sm" | "default";
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const url = path ? `${window.location.origin}${path}` : window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user dismissed the share sheet — nothing to do
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={iconOnly ? "icon-sm" : size}
      onClick={handleClick}
      className={iconOnly ? undefined : "gap-1.5"}
      aria-label={iconOnly ? "Share" : undefined}
    >
      {copied ? <CheckIcon className="size-4" /> : <ShareIcon className="size-4" />}
      {!iconOnly && (copied ? "Copied!" : "Share")}
    </Button>
  );
}
