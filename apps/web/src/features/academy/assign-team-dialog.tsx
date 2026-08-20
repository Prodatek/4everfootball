"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchTeamsForAdmin } from "@/features/teams/api";

interface AssignTeamDialogProps {
  organisationId: string;
  ageGroupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (teamId: string) => Promise<unknown>;
}

export function AssignTeamDialog({
  organisationId,
  ageGroupName,
  open,
  onOpenChange,
  onAssign,
}: AssignTeamDialogProps) {
  const { data: teams, isLoading } = useQuery({
    queryKey: ["organisation-teams", organisationId],
    queryFn: () => fetchTeamsForAdmin({ organisationId, limit: 100 }),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign a squad to {ageGroupName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!isLoading && teams?.data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              This organisation has no teams yet — create one first.
            </p>
          )}
          {!isLoading &&
            teams?.data.map((team) => (
              <Button
                key={team.id}
                variant="outline"
                className="justify-start"
                onClick={async () => {
                  await onAssign(team.id);
                }}
              >
                {team.name}
              </Button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
