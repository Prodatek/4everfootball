"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { COMPETITION_TIERS, type CompetitionTierKey } from "@4ef/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/monetisation/money";
import { PaymentStatusBadge } from "@/components/monetisation/payment-status-badge";
import { Container } from "@/components/layout/container";
import { fetchCompetitionBySlug, type CompetitionWithLicence } from "@/features/competitions/api";
import {
  fetchBankDetails,
  fetchPayment,
  initializeLicencePayment,
  verifyPayment,
  type PaymentProvider,
} from "@/features/payments/api";

export default function LicenceCheckoutPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id: organisationId, slug } = use(params);
  const searchParams = useSearchParams();
  const referenceFromRedirect = searchParams.get("reference");

  const [provider, setProvider] = useState<PaymentProvider>("PAYSTACK");
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const {
    data: competition,
    isLoading: competitionLoading,
    error: competitionError,
  } = useQuery({
    queryKey: ["competition", slug],
    queryFn: () => fetchCompetitionBySlug(slug),
    retry: (failureCount, err) =>
      isAxiosError(err) && err.response?.status === 404 ? false : failureCount < 1,
  });
  const licensedCompetition = competition as unknown as CompetitionWithLicence | undefined;

  const { data: bankDetails } = useQuery({
    queryKey: ["bank-details"],
    queryFn: fetchBankDetails,
    enabled: provider === "BANK_TRANSFER",
  });

  const initializeMutation = useMutation({
    mutationFn: () =>
      initializeLicencePayment(organisationId, licensedCompetition!.id, provider),
    onSuccess: ({ payment, authorizationUrl }) => {
      setPaymentId(payment.id);
      if (provider === "PAYSTACK" && authorizationUrl) {
        window.location.href = authorizationUrl;
      }
    },
  });

  // A payment can also already exist from a prior visit (redirected back
  // from Paystack, or came back to check on a bank transfer) — the
  // ?reference= Paystack appends on return isn't itself a payment id, so we
  // trigger a verify call keyed off it rather than trying to resolve it to
  // one client-side.
  const verifyMutation = useMutation({
    mutationFn: (id: string) => verifyPayment(id),
  });

  useEffect(() => {
    if (referenceFromRedirect && paymentId && !verifyMutation.isPending && !verifyMutation.isSuccess) {
      verifyMutation.mutate(paymentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceFromRedirect, paymentId]);

  const {
    data: payment,
    isLoading: paymentLoading,
  } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => fetchPayment(paymentId!),
    enabled: !!paymentId,
    // "This usually takes a few seconds" (brief §4.3) — poll until settled.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "PAID" || status === "FAILED" || status === "ABANDONED" ? false : 3000;
    },
  });

  if (competitionLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (competitionError || !licensedCompetition) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Competition not found.</p>
        <Button render={<Link href={`/admin/organisations/${organisationId}`} />} variant="outline">
          Back to organisation
        </Button>
      </div>
    );
  }

  const tierKey = licensedCompetition.tier as CompetitionTierKey;
  const tier = COMPETITION_TIERS[tierKey];
  const backHref = `/admin/organisations/${organisationId}/competitions/${slug}`;

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-6">
      <Button render={<Link href={backHref} />} variant="outline" className="w-fit">
        Back to {licensedCompetition.name}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl uppercase">Licence checkout</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex justify-between border-b border-border pb-3 text-sm">
            <span className="text-muted-foreground">{tier.label} licence</span>
            <Money kobo={tier.priceKobo} className="font-medium" />
          </div>
          <div className="flex justify-between pb-1 text-base">
            <span className="font-medium">Total</span>
            <Money kobo={tier.priceKobo} className="font-heading text-xl" />
          </div>

          {/* ---- Idle: no payment started yet ---- */}
          {!paymentId && (
            <div className="flex flex-col gap-4">
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

              {provider === "BANK_TRANSFER" && bankDetails && (
                <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/50 p-4 text-sm">
                  <p><span className="text-muted-foreground">Bank:</span> {bankDetails.bankName ?? "Not configured"}</p>
                  <p><span className="text-muted-foreground">Account name:</span> {bankDetails.accountName ?? "Not configured"}</p>
                  <p><span className="text-muted-foreground">Account number:</span> {bankDetails.accountNumber ?? "Not configured"}</p>
                </div>
              )}

              <Button
                type="button"
                disabled={initializeMutation.isPending}
                onClick={() => initializeMutation.mutate()}
              >
                {initializeMutation.isPending
                  ? "Processing..."
                  : provider === "PAYSTACK"
                    ? "Pay now"
                    : "I've sent it"}
              </Button>

              {initializeMutation.isError && (
                <p className="text-sm text-destructive">
                  Couldn&apos;t start this payment. Try again, or use bank transfer instead.
                </p>
              )}
            </div>
          )}

          {/* ---- Payment exists: awaiting / confirmed / failed / expired ---- */}
          {paymentId && (paymentLoading || !payment) && (
            <p className="text-sm text-muted-foreground">Loading payment status...</p>
          )}

          {payment && payment.status === "PENDING" && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 p-4">
              <PaymentStatusBadge status="PENDING" />
              {payment.provider === "BANK_TRANSFER" ? (
                <p className="text-sm">
                  We&apos;re waiting to confirm your transfer — this can take a little longer than
                  a card payment. Quote the reference below; we&apos;ll update this page
                  automatically once it&apos;s confirmed.
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
                Licence confirmed — {licensedCompetition.name} is now active. Reference:{" "}
                {payment.reference}.
              </p>
              <Button size="sm" render={<Link href={backHref} />} className="w-fit">
                Back to competition dashboard
              </Button>
            </div>
          )}

          {payment && payment.status === "FAILED" && (
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
              <PaymentStatusBadge status="FAILED" />
              <p className="text-sm">
                Your bank declined the payment. Try again, or pay by bank transfer instead.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-fit"
                onClick={() => {
                  setPaymentId(null);
                }}
              >
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
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Full payment only — instalment/onboarding-fee billing isn&apos;t built yet.
        </CardFooter>
      </Card>
    </Container>
  );
}
