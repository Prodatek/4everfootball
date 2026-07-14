"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchTeams } from "@/features/teams/api";
import {
  addCompetitionEntry,
  fetchCompetitionEntries,
  removeCompetitionEntry,
} from "./api";

interface ManageEntriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitionId: string | null;
  competitionName?: string;
}

export function ManageEntriesDialog({
  open,
  onOpenChange,
  competitionId,
  competitionName,
}: ManageEntriesDialogProps) {
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const { data: entries } = useQuery({
    queryKey: ["competition-teams", competitionId],
    queryFn: () => fetchCompetitionEntries(competitionId!),
    enabled: open && !!competitionId,
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams", "for-select"],
    queryFn: () => fetchTeams({ limit: 100, sortBy: "name", sortOrder: "asc" }),
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: (teamId: string) => addCompetitionEntry(competitionId!, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competition-teams", competitionId] });
      setSelectedTeamId("");
    },
    onError: () => toast.error("Failed to add team"),
  });

  const removeMutation = useMutation({
    mutationFn: (teamId: string) => removeCompetitionEntry(competitionId!, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competition-teams", competitionId] });
    },
    onError: () => toast.error("Failed to remove team"),
  });

  const availableTeams = teamsData?.data.filter(
    (team) => !entries?.some((entry) => entry.teamId === team.id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Teams in {competitionName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Select
              value={selectedTeamId}
              onValueChange={(value) => setSelectedTeamId(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a team to add" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!selectedTeamId || addMutation.isPending}
              onClick={() => addMutation.mutate(selectedTeamId)}
            >
              Add
            </Button>
          </div>

          <div className="flex flex-col gap-1">
            {entries && entries.length === 0 && (
              <p className="text-sm text-muted-foreground">No teams entered yet.</p>
            )}
            {entries?.map((entry) => (
              <div
                key={entry.entryId}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <span className="text-sm">{entry.name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate(entry.teamId)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
