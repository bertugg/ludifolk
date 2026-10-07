"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteComment } from "./actions";

export function DeleteCommentButton({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await deleteComment(commentId);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label="Delete comment"
      onClick={handleClick}
      disabled={isPending}
    >
      ×
    </Button>
  );
}
