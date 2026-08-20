"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { Money } from "@/components/monetisation/money";
import { InvoiceStatusBadge } from "@/components/monetisation/invoice-status-badge";
import {
  fetchCurrentSubscription,
  fetchSubscriptionHistory,
  subscribeAcademyPlan,
  type AcademyPlanKey,
} from "@/features/academy/api";

const PLANS: { key: AcademyPlanKey; label: string; maxPlayers: number; priceKobo: number }[] = [
  { key: "STARTER", label: "Starter", maxPlayers: 30, priceKobo: 4_500_000 },
  { key: "GROWTH", label: "Growth", maxPlayers: 100, priceKobo: 12_000_000 },
  { key: "ELITE", label: "Elite", maxPlayers: 300, priceKobo: 30_000_000 },
];
const PREPAY_DISCOUNT = 0.2;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

export default function AcademyBillingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: organisationId } = use(params);
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<AcademyPlanKey>("STARTER");
  const [prepay, setPrepay] = useState(true);

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["academy-subscription", organisationId],
    queryFn: () => fetchCurrentSubscription(organisationId),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["academy-subscription-history", organisationId],
    queryFn: () => fetchSubscriptionHistory(organisationId),
  });

  const subscribeMutation = useMutation({
    mutationFn: () => subscribeAcademyPlan(organisationId, selectedPlan, prepay),
    onSuccess: () => {
      toast.success("Plan activated");
      void queryClient.invalidateQueries({ queryKey: ["academy-subscription", organisationId] });
      void queryClient.invalidateQueries({ queryKey: ["academy-subscription-history", organisationId] });
    },
    onError: () => toast.error("Failed to activate plan"),
  });

  const plan = PLANS.find((p) => p.key === selectedPlan)!;
  const discountKobo = prepay ? Math.round(plan.priceKobo * PREPAY_DISCOUNT) : 0;

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-6">
      <Button render={<Link href={`/admin/organisations/${organisationId}/academy`} />} variant="outline" className="w-fit">
        Back to academy
      </Button>

      <h1 className="font-heading text-2xl uppercase">Academy plan and billing</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current plan</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptionLoading && <Skeleton className="h-10 rounded-md" />}
          {!subscriptionLoading && subscription && (
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Badge>{subscription.planKey}</Badge>
                <p className="text-sm text-muted-foreground">
                  Renews {formatDate(subscription.endDate)}
                </p>
              </div>
              <InvoiceStatusBadge status={subscription.invoice.status} />
            </div>
          )}
          {!subscriptionLoading && !subscription && (
            <p className="text-sm text-muted-foreground">No active plan — choose one below.</p>
          )}
        </CardContent>
      </Card>

      {!subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choose a band</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PLANS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelectedPlan(p.key)}
                  className={`flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors ${
                    selectedPlan === p.key ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="font-medium">{p.label}</span>
                  <span className="text-xs text-muted-foreground">Up to {p.maxPlayers} players</span>
                  <Money kobo={p.priceKobo} className="text-lg font-heading" />
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={prepay} onCheckedChange={(c) => setPrepay(c === true)} />
              Prepay annually (20% discount)
            </label>

            <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">
                Total{discountKobo > 0 ? " (after discount)" : ""}
              </span>
              <Money kobo={plan.priceKobo - discountKobo} className="font-medium" />
            </div>

            <Button
              className="w-fit"
              disabled={subscribeMutation.isPending}
              onClick={() => subscribeMutation.mutate()}
            >
              {subscribeMutation.isPending ? "Activating..." : "Activate plan"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg uppercase">Invoices</h2>
        {historyLoading && <Skeleton className="h-24 rounded-md" />}
        {!historyLoading && history?.length === 0 && (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        )}
        {!historyLoading && history && history.length > 0 && (
          <div className="flex flex-col gap-2">
            {history.map((sub) => (
              <Card key={sub.id} size="sm">
                <CardContent className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">
                      {sub.planKey} · {sub.invoice.quoteNumber}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(sub.startDate)} – {formatDate(sub.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <InvoiceStatusBadge status={sub.invoice.status} />
                    <Money kobo={sub.invoice.totalKobo} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
