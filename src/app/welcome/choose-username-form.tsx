"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { chooseUsername } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Saving…" : "Continue"}
    </Button>
  );
}

export function ChooseUsernameForm({ suggestion }: { suggestion: string }) {
  const [state, formAction] = useActionState(chooseUsername, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          defaultValue={suggestion}
          placeholder="e.g. meeple_queen"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          minLength={3}
          maxLength={20}
          pattern="[a-z0-9_]{3,20}"
          autoFocus
          required
        />
        <p className="text-xs text-muted-foreground">
          Lowercase letters, numbers and underscores. Friends use it to @tag you and add you to games.
        </p>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
