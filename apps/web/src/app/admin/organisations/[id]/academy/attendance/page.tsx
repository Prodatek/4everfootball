"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AttendanceStatus } from "@/features/academy/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { fetchAgeGroups, fetchAttendanceForAgeGroup } from "@/features/academy/api";
import { fetchPlayers } from "@/features/players/api";
import {
  STUCK_AFTER_ATTEMPTS,
  useOfflineAttendanceQueue,
} from "@/features/academy/offline-attendance-queue";
import { SyncStatusIndicator } from "@/features/matches/sync-status-indicator";

const STATUS_OPTIONS: { status: AttendanceStatus; label: string; className: string }[] = [
  { status: "PRESENT", label: "Present", className: "" },
  { status: "LATE", label: "Late", className: "" },
  { status: "EXCUSED", label: "Excused", className: "" },
  { status: "ABSENT", label: "Absent", className: "" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AcademyAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: organisationId } = use(params);
  const [ageGroupId, setAgeGroupId] = useState<string | null>(null);
  const today = todayIso();

  const { data: ageGroups, isLoading: ageGroupsLoading } = useQuery({
    queryKey: ["academy-age-groups", organisationId],
    queryFn: () => fetchAgeGroups(organisationId),
  });

  const activeAgeGroup = useMemo(
    () => ageGroups?.find((g) => g.id === (ageGroupId ?? ageGroups[0]?.id)),
    [ageGroups, ageGroupId],
  );
  const teamId = activeAgeGroup?.teams[0]?.id;

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ["team-players", teamId],
    queryFn: () => fetchPlayers({ teamId, limit: 100, sortBy: "firstName", sortOrder: "asc" }),
    enabled: !!teamId,
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ["academy-attendance-today", activeAgeGroup?.id, today],
    queryFn: () => fetchAttendanceForAgeGroup(organisationId, activeAgeGroup!.id, today, today),
    enabled: !!activeAgeGroup,
    refetchInterval: 15_000,
  });

  const { pendingRecords, enqueue, pendingCount, syncNow } = useOfflineAttendanceQueue(
    organisationId,
    () => toast.success("Attendance synced"),
  );

  const stuckCount = pendingRecords.filter((r) => r.attempts >= STUCK_AFTER_ATTEMPTS).length;

  const statusForPlayer = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const record of todayAttendance ?? []) {
      map.set(record.playerId, record.status);
    }
    for (const item of pendingRecords) {
      if (item.ageGroupId === activeAgeGroup?.id) {
        map.set(item.playerId, item.status);
      }
    }
    return map;
  }, [todayAttendance, pendingRecords, activeAgeGroup]);

  function tap(playerId: string, status: AttendanceStatus) {
    if (!activeAgeGroup) return;
    enqueue({
      clientEventId: crypto.randomUUID(),
      ageGroupId: activeAgeGroup.id,
      playerId,
      date: today,
      status,
    });
  }

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-4 py-6">
      <Button render={<Link href={`/admin/organisations/${organisationId}/academy`} />} variant="outline" className="w-fit">
        Back to academy
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl uppercase">Attendance</h1>
        <span className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "short" })}
        </span>
      </div>

      <SyncStatusIndicator pendingCount={pendingCount} stuckCount={stuckCount} onSyncNow={syncNow} />

      {ageGroupsLoading && <Skeleton className="h-10 rounded-md" />}

      {!ageGroupsLoading && ageGroups && ageGroups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ageGroups.map((group) => (
            <Button
              key={group.id}
              size="sm"
              variant={(ageGroupId ?? ageGroups[0].id) === group.id ? "default" : "outline"}
              onClick={() => setAgeGroupId(group.id)}
            >
              {group.name}
            </Button>
          ))}
        </div>
      )}

      {!ageGroupsLoading && ageGroups && ageGroups.length === 0 && (
        <Card size="sm">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No age groups yet — create one from Roster and age groups first.
          </CardContent>
        </Card>
      )}

      {activeAgeGroup && !teamId && (
        <Card size="sm">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {activeAgeGroup.name} has no squad assigned yet.
          </CardContent>
        </Card>
      )}

      {playersLoading && <Skeleton className="h-40 rounded-md" />}

      {!playersLoading && players && players.data.length === 0 && teamId && (
        <p className="text-sm text-muted-foreground">No players on this squad yet.</p>
      )}

      {!playersLoading && players && players.data.length > 0 && (
        <div className="flex flex-col gap-3">
          {players.data.map((player) => {
            const current = statusForPlayer.get(player.id);
            return (
              <Card key={player.id} size="sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    {player.firstName} {player.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-4 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <Button
                      key={opt.status}
                      type="button"
                      size="sm"
                      variant={current === opt.status ? "default" : "outline"}
                      className={
                        opt.status === "ABSENT" && current === opt.status
                          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          : ""
                      }
                      onClick={() => tap(player.id, opt.status)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </Container>
  );
}
