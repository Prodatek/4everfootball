import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  steps: string[];
  currentStep: number;
}

// No Tabs/stepper primitive exists in the design system (see
// MONETISATION_UI_INVENTORY.md §15.3) — composed from Card/existing colour
// tokens only: bg-primary for done/current, bg-muted for upcoming, same
// pairing convention as every other status indicator in the app.
export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <ol className="flex items-center">
      {steps.map((label, index) => {
        const isDone = index < currentStep;
        const isCurrent = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <li key={label} className={cn("flex items-center", !isLast && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  isDone && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground",
                  !isDone && !isCurrent && "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="size-3.5" /> : index + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs sm:block",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div className={cn("mx-2 h-px flex-1", isDone ? "bg-primary" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
