"use client";

import { useState } from "react";
import { ALL_ROLES, type AdminUserSummary, type Role } from "@4ef/shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { UpdateUserRolesInput } from "./api";

interface EditRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: AdminUserSummary | null;
  canManageSuperAdmin: boolean;
  onSubmit: (input: UpdateUserRolesInput) => Promise<void>;
  isSubmitting: boolean;
}

export function EditRolesDialog({
  open,
  onOpenChange,
  targetUser,
  canManageSuperAdmin,
  onSubmit,
  isSubmitting,
}: EditRolesDialogProps) {
  // The parent remounts this component with a fresh `key` (the target
  // user's id) whenever a different user is opened for editing, so these
  // initial values are all that's needed — no effect-based reset required.
  const [roles, setRoles] = useState<Role[]>(targetUser?.roles ?? []);
  const [isActive, setIsActive] = useState(targetUser?.isActive ?? true);

  if (!targetUser) {
    return null;
  }

  function toggleRole(role: Role, checked: boolean) {
    setRoles((prev) => (checked ? [...prev, role] : prev.filter((r) => r !== role)));
  }

  async function handleSubmit() {
    await onSubmit({ roles, isActive });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{targetUser.displayName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Roles</Label>
            {ALL_ROLES.map((role) => {
              const disabled = role === "SUPER_ADMIN" && !canManageSuperAdmin;
              return (
                <div key={role} className="flex items-center gap-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={roles.includes(role)}
                    disabled={disabled}
                    onCheckedChange={(checked) => toggleRole(role, checked === true)}
                  />
                  <Label htmlFor={`role-${role}`} className="font-normal">
                    {role}
                    {disabled && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (super admin only)
                      </span>
                    )}
                  </Label>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
            />
            <Label htmlFor="isActive" className="font-normal">
              Account active
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={isSubmitting || roles.length === 0} onClick={handleSubmit}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
