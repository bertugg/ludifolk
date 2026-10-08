"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { inviteMember, type InviteMemberFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Inviting…" : "Invite"}
    </Button>
  );
}

export function InviteMemberForm({ groupId }: { groupId: string }) {
  const [state, formAction] = useActionState<InviteMemberFormState, FormData>(inviteMember, null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state && "ok" in state) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="group_id" value={groupId} />
      <div className="flex gap-2">
        <Input name="username" placeholder="Ludifolk username" className="flex-1" />
        <SubmitButton />
      </div>
      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
