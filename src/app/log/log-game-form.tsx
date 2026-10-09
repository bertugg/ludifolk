"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { PlusIcon, XIcon } from "lucide-react";
import { logGame, type LogGameFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/button-link";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameCombobox } from "@/components/game-combobox";
import { MentionTextarea } from "@/components/mention-textarea";
import { PlayerNameInput, type PlayerSuggestion } from "@/components/player-name-input";
import { ScoreEntryFields } from "@/components/score-entry-fields";
import { computeCategoryTotal, parseScoringSchema, playerCategories, teamCategories } from "@/lib/scoring";
import { formatMegabytes, MAX_SESSION_PHOTOS, MAX_SESSION_PHOTO_BYTES } from "@/lib/photo-limits";
import { downscaleImage } from "@/lib/downscale-image";
import { createClient } from "@/lib/supabase/client";
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
        <h2 className="type-section-title">{success.gameTitle}</h2>
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
        {success.failedPhotos ? (
          <p className="text-xs text-destructive">
            {success.failedPhotos === 1 ? "1 photo" : `${success.failedPhotos} photos`} couldn&apos;t be uploaded.
          </p>
        ) : null}
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

type PickedPhoto = { file: File; previewUrl: string };

const DOWNSCALE_MAX_DIMENSION = 1600;

/**
 * Uploads straight from the browser to Storage rather than through the
 * logGame server action — server action bodies are capped by the host
 * (4.5MB on Vercel), which even a few downscaled photos can exceed. The
 * session-photos and photos RLS policies enforce the same access rules the
 * action did. Returns how many photos failed.
 */
async function uploadSessionPhotos(sessionId: string, files: File[]): Promise<number> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return files.length;
  const userId = auth.user.id;

  const results = await Promise.all(
    files.map(async (file) => {
      const path = `${sessionId}/${crypto.randomUUID()}`;
      const { error: uploadError } = await supabase.storage.from("session-photos").upload(path, file, {
        contentType: file.type,
      });
      if (uploadError) return false;
      const { error: insertError } = await supabase.from("photos").insert({
        game_session_id: sessionId,
        uploaded_by: userId,
        storage_path: path,
      });
      if (insertError) {
        // e.g. the per-session photo cap — don't leave an orphaned object.
        await supabase.storage.from("session-photos").remove([path]);
        return false;
      }
      return true;
    }),
  );
  return results.filter((ok) => !ok).length;
}

async function logGameWithPhotos(prevState: LogGameFormState, formData: FormData): Promise<LogGameFormState> {
  const photos = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0 && f.size <= MAX_SESSION_PHOTO_BYTES)
    .slice(0, MAX_SESSION_PHOTOS);
  formData.delete("photos");

  const result = await logGame(prevState, formData);
  if (!result || !("success" in result) || photos.length === 0) return result;

  const failedPhotos = await uploadSessionPhotos(result.success.sessionId, photos);
  return failedPhotos > 0 ? { success: { ...result.success, failedPhotos } } : result;
}

function PhotoPicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [photos]);

  function syncInputFiles(next: PickedPhoto[]) {
    const dataTransfer = new DataTransfer();
    next.forEach((p) => dataTransfer.items.add(p.file));
    if (inputRef.current) inputRef.current.files = dataTransfer.files;
  }

  async function handleFiles(fileList: FileList | null) {
    const incoming = fileList ? Array.from(fileList) : [];
    if (incoming.length === 0) return;

    const rejections: string[] = [];
    const okOriginals: File[] = [];
    const remainingSlots = MAX_SESSION_PHOTOS - photos.length;

    for (const file of incoming) {
      if (file.size > MAX_SESSION_PHOTO_BYTES) {
        rejections.push(
          `"${file.name}" is too large (${formatMegabytes(file.size)}) — max is ${formatMegabytes(MAX_SESSION_PHOTO_BYTES)}.`,
        );
        continue;
      }
      if (okOriginals.length >= remainingSlots) {
        rejections.push(`"${file.name}" was skipped — only ${MAX_SESSION_PHOTOS} photos allowed per post.`);
        continue;
      }
      okOriginals.push(file);
    }

    setWarning(rejections.length > 0 ? rejections.join(" ") : null);
    if (okOriginals.length === 0) {
      // Nothing to add, but the native picker still wrote its (rejected)
      // selection into the input's .files — restore our actual state.
      syncInputFiles(photos);
      return;
    }

    setIsProcessing(true);
    const accepted: PickedPhoto[] = await Promise.all(
      okOriginals.map(async (file) => {
        const optimized = await downscaleImage(file, DOWNSCALE_MAX_DIMENSION);
        return { file: optimized, previewUrl: URL.createObjectURL(optimized) };
      }),
    );
    setIsProcessing(false);

    const next = [...photos, ...accepted];
    setPhotos(next);
    syncInputFiles(next);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      const next = prev.filter((_, i) => i !== index);
      syncInputFiles(next);
      return next;
    });
    setWarning(null);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="photos">Photos</Label>
      <input
        ref={inputRef}
        id="photos"
        name="photos"
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex gap-2">
        {photos.map((p, i) => (
          <div key={p.previewUrl} className="relative size-16">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not a remote image */}
            <img src={p.previewUrl} alt="" className="size-16 rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(i)}
              aria-label="Remove photo"
              className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        ))}
        {photos.length < MAX_SESSION_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isProcessing}
            aria-label="Add photo"
            className="flex size-16 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            <PlusIcon className="size-5" />
          </button>
        )}
      </div>
      {isProcessing && <p className="text-xs text-muted-foreground">Processing photo…</p>}
      {warning && <p className="text-xs text-destructive">{warning}</p>}
      <p className="text-xs text-muted-foreground">
        Up to {MAX_SESSION_PHOTOS} photos, {formatMegabytes(MAX_SESSION_PHOTO_BYTES)} each.
      </p>
    </div>
  );
}

/**
 * Prefilled with the device's local date. Set after mount rather than at
 * render: the server renders in UTC, which is a different day around
 * midnight for many users (and would cause a hydration mismatch).
 */
function PlayedAtInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || input.value) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    input.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  return <Input ref={inputRef} id="played_at" name="played_at" type="date" />;
}

function emptyRow(id: string, name = ""): Row {
  return { id, name, score: "", position: "", winner: false, breakdown: {}, showDetails: false };
}

export function LogGameForm({
  initialGames,
  ownUsername,
  ownDisplayName,
  groups,
  following,
}: {
  initialGames: GameSummary[];
  ownUsername: string;
  ownDisplayName: string | null;
  groups: Group[];
  following: PlayerSuggestion[];
}) {
  const [attempt, setAttempt] = useState(0);
  return (
    <LogGameFormInner
      key={attempt}
      initialGames={initialGames}
      ownUsername={ownUsername}
      ownDisplayName={ownDisplayName}
      groups={groups}
      following={following}
      onLogAnother={() => setAttempt((a) => a + 1)}
    />
  );
}

function LogGameFormInner({
  initialGames,
  ownUsername,
  ownDisplayName,
  groups,
  following,
  onLogAnother,
}: {
  initialGames: GameSummary[];
  ownUsername: string;
  ownDisplayName: string | null;
  groups: Group[];
  following: PlayerSuggestion[];
  onLogAnother: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(logGameWithPhotos, null);
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

  const createdSessionId = state && "success" in state ? state.success.sessionId : null;
  const hadFailedPhotos = !!(state && "success" in state && state.success.failedPhotos);
  useEffect(() => {
    // Land on the new result right away. replace(), so Back skips the spent
    // form. Failed photo uploads stay on the summary so the warning is seen.
    if (createdSessionId && !hadFailedPhotos) router.replace(`/game-session/${createdSessionId}`);
  }, [createdSessionId, hadFailedPhotos, router]);

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
                  <PlayerNameInput
                    name={`participant-${row.id}-name`}
                    placeholder={isSelf ? ownDisplayName || ownUsername : "Name or Ludifolk username"}
                    value={row.name}
                    onChange={(name) => updateRow(row.id, { name })}
                    suggestions={following.filter(
                      (f) => f.username === row.name.toLowerCase() || !usedNames.has(f.username.toLowerCase()),
                    )}
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
          <PlayedAtInput />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" placeholder="Optional" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <MentionTextarea id="notes" name="notes" rows={2} placeholder="Optional — tag players with @username" />
      </div>

      <PhotoPicker />

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
