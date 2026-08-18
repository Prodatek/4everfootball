"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { Money } from "@/components/monetisation/money";
import { PaymentStatusBadge } from "@/components/monetisation/payment-status-badge";
import { fetchCompetitionBySlug } from "@/features/competitions/api";
import { fetchTeamBySlug, type TeamWithOrganisation } from "@/features/teams/api";
import {
  checkoutRegistrations,
  fetchRegistrationsForCompetition,
} from "@/features/squad-registration/api";
import { fetchPayment, type PaymentProvider } from "@/features/payments/api";

const PAID_STATUSES = new Set(["CONFIRMED", "LOCKED"]);

export default function SquadPaymentPage({
  params,
}: {
  params: Promise<{ competitionSlug: string; teamSlug: string }>;
}) {
  const { competitionSlug, teamSlug } = use(params);

  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);
  const [provider, setProvider] = useState<PaymentProvider>("PAYSTACK");
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const { data: competition, isLoading: competitionLoading } = useQuery({
    queryKey: ["competition", competitionSlug],
    queryFn: () => fetchCompetitionBySlug(competitionSlug),
  });

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["team", teamSlug],
    queryFn: () => fetchTeamBySlug(teamSlug),
  });
  const teamWithOrg = team as unknown as TeamWithOrganisation | undefined;

  const { data: registrations, isLoading: registrationsLoading } = useQuery({
    queryKey: ["squad-registrations", competition?.id, teamWithOrg?.id],
    queryFn: () => fetchRegistrationsForCompetition(competition!.id, teamWithOrg!.id),
    enabled: !!competition?.id && !!teamWithOrg?.id,
  });

  const unpaid = useMemo(
    () => registrations?.filter((r) => !PAID_STATUSES.has(r.status)) ?? [],
    [registrations],
  );
  const paid = useMemo(
    () => registrations?.filter((r) => PAID_STATUSES.has(r.status)) ?? [],
    [registrations],
  );

  // Defaults to "everyone unpaid" the first time the list loads, but stays
  // a plain Set after that so checking/unchecking doesn't get clobbered by
  // a background refetch.
  const selected = selectedIds ?? new Set(unpaid.map((r) => r.id));
  const selectedRegistrations = unpaid.filter((r) => selected.has(r.id));
  const totalKobo = selectedRegistrations.reduce((sum, r) => sum + r.priceKobo, 0);

  const checkoutMutation = useMutation({
    mutationFn: () =>
      checkoutRegistrations(
        competition!.id,
        Array.from(selected),
        teamWithOrg!.organisationId!,
        provider,
      ),
    onSuccess: ({ payment, authorizationUrl }) => {
      setPaymentId(payment.id);
      if (provider === "PAYSTACK" && authorizationUrl) {
        window.location.href = authorizationUrl;
      }
    },
  });

  const { data: payment, isLoading: paymentLoading } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => fetchPayment(paymentId!),
    enabled: !!paymentId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "PAID" || status === "FAILED" || status === "ABANDONED" ? false : 3000;
    },
  });

  const isLoading = competitionLoading || teamLoading || registrationsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!competition || !teamWithOrg) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Squad not found.</p>
      </div>
    );
  }

  const backHref = `/register/${competitionSlug}/squad/${teamSlug}`;

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-6">
      <Button render={<Link href={backHref} />} variant="outline" className="w-fit">
        Back to squad
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl uppercase">Squad payment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!paymentId && (
            <>
              {unpaid.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Every player in this squad is already paid for.
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {unpaid.map((r) => {
                      const isChecked = selected.has(r.id);
                      return (
                        <label
                          key={r.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                        >
                          <span className="flex items-center gap-3">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const next = new Set(selected);
                                if (checked) next.add(r.id);
                                else next.delete(r.id);
                                setSelectedIds(next);
                              }}
                            />
                            {r.player.firstName} {r.player.lastName}
                          </span>
                          <Money kobo={r.priceKobo} className="text-sm text-muted-foreground" />
                        </label>
                      );
                    })}
                  </div>

                  {selected.size < unpaid.length && (
                    <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                      Only the {selected.size} player{selected.size === 1 ? "" : "s"} you pay for
                      now become eligible to play. The other {unpaid.length - selected.size} stay
                      unpaid until you come back and pay for them too.
                    </p>
                  )}

                  <div className="flex justify-between border-t border-border pt-3 text-base">
                    <span className="font-medium">
                      {selected.size} of {unpaid.length} players
                    </span>
                    <Money kobo={totalKobo} className="font-heading text-xl" />
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Pay with</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={provider === "PAYSTACK" ? "default" : "outline"}
                        onClick={() => setProvider("PAYSTACK")}
                      >
                        Card
                      </Button>
                      <Button
                        type="button"
                        variant={provider === "BANK_TRANSFER" ? "default" : "outline"}
                        onClick={() => setProvider("BANK_TRANSFER")}
                      >
                        Bank transfer
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="button"
                    disabled={selected.size === 0 || checkoutMutation.isPending}
                    onClick={() => checkoutMutation.mutate()}
                  >
                    {checkoutMutation.isPending
                      ? "Processing..."
                      : provider === "PAYSTACK"
                        ? "Pay now"
                        : "I've sent it"}
                  </Button>

                  {checkoutMutation.isError && (
                    <p className="text-sm text-destructive">
                      Couldn&apos;t start this payment. Try again, or use bank transfer instead.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {paymentId && (paymentLoading || !payment) && (
            <p className="text-sm text-muted-foreground">Loading payment status...</p>
          )}

          {payment && payment.status === "PENDING" && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 p-4">
              <PaymentStatusBadge status="PENDING" />
              {payment.provider === "BANK_TRANSFER" ? (
                <p className="text-sm">
                  We&apos;re waiting to confirm your transfer — this can take a little longer than
                  a card payment. Quote the reference below.
                </p>
              ) : (
                <p className="text-sm">
                  We&apos;ve received your payment and are confirming it. This usually takes a few
                  seconds.
                </p>
              )}
              <p className="text-xs text-muted-foreground">Reference: {payment.reference}</p>
            </div>
          )}

          {payment && payment.status === "PAID" && (
            <div className="flex flex-col gap-2 rounded-lg border border-live/40 bg-live/10 p-4">
              <PaymentStatusBadge status="PAID" />
              <p className="text-sm">
                Payment confirmed — those players are now eligible to play. Reference:{" "}
                {payment.reference}.
              </p>
              <Button size="sm" render={<Link href={backHref} />} className="w-fit">
                Back to squad
              </Button>
            </div>
          )}

          {payment && payment.status === "FAILED" && (
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
              <PaymentStatusBadge status="FAILED" />
              <p className="text-sm">
                Your bank declined the payment. Try again, or pay by bank transfer instead.
              </p>
              <Button size="sm" variant="outline" className="w-fit" onClick={() => setPaymentId(null)}>
                Try again
              </Button>
            </div>
          )}

          {payment && payment.status === "ABANDONED" && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 p-4">
              <PaymentStatusBadge status="ABANDONED" />
              <p className="text-sm">This payment session timed out.</p>
              <Button size="sm" variant="outline" className="w-fit" onClick={() => setPaymentId(null)}>
                Start again
              </Button>
            </div>
          )}

          {paid.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <p className="text-sm font-medium">Already paid</p>
              {paid.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{r.player.firstName} {r.player.lastName}</span>
                  <PaymentStatusBadge status="PAID" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Every player must be added in the squad builder before they can be paid for.
        </CardFooter>
      </Card>
    </Container>
  );
}
