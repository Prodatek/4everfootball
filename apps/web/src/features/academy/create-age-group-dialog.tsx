"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateAgeGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onCreate: (input: { name: string; minAge?: number; maxAge?: number }) => Promise<unknown>;
}

export function CreateAgeGroupDialog({
  open,
  onOpenChange,
  isSubmitting,
  onCreate,
}: CreateAgeGroupDialogProps) {
  const [name, setName] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");

  function reset() {
    setName("");
    setMinAge("");
    setMaxAge("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New age group</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="age-group-name">Name</Label>
            <Input
              id="age-group-name"
              placeholder="e.g. Under 13"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="age-group-min">Min age</Label>
              <Input
                id="age-group-min"
                type="number"
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="age-group-max">Max age</Label>
              <Input
                id="age-group-max"
                type="number"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={name.trim().length < 2 || isSubmitting}
              onClick={async () => {
                await onCreate({
                  name: name.trim(),
                  minAge: minAge ? Number(minAge) : undefined,
                  maxAge: maxAge ? Number(maxAge) : undefined,
                });
                reset();
              }}
            >
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
