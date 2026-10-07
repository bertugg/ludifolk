"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { removeMember } from "./actions";

export function RemoveMemberButton({ groupId, profileId }: { groupId: string; profileId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await removeMember(groupId, profileId);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label="Remove member"
      onClick={handleClick}
      disabled={isPending}
    >
      ×
    </Button>
  );
}
