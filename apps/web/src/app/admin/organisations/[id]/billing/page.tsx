"use client";

import { use } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { Money } from "@/components/monetisation/money";
import { InvoiceStatusBadge } from "@/components/monetisation/invoice-status-badge";
import { PaymentStatusBadge } from "@/components/monetisation/payment-status-badge";
import { fetchOrganisationById } from "@/features/organisations/api";
import { fetchInvoicesForOrganisation, generateInvoicePdf, type Invoice } from "@/features/invoices/api";
import { fetchPaymentsForOrganisation } from "@/features/payments/api";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const pdfMutation = useMutation({
    mutationFn: () => generateInvoicePdf(invoice.id),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: () => toast.error("Failed to generate PDF"),
  });

  const balanceDue = invoice.balanceKobo ?? invoice.totalKobo;
  const isOutstanding = invoice.status === "SENT" || invoice.status === "PART_PAID";

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="font-medium">{invoice.quoteNumber}</p>
            <p className="text-sm text-muted-foreground">
              Valid until {formatDate(invoice.validUntil)}
            </p>
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/50 p-3 text-sm">
          {invoice.lines.map((line) => (
            <div key={line.id} className="flex items-center justify-between text-muted-foreground">
              <span>
                {line.description}
                {line.basis ? ` (${line.basis})` : ""} × {line.quantity}
              </span>
              <Money kobo={line.amountKobo} />
            </div>
          ))}
          {invoice.discountKobo > 0 && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Discount</span>
              <Money kobo={-invoice.discountKobo} />
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border pt-2 font-medium text-foreground">
            <span>Total</span>
            <Money kobo={invoice.totalKobo} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm">
            {isOutstanding ? (
              <>
                <span className="text-muted-foreground">Due: </span>
                <Money kobo={balanceDue} className="font-medium" />
              </>
            ) : invoice.status === "PAID" ? (
              <span className="text-muted-foreground">
                Paid {invoice.paidAt ? formatDate(invoice.paidAt) : ""}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={pdfMutation.isPending}
            onClick={() => pdfMutation.mutate()}
          >
            {pdfMutation.isPending ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrganisationBillingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: organisation, isLoading: organisationLoading } = useQuery({
    queryKey: ["organisation", id],
    queryFn: () => fetchOrganisationById(id),
  });

  const {
    data: invoices,
    isLoading: invoicesLoading,
    isError: invoicesError,
  } = useQuery({
    queryKey: ["organisation-invoices", id],
    queryFn: () => fetchInvoicesForOrganisation(id),
  });

  const {
    data: payments,
    isLoading: paymentsLoading,
    isError: paymentsError,
  } = useQuery({
    queryKey: ["organisation-payments", id],
    queryFn: () => fetchPaymentsForOrganisation(id),
  });

  if (organisationLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <Container size="sm" className="flex flex-1 flex-col gap-6 py-6">
      <Button render={<Link href={`/admin/organisations/${id}`} />} variant="outline" className="w-fit">
        Back to {organisation?.name ?? "organisation"}
      </Button>

      <h1 className="font-heading text-2xl uppercase">Billing</h1>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg uppercase">Invoices</h2>

        {invoicesLoading && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-32 rounded-md" />
          </div>
        )}

        {!invoicesLoading && invoicesError && (
          <p className="text-sm text-destructive">Failed to load invoices.</p>
        )}

        {!invoicesLoading && !invoicesError && invoices?.length === 0 && (
          <Card size="sm">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No invoices yet.
            </CardContent>
          </Card>
        )}

        {!invoicesLoading && !invoicesError && invoices && invoices.length > 0 && (
          <div className="flex flex-col gap-3">
            {invoices.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg uppercase">Payment history</h2>

        {paymentsLoading && <Skeleton className="h-24 rounded-md" />}

        {!paymentsLoading && paymentsError && (
          <p className="text-sm text-destructive">Failed to load payment history.</p>
        )}

        {!paymentsLoading && !paymentsError && payments?.data.length === 0 && (
          <Card size="sm">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No payments yet.
            </CardContent>
          </Card>
        )}

        {!paymentsLoading && !paymentsError && payments && payments.data.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receipts</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {payments.data.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-1 border-b border-border pb-3 text-sm last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{payment.reference}</span>
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>
                      {payment.provider} · {formatDate(payment.createdAt)}
                      {payment.paidAt ? ` · paid ${formatDate(payment.paidAt)}` : ""}
                    </span>
                    <Money kobo={payment.amountKobo} className="text-foreground" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </Container>
  );
}
