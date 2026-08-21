"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Container } from "@/components/layout/container";
import { Money } from "@/components/monetisation/money";
import { PaymentStatusBadge } from "@/components/monetisation/payment-status-badge";
import { InvoiceStatusBadge } from "@/components/monetisation/invoice-status-badge";
import { useAuth } from "@/features/auth/auth-context";
import {
  confirmBankTransfer,
  fetchPaymentsNeedingReconciliation,
  fetchRevenueSummary,
  fetchWebhookEvents,
  verifyPayment,
  type PaymentWithOrganisation,
} from "@/features/payments/api";
import { TransferConfirmDialog } from "@/features/payments/transfer-confirm-dialog";
import {
  confirmSubscriptionRequest,
  fetchPendingSubscriptionRequests,
} from "@/features/academy/api";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RevenueAdminPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isSuperAdmin = !!user && user.roles.includes("SUPER_ADMIN");
  const queryClient = useQueryClient();
  const [transferTarget, setTransferTarget] = useState<PaymentWithOrganisation | null>(null);
  const [webhookPage, setWebhookPage] = useState(1);

  useEffect(() => {
    if (!isAuthLoading && !isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, isSuperAdmin, router]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["revenue-summary"],
    queryFn: fetchRevenueSummary,
    enabled: isSuperAdmin,
  });

  const {
    data: reconciliation,
    isLoading: reconciliationLoading,
  } = useQuery({
    queryKey: ["payments-reconciliation"],
    queryFn: fetchPaymentsNeedingReconciliation,
    enabled: isSuperAdmin,
    refetchInterval: 30_000,
  });

  const { data: webhookEvents, isLoading: webhookLoading } = useQuery({
    queryKey: ["webhook-events", webhookPage],
    queryFn: () => fetchWebhookEvents(webhookPage),
    enabled: isSuperAdmin,
  });

  const {
    data: academyRequests,
    isLoading: academyRequestsLoading,
  } = useQuery({
    queryKey: ["academy-subscription-requests"],
    queryFn: fetchPendingSubscriptionRequests,
    enabled: isSuperAdmin,
  });

  const confirmAcademyMutation = useMutation({
    mutationFn: (requestId: string) => confirmSubscriptionRequest(requestId),
    onSuccess: () => {
      toast.success("Payment confirmed — academy plan activated");
      void queryClient.invalidateQueries({ queryKey: ["academy-subscription-requests"] });
    },
    onError: () => toast.error("Failed to confirm payment"),
  });

  function invalidateAfterConfirm() {
    void queryClient.invalidateQueries({ queryKey: ["payments-reconciliation"] });
    void queryClient.invalidateQueries({ queryKey: ["revenue-summary"] });
  }

  const transferMutation = useMutation({
    mutationFn: (details: { providerReference?: string; transferProofUrl?: string; transferNote?: string }) =>
      confirmBankTransfer(transferTarget!.id, details),
    onSuccess: () => {
      toast.success("Payment confirmed");
      setTransferTarget(null);
      invalidateAfterConfirm();
    },
    onError: () => toast.error("Failed to confirm payment"),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => verifyPayment(id),
    onSuccess: (result) => {
      if (result.status === "success") {
        toast.success("Payment verified as paid");
      } else {
        toast.info(`Paystack reports: ${result.status}`);
      }
      invalidateAfterConfirm();
    },
    onError: () => toast.error("Failed to re-verify with Paystack"),
  });

  if (isAuthLoading || !isSuperAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <Container size="lg" className="flex flex-1 flex-col gap-6 py-6">
      <h1 className="font-heading text-2xl uppercase">Revenue</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex flex-col gap-1 py-4">
            <p className="text-sm text-muted-foreground">Total collected</p>
            {summaryLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="font-heading text-2xl">
                <Money kobo={summary?.totalCollectedKobo ?? 0} />
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 py-4">
            <p className="text-sm text-muted-foreground">Total outstanding</p>
            {summaryLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="font-heading text-2xl">
                <Money kobo={summary?.totalOutstandingKobo ?? 0} />
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Collected by organisation</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading && <Skeleton className="h-24 rounded-md" />}
            {!summaryLoading && summary?.byOrganisation.length === 0 && (
              <p className="text-sm text-muted-foreground">No payments collected yet.</p>
            )}
            {!summaryLoading && summary && summary.byOrganisation.length > 0 && (
              <Table>
                <TableBody>
                  {summary.byOrganisation.map((row) => (
                    <TableRow key={row.organisationId}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-right">
                        <Money kobo={row.collectedKobo} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Collected by competition</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading && <Skeleton className="h-24 rounded-md" />}
            {!summaryLoading && summary?.byCompetition.length === 0 && (
              <p className="text-sm text-muted-foreground">No competition-linked payments yet.</p>
            )}
            {!summaryLoading && summary && summary.byCompetition.length > 0 && (
              <Table>
                <TableBody>
                  {summary.byCompetition.map((row) => (
                    <TableRow key={row.competitionId}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-right">
                        <Money kobo={row.collectedKobo} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments needing reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          {reconciliationLoading && <Skeleton className="h-24 rounded-md" />}
          {!reconciliationLoading && reconciliation?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing outstanding.</p>
          )}
          {!reconciliationLoading && reconciliation && reconciliation.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliation.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.organisation.name}</TableCell>
                    <TableCell>{payment.provider}</TableCell>
                    <TableCell>
                      <Money kobo={payment.amountKobo} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(payment.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.provider === "PAYSTACK" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={verifyMutation.isPending}
                          onClick={() => verifyMutation.mutate(payment.id)}
                        >
                          Re-verify
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setTransferTarget(payment)}>
                          Mark paid by transfer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Academy plan requests awaiting confirmation</CardTitle>
        </CardHeader>
        <CardContent>
          {academyRequestsLoading && <Skeleton className="h-24 rounded-md" />}
          {!academyRequestsLoading && academyRequests?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing awaiting confirmation.</p>
          )}
          {!academyRequestsLoading && academyRequests && academyRequests.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {academyRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.organisation.name}</TableCell>
                    <TableCell>{request.planKey}</TableCell>
                    <TableCell className="text-muted-foreground">{request.invoice.quoteNumber}</TableCell>
                    <TableCell>
                      <Money kobo={request.invoice.totalKobo} />
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={request.invoice.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(request.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={confirmAcademyMutation.isPending}
                        onClick={() => confirmAcademyMutation.mutate(request.id)}
                      >
                        Confirm payment &amp; activate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook log</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {webhookLoading && <Skeleton className="h-24 rounded-md" />}
          {!webhookLoading && webhookEvents?.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No webhook events recorded yet.</p>
          )}
          {!webhookLoading && webhookEvents && webhookEvents.data.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Signature</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhookEvents.data.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.eventType}</TableCell>
                      <TableCell>{event.provider}</TableCell>
                      <TableCell>
                        {event.signatureValid ? (
                          <Badge variant="outline" className="gap-1 border-live/40 bg-live/10 text-live">
                            <CheckCircle2 className="size-3.5" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 border-destructive/40 bg-destructive/10 text-destructive">
                            <XCircle className="size-3.5" />
                            Invalid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.providerReference ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(event.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.processingError ?? (event.processedAt ? "Processed" : "Pending")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={webhookPage <= 1}
                  onClick={() => setWebhookPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {webhookEvents.meta.page} of {webhookEvents.meta.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={webhookPage >= webhookEvents.meta.totalPages}
                  onClick={() => setWebhookPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <TransferConfirmDialog
        payment={transferTarget}
        onOpenChange={(open) => !open && setTransferTarget(null)}
        isSubmitting={transferMutation.isPending}
        onConfirm={async (details) => {
          await transferMutation.mutateAsync(details);
        }}
      />
    </Container>
  );
}
