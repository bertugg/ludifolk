"use client";

import { useState, useTransition } from "react";
import { HeartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleLike } from "@/lib/actions/likes";

export function LikeButton({
  sessionId,
  initialLiked,
  initialCount,
}: {
  sessionId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));

    startTransition(async () => {
      try {
        await toggleLike(sessionId);
      } catch {
        setLiked(!next);
        setCount((c) => c + (next ? -1 : 1));
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className={cn("gap-1.5", liked && "text-destructive")}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <HeartIcon className={cn("size-4", liked && "fill-current")} />
      {count > 0 && count}
    </Button>
  );
}
