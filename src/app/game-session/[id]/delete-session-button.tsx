"use client";

import { useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteGameSession } from "./actions";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Delete this game and its photos? This can't be undone.")) return;
    startTransition(async () => {
      // Redirects home on success; only an error comes back.
      const result = await deleteGameSession(sessionId);
      if (result?.error) window.alert(result.error);
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Delete result"
      onClick={handleClick}
      disabled={isPending}
      className="text-destructive hover:text-destructive"
    >
      <Trash2Icon className="size-4" />
    </Button>
  );
}
