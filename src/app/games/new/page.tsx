import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewGameForm } from "./new-game-form";

// Players can't add games to the catalog right now — it's curated only
// (DB also blocks it: no insert policy for `authenticated` on `games`).
// Kept implemented so it's a one-line revert once this reopens, e.g. behind
// an admin role or the future game-data integration layer.
const PLAYER_SUBMISSIONS_ENABLED = false;

export default async function NewGamePage() {
  if (!PLAYER_SUBMISSIONS_ENABLED) {
    redirect("/games");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Add a game</CardTitle>
          <CardDescription>Not in Boardly yet? Add it to the catalog.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewGameForm />
        </CardContent>
      </Card>
    </div>
  );
}
