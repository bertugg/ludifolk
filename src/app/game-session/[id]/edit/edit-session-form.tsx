"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateGameResult, type EditResultFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MentionTextarea } from "@/components/mention-textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScoreEntryFields } from "@/components/score-entry-fields";
import { ChoiceFields } from "@/components/choice-fields";
import { ChoiceGroupFields } from "@/components/choice-group-fields";
import { participantDisplayName } from "@/lib/session-display";
import {
  categoryEntryValue,
  computeCategoryTotal,
  parseBreakdown,
  parseChoiceGroups,
  parseChoices,
  parseScoringSchema,
  playerCategories,
  playerChoiceFields,
  playerChoiceGroups,
  teamCategories,
  teamChoiceFields,
  teamChoiceGroups,
  type ChoiceGroups,
  type Choices,
  type ScoringCategory,
} from "@/lib/scoring";
import { getSessionData } from "../data";

/** Stored breakdown → score-entry field strings (penalties shown as their plain amount). */
function toEntryStrings(raw: unknown, categories: ScoringCategory[]): Record<string, string> {
  const parsed = parseBreakdown(raw);
  return Object.fromEntries(
    Object.entries(parsed).map(([k, v]) => {
      if (v === null || v === undefined) return [k, ""];
      const category = categories.find((c) => c.key === k);
      return [k, String(category ? categoryEntryValue(category, v) : v)];
    }),
  );
}

type SessionData = NonNullable<Awaited<ReturnType<typeof getSessionData>>>;
type GameData = NonNullable<SessionData["game"]>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export function EditSessionForm({ session, game }: { session: SessionData; game: GameData }) {
  const [state, formAction] = useActionState<EditResultFormState, FormData>(updateGameResult, null);
  const schema = parseScoringSchema(game.scoring_schema);
  const playerCats = playerCategories(schema);
  const teamCats = teamCategories(schema);
  const playerChoices = playerChoiceFields(schema);
  const teamChoiceList = teamChoiceFields(schema);
  const playerGroups = playerChoiceGroups(schema);
  const teamGroupList = teamChoiceGroups(schema);

  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(session.participants.map((p) => [p.id, p.score !== null ? String(p.score) : ""])),
  );
  const [positions, setPositions] = useState<Record<string, string>>(
    Object.fromEntries(session.participants.map((p) => [p.id, p.position !== null ? String(p.position) : ""])),
  );
  const [winners, setWinners] = useState<Record<string, boolean>>(
    Object.fromEntries(session.participants.map((p) => [p.id, p.is_winner])),
  );
  const [breakdowns, setBreakdowns] = useState<Record<string, Record<string, string>>>(
    Object.fromEntries(
      session.participants.map((p) => [p.id, toEntryStrings(p.score_breakdown, playerCats)]),
    ),
  );
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>(
    Object.fromEntries(session.participants.map((p) => [p.id, hasAny(p.score_breakdown)])),
  );
  const [teamDetails, setTeamDetails] = useState<Record<string, string>>(() =>
    toEntryStrings(session.team_details, teamCats),
  );
  const [choices, setChoices] = useState<Record<string, Choices>>(
    Object.fromEntries(session.participants.map((p) => [p.id, parseChoices(p.choices)])),
  );
  const [teamChoices, setTeamChoices] = useState<Choices>(() => parseChoices(session.team_choices));
  const [groups, setGroups] = useState<Record<string, ChoiceGroups>>(
    Object.fromEntries(session.participants.map((p) => [p.id, parseChoiceGroups(p.choices)])),
  );
  const [teamGroups, setTeamGroups] = useState<ChoiceGroups>(() => parseChoiceGroups(session.team_choices));

  function hasAny(raw: unknown) {
    const parsed = parseBreakdown(raw);
    return Object.values(parsed).some((v) => v !== null && v !== undefined);
  }

  function updateBreakdown(participantId: string, key: string, value: string) {
    setBreakdowns((prev) => {
      const next = { ...prev, [participantId]: { ...prev[participantId], [key]: value } };
      const numeric = Object.fromEntries(
        Object.entries(next[participantId]).map(([k, v]) => [k, v.trim() ? Number(v) : null]),
      );
      const total = computeCategoryTotal(numeric, playerCats);
      if (total !== null) {
        setScores((s) => ({ ...s, [participantId]: String(total) }));
      }
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="session_id" value={session.id} />

      <div className="flex flex-col gap-2">
        <Label>Players</Label>
        {session.participants.map((p) => {
          const name = participantDisplayName(p);
          const breakdownValues = breakdowns[p.id] ?? {};
          const numericBreakdown = Object.fromEntries(
            Object.entries(breakdownValues).map(([k, v]) => [k, v.trim() ? Number(v) : null]),
          );
          const computedTotal = computeCategoryTotal(numericBreakdown, playerCats);
          const showScoreFields = game.scoring_type === "numeric" && playerCats.length > 0 && showDetails[p.id];

          return (
            <div key={p.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-2.5">
              <input type="hidden" name="participant_id" value={p.id} />
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm font-medium">{name}</span>
                {game.scoring_type === "numeric" && (
                  <Input
                    name={`participant-${p.id}-score`}
                    type="number"
                    placeholder="Score"
                    value={scores[p.id] ?? ""}
                    onChange={(e) => setScores((s) => ({ ...s, [p.id]: e.target.value }))}
                    readOnly={showDetails[p.id] && computedTotal !== null}
                    className="w-20"
                  />
                )}
                {game.scoring_type === "position" && (
                  <Input
                    name={`participant-${p.id}-position`}
                    type="number"
                    min={1}
                    placeholder="Pos"
                    value={positions[p.id] ?? ""}
                    onChange={(e) => setPositions((s) => ({ ...s, [p.id]: e.target.value }))}
                    className="w-16"
                  />
                )}
                {game.scoring_type === "winner_only" && (
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      name={`participant-${p.id}-winner`}
                      checked={winners[p.id] ?? false}
                      onCheckedChange={(checked) => setWinners((s) => ({ ...s, [p.id]: checked === true }))}
                    />
                    <span className="text-xs text-muted-foreground">Won</span>
                  </div>
                )}
              </div>

              {game.scoring_type === "numeric" && playerCats.length > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto w-fit self-start p-0 text-xs"
                  onClick={() => setShowDetails((s) => ({ ...s, [p.id]: !s[p.id] }))}
                >
                  {showDetails[p.id] ? "Hide detailed score" : "Add detailed score"}
                </Button>
              )}

              {(playerChoices.length > 0 || playerGroups.length > 0 || showScoreFields) && (
                <div className="flex flex-col gap-2.5 rounded-lg bg-muted/60 p-2.5">
                  {playerGroups.length > 0 && (
                    <ChoiceGroupFields
                      fieldPrefix={`participant-${p.id}`}
                      groups={playerGroups}
                      values={groups[p.id] ?? {}}
                      onChange={(key, groupRows) =>
                        setGroups((g) => ({ ...g, [p.id]: { ...g[p.id], [key]: groupRows } }))
                      }
                    />
                  )}
                  {playerChoices.length > 0 && (
                    <ChoiceFields
                      fieldPrefix={`participant-${p.id}`}
                      fields={playerChoices}
                      values={choices[p.id] ?? {}}
                      onChange={(key, values) =>
                        setChoices((c) => ({ ...c, [p.id]: { ...c[p.id], [key]: values } }))
                      }
                    />
                  )}
                  {showScoreFields && (
                    <ScoreEntryFields
                      fieldPrefix={`participant-${p.id}`}
                      categories={playerCats}
                      values={breakdownValues}
                      onChange={(key, value) => updateBreakdown(p.id, key, value)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {game.scoring_type === "cooperative" && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <Label htmlFor="cooperative_outcome">Team outcome</Label>
          <Select
            name="cooperative_outcome"
            defaultValue={session.cooperative_outcome ?? "win"}
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
          <Input
            id="cooperative_score"
            name="cooperative_score"
            type="number"
            defaultValue={session.cooperative_score ?? undefined}
          />
        </div>
      )}

      {(teamCats.length > 0 || teamChoiceList.length > 0 || teamGroupList.length > 0) && (
        <div className="flex flex-col gap-2.5 rounded-lg bg-muted/60 p-2.5">
          <Label>Game details</Label>
          {teamGroupList.length > 0 && (
            <ChoiceGroupFields
              fieldPrefix="team"
              groups={teamGroupList}
              values={teamGroups}
              onChange={(key, groupRows) => setTeamGroups((g) => ({ ...g, [key]: groupRows }))}
            />
          )}
          {teamChoiceList.length > 0 && (
            <ChoiceFields
              fieldPrefix="team"
              fields={teamChoiceList}
              values={teamChoices}
              onChange={(key, values) => setTeamChoices((c) => ({ ...c, [key]: values }))}
            />
          )}
          {teamCats.length > 0 && (
            <ScoreEntryFields
              fieldPrefix="team"
              categories={teamCats}
              values={teamDetails}
              onChange={(key, value) => setTeamDetails((d) => ({ ...d, [key]: value }))}
            />
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="played_at">Date</Label>
        <Input id="played_at" name="played_at" type="date" defaultValue={session.played_at} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" placeholder="Optional" defaultValue={session.location ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <MentionTextarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Optional — tag players with @username"
          defaultValue={session.notes ?? ""}
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
