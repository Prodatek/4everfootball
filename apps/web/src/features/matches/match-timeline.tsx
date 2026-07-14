import type { MatchEvent } from "@4ef/shared";
import { MATCH_EVENT_LABELS } from "./event-labels";

function formatMinute(event: MatchEvent): string {
  return event.stoppageMinute ? `${event.minute}+${event.stoppageMinute}'` : `${event.minute}'`;
}

export function MatchTimeline({ events }: { events: MatchEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No events recorded yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-2">
      {[...events].reverse().map((event) => (
        <li key={event.id} className="flex items-baseline gap-3 text-sm">
          <span className="w-10 shrink-0 font-mono text-muted-foreground">
            {formatMinute(event)}
          </span>
          <span className="font-medium">{MATCH_EVENT_LABELS[event.type]}</span>
          {event.player && (
            <span className="text-muted-foreground">
              {event.player.firstName} {event.player.lastName}
              {event.assistPlayer &&
                ` (assist: ${event.assistPlayer.firstName} ${event.assistPlayer.lastName})`}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
