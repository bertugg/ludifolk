"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { addComment, type CommentFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { MentionTextarea } from "@/components/mention-textarea";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} className="self-end">
      {pending ? "Posting…" : "Post"}
    </Button>
  );
}

export function CommentForm({ sessionId }: { sessionId: string }) {
  const [state, formAction] = useActionState<CommentFormState, FormData>(addComment, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="session_id" value={sessionId} />
      <MentionTextarea name="body" placeholder="Add a comment… (@username to tag)" rows={2} required maxLength={2000} />
      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
