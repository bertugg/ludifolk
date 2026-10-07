"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleFollow } from "@/lib/actions/follows";

export function FollowButton({
  profileId,
  initialFollowing,
}: {
  profileId: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !following;
    setFollowing(next);

    startTransition(async () => {
      try {
        await toggleFollow(profileId);
      } catch {
        setFollowing(!next);
      }
    });
  }

  return (
    <Button
      type="button"
      variant={following ? "outline" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}
