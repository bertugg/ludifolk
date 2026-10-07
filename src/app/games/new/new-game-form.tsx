"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createGame } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SCORING_TYPES } from "@/lib/games";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add game"}
    </Button>
  );
}

export function NewGameForm() {
  const [state, formAction] = useActionState(createGame, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" name="image_url" type="url" placeholder="https://…" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="publisher">Publisher</Label>
        <Input id="publisher" name="publisher" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="year_published">Year published</Label>
          <Input id="year_published" name="year_published" type="number" min={1} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scoring_type">Scoring type</Label>
          <Select name="scoring_type" defaultValue="numeric">
            <SelectTrigger id="scoring_type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCORING_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="min_players">Min players</Label>
          <Input id="min_players" name="min_players" type="number" min={1} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="max_players">Max players</Label>
          <Input id="max_players" name="max_players" type="number" min={1} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="playtime_minutes_min">Playtime min (minutes)</Label>
          <Input id="playtime_minutes_min" name="playtime_minutes_min" type="number" min={1} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="playtime_minutes_max">Playtime max (minutes)</Label>
          <Input id="playtime_minutes_max" name="playtime_minutes_max" type="number" min={1} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="categories">Categories</Label>
        <Input id="categories" name="categories" placeholder="Strategy, Family (comma separated)" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mechanics">Mechanics</Label>
        <Input id="mechanics" name="mechanics" placeholder="Worker placement, Drafting (comma separated)" />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
