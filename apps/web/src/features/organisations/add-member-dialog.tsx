"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchUsers } from "@/features/users/api";
import type { OrganisationMemberRole } from "./api";

// There's no email-invite flow on the API yet — only "add an existing
// user by id" (see MONETISATION_UI_INVENTORY.md's A1 finding). This
// composes the closest honest thing from what exists: search the platform
// user directory (already admin-readable) and add directly, rather than
// pretending an invite email goes out.
const ROLE_LABELS: Record<OrganisationMemberRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  RECORDER: "Recorder",
  VIEWER: "Viewer",
  COACH: "Coach",
};

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (userId: string, role: OrganisationMemberRole) => Promise<void>;
  isSubmitting: boolean;
}

export function AddMemberDialog({ open, onOpenChange, onAdd, isSubmitting }: AddMemberDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [role, setRole] = useState<OrganisationMemberRole>("VIEWER");

  const { data } = useQuery({
    queryKey: ["users-search", search],
    queryFn: () => fetchUsers({ search, limit: 10 }),
    enabled: open && search.length >= 2,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setSearch("");
          setSelectedUserId(null);
          setRole("VIEWER");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="member-search">Find a person by name or email</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="member-search"
                className="pl-7"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSelectedUserId(null);
                }}
                placeholder="e.g. dave@club.com"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              They need an existing 4EverFootball account already — there&apos;s no invite-by-email
              yet, so search for someone who has already registered.
            </p>
          </div>

          {search.length >= 2 && (
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-border">
              {data && data.data.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">No matching accounts found.</p>
              )}
              {data?.data.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setSelectedUserId(candidate.id)}
                  className={`flex flex-col items-start gap-0.5 p-2.5 text-left text-sm hover:bg-accent ${
                    selectedUserId === candidate.id ? "bg-accent" : ""
                  }`}
                >
                  <span className="font-medium">{candidate.displayName}</span>
                  <span className="text-xs text-muted-foreground">{candidate.email}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as OrganisationMemberRole)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            disabled={!selectedUserId || isSubmitting}
            onClick={async () => {
              if (!selectedUserId) return;
              await onAdd(selectedUserId, role);
              setSearch("");
              setSelectedUserId(null);
              setRole("VIEWER");
            }}
          >
            {isSubmitting ? "Adding..." : "Add member"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
