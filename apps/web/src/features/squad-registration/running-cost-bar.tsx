import { PLAYER_REGISTRATION } from "@4ef/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/monetisation/money";

/**
 * Brief §5 B3: "show a live running cost as players are added ... never let
 * the total be a surprise at checkout." Price is the flat per-player
 * STANDARD tier from @4ef/shared — the same constant the API prices
 * registrations with, so this can never drift from what checkout charges.
 */
export function RunningCostBar({ playerCount }: { playerCount: number }) {
  const totalKobo = playerCount * PLAYER_REGISTRATION.STANDARD.priceKobo;

  return (
    <Card size="sm" className="sticky top-4 z-10">
      <CardContent className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {playerCount} {playerCount === 1 ? "player" : "players"}
        </p>
        <p className="text-lg font-heading">
          <Money kobo={totalKobo} />
        </p>
      </CardContent>
    </Card>
  );
}
