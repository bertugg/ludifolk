"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { logGame, type LogGameFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/button-link";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameCombobox } from "@/components/game-combobox";
import { ScoreEntryFields } from "@/components/score-entry-fields";
import { computeCategoryTotal, parseScoringSchema, playerCategories, teamCategories } from "@/lib/scoring";
import type { GameSummary } from "@/lib/actions/search-games";

type Row = {
  id: string;
  name: string;
  score: string;
  position: string;
  winner: boolean;
  breakdown: Record<string, string>;
  showDetails: boolean;
};
type GroupMember = { id: string; username: string; display_name: string | null };
type Group = { id: string; name: string; members: GroupMember[] };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

function SuccessView({
  state,
  onLogAnother,
}: {
  state: Extract<LogGameFormState, { success: unknown }>;
  onLogAnother: () => void;
}) {
  const { success } = state;
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Logged</p>
        <h2 className="font-heading text-lg font-semibold">{success.gameTitle}</h2>
        <ul className="flex flex-col gap-1.5">
          {success.players.map((p, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                {p.isWinner && "🏆"} {p.name}
              </span>
              <span className="text-muted-foreground">
                {p.score !== null ? p.score : p.position !== null ? `#${p.position}` : ""}
              </span>
            </li>
          ))}
        </ul>
        {success.cooperativeOutcome && (
          <Badge variant={success.cooperativeOutcome === "win" ? "default" : "secondary"}>
            Team {success.cooperativeOutcome === "win" ? "won" : "lost"}
          </Badge>
        )}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onLogAnother}>
            Log another
          </Button>
          <ButtonLink href={`/game-session/${success.sessionId}`} className="flex-1">
            View result
          </ButtonLink>
        </div>
      </CardContent>
    </Card>
  );
}

function memberLabel(m: GroupMember) {
  return m.display_name || m.username;
}

function PhotoPicker() {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="photos">Photos</Label>
      <Input
        id="photos"
        name="photos"
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          previews.forEach((url) => URL.revokeObjectURL(url));
          const files = e.target.files ? Array.from(e.target.files) : [];
          setPreviews(files.map((f) => URL.createObjectURL(f)));
        }}
      />
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL, not a remote image
            <img key={i} src={src} alt="" className="size-16 rounded-lg object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}

function emptyRow(id: string, name = ""): Row {
  return { id, name, score: "", position: "", winner: false, breakdown: {}, showDetails: false };
}

export function LogGameForm({
  initialGames,
  ownUsername,
  ownDisplayName,
  groups,
}: {
  initialGames: GameSummary[];
  ownUsername: string;
  ownDisplayName: string | null;
  groups: Group[];
}) {
  const [attempt, setAttempt] = useState(0);
  return (
    <LogGameFormInner
      key={attempt}
      initialGames={initialGames}
      ownUsername={ownUsername}
      ownDisplayName={ownDisplayName}
      groups={groups}
      onLogAnother={() => setAttempt((a) => a + 1)}
    />
  );
}

function LogGameFormInner({
  initialGames,
  ownUsername,
  ownDisplayName,
  groups,
  onLogAnother,
}: {
  initialGames: GameSummary[];
  ownUsername: string;
  ownDisplayName: string | null;
  groups: Group[];
  onLogAnother: () => void;
}) {
  const [state, formAction] = useActionState(logGame, null);
  const selfRowId = useId();
  const [selectedGame, setSelectedGame] = useState<GameSummary | null>(null);
  const [groupId, setGroupId] = useState("none");
  const [rows, setRows] = useState<Row[]>([emptyRow(selfRowId, ownUsername)]);
  const [teamDetails, setTeamDetails] = useState<Record<string, string>>({});

  const scoringType = selectedGame?.scoring_type ?? "numeric";
  const selectedGroup = groups.find((g) => g.id === groupId) ?? null;
  const schema = parseScoringSchema(selectedGame?.scoring_schema);
  const playerCats = playerCategories(schema);
  const teamCats = teamCategories(schema);

  if (state && "success" in state) {
    return <SuccessView state={state} onLogAnother={onLogAnother} />;
  }

  function handleGroupChange(value: string | null) {
    setGroupId(value ?? "none");
    const group = groups.find((g) => g.id === value) ?? null;
    if (!group) return;
    // Switching into a group whose roster doesn't include some already-added
    // free-text players — drop anything that isn't a member (self always is).
    const memberUsernames = new Set(group.members.map((m) => m.username.toLowerCase()));
    setRows((r) => r.filter((row) => row.id === selfRowId || memberUsernames.has(row.name.toLowerCase())));
  }

  function addRow() {
    setRows((r) => [...r, emptyRow(crypto.randomUUID())]);
  }

  function removeRow(id: string) {
    setRows((r) => r.filter((row) => row.id !== id));
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function updateRowCategory(id: string, key: string, value: string) {
    setRows((r) =>
      r.map((row) => {
        if (row.id !== id) return row;
        const breakdown = { ...row.breakdown, [key]: value };
        const numeric = Object.fromEntries(
          Object.entries(breakdown).map(([k, v]) => [k, v.trim() ? Number(v) : null]),
        );
        const total = computeCategoryTotal(numeric, playerCats);
        return { ...row, breakdown, score: total !== null ? String(total) : row.score };
      }),
    );
  }

  const usedNames = new Set(rows.map((r) => r.name.toLowerCase()).filter(Boolean));
  const canAddMoreRows = selectedGroup ? rows.length < selectedGroup.members.length : true;

  const groupItems = [{ value: "none", label: "No group" }, ...groups.map((g) => ({ value: g.id, label: g.name }))];

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="game_id">Game</Label>
        <GameCombobox id="game_id" initialGames={initialGames} value={selectedGame} onSelect={setSelectedGame} />
        <input type="hidden" name="game_id" value={selectedGame?.id ?? ""} />
      </div>

      {groups.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group_id">Group</Label>
          <Select name="group_id" value={groupId} onValueChange={handleGroupChange} items={groupItems}>
            <SelectTrigger id="group_id" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No group</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label>Players</Label>
        {rows.map((row) => {
          const isSelf = row.id === selfRowId;
          const memberItems = selectedGroup
            ? selectedGroup.members
                .filter((m) => m.username === row.name || !usedNames.has(m.username.toLowerCase()))
                .map((m) => ({ value: m.username, label: memberLabel(m) }))
            : [];
          return (
            <div key={row.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {selectedGroup ? (
                  <Select
                    name={`participant-${row.id}-name`}
                    value={row.name || undefined}
                    onValueChange={(v) => updateRow(row.id, { name: v ?? "" })}
                    items={memberItems}
                  >
                    <SelectTrigger className="w-full flex-1">
                      <SelectValue placeholder="Choose a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {memberItems.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    name={`participant-${row.id}-name`}
                    placeholder={isSelf ? ownDisplayName || ownUsername : "Name or Boardly username"}
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    className="flex-1"
                  />
                )}
                {scoringType === "numeric" && (
                  <Input
                    name={`participant-${row.id}-score`}
                    type="number"
                    placeholder="Score"
                    value={row.score}
                    onChange={(e) => updateRow(row.id, { score: e.target.value })}
                    readOnly={row.showDetails && computeCategoryTotal(
                      Object.fromEntries(
                        Object.entries(row.breakdown).map(([k, v]) => [k, v.trim() ? Number(v) : null]),
                      ),
                      playerCats,
                    ) !== null}
                    className="w-20"
                  />
                )}
                {scoringType === "position" && (
                  <Input
                    name={`participant-${row.id}-position`}
                    type="number"
                    min={1}
                    placeholder="Pos"
                    value={row.position}
                    onChange={(e) => updateRow(row.id, { position: e.target.value })}
                    className="w-16"
                  />
                )}
                {scoringType === "winner_only" && (
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      name={`participant-${row.id}-winner`}
                      checked={row.winner}
                      onCheckedChange={(checked) => updateRow(row.id, { winner: checked === true })}
                    />
                    <span className="text-xs text-muted-foreground">Won</span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  aria-label="Remove player"
                >
                  ×
                </Button>
              </div>

              {scoringType === "numeric" && playerCats.length > 0 && (
                <>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto w-fit self-start p-0 text-xs"
                    onClick={() => updateRow(row.id, { showDetails: !row.showDetails })}
                  >
                    {row.showDetails ? "Hide detailed score" : "Add detailed score"}
                  </Button>
                  {row.showDetails && (
                    <ScoreEntryFields
                      fieldPrefix={`participant-${row.id}`}
                      categories={playerCats}
                      values={row.breakdown}
                      onChange={(key, value) => updateRowCategory(row.id, key, value)}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={!canAddMoreRows} className="self-start">
          Add player
        </Button>
      </div>

      {scoringType === "cooperative" && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <Label htmlFor="cooperative_outcome">Team outcome</Label>
          <Select
            name="cooperative_outcome"
            defaultValue="win"
            items={[
              { value: "win", label: "Won" },
              { value: "loss", label: "Lost" },
            ]}
          >
            <SelectTrigger id="cooperative_outcome" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="win">Won</SelectItem>
              <SelectItem value="loss">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Label htmlFor="cooperative_score">Team score (optional)</Label>
          <Input id="cooperative_score" name="cooperative_score" type="number" />
        </div>
      )}

      {teamCats.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Game details</Label>
          <ScoreEntryFields
            fieldPrefix="team"
            categories={teamCats}
            values={teamDetails}
            onChange={(key, value) => setTeamDetails((d) => ({ ...d, [key]: value }))}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="played_at">Date</Label>
          <Input id="played_at" name="played_at" type="date" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" placeholder="Optional" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} placeholder="Optional" />
      </div>

      <PhotoPicker />

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
