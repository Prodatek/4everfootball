import type { PaginatedResult } from "@4ef/shared";
import { apiClient } from "@/lib/api-client";

export type PaymentProvider = "PAYSTACK" | "BANK_TRANSFER" | "CASH";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "ABANDONED";

export interface Payment {
  id: string;
  organisationId: string;
  reference: string;
  provider: PaymentProvider;
  providerReference: string | null;
  amountKobo: number;
  currency: string;
  status: PaymentStatus;
  purpose: string;
  subjectType: string;
  subjectId: string;
  paidAt: string | null;
  createdAt: string;
  transferProofUrl: string | null;
  transferNote: string | null;
}

export interface PaymentWithOrganisation extends Payment {
  organisation: { name: string };
}

export interface WebhookEvent {
  id: string;
  provider: string;
  eventType: string;
  providerReference: string | null;
  signatureValid: boolean;
  rawBody: string;
  processedAt: string | null;
  processingError: string | null;
  createdAt: string;
}

export interface RevenueSummary {
  totalCollectedKobo: number;
  totalOutstandingKobo: number;
  byOrganisation: Array<{ organisationId: string; name: string; collectedKobo: number }>;
  byCompetition: Array<{ competitionId: string; name: string; collectedKobo: number }>;
  outstandingByOrganisation: Array<{ organisationId: string; name: string; outstandingKobo: number }>;
}

export interface BankDetails {
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
}

export async function initializeLicencePayment(
  organisationId: string,
  competitionId: string,
  provider: PaymentProvider,
  payerEmail?: string,
): Promise<{ payment: Payment; authorizationUrl: string | null }> {
  const { data } = await apiClient.post("/payments/initialize", {
    organisationId,
    competitionId,
    provider,
    payerEmail,
  });
  return data;
}

export async function fetchPayment(id: string): Promise<Payment> {
  const { data } = await apiClient.get<Payment>(`/payments/${id}`);
  return data;
}

export async function verifyPayment(id: string): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>(`/payments/${id}/verify`);
  return data;
}

export async function confirmBankTransfer(
  id: string,
  details: { providerReference?: string; transferProofUrl?: string; transferNote?: string },
): Promise<{ confirmed: true }> {
  const { data } = await apiClient.post<{ confirmed: true }>(
    `/payments/${id}/confirm-transfer`,
    details,
  );
  return data;
}

export async function fetchBankDetails(): Promise<BankDetails> {
  const { data } = await apiClient.get<BankDetails>("/payments/bank-details");
  return data;
}

// §5 D1: an organiser's payment history.
export async function fetchPaymentsForOrganisation(
  organisationId: string,
  status?: PaymentStatus,
): Promise<PaginatedResult<Payment>> {
  const { data } = await apiClient.get<PaginatedResult<Payment>>("/payments", {
    params: { organisationId, status, limit: 50 },
  });
  return data;
}

// §5 D2, internal-only, below.
export async function fetchPaymentsNeedingReconciliation(): Promise<PaymentWithOrganisation[]> {
  const { data } = await apiClient.get<PaymentWithOrganisation[]>("/payments/reconciliation");
  return data;
}

export async function fetchRevenueSummary(): Promise<RevenueSummary> {
  const { data } = await apiClient.get<RevenueSummary>("/payments/revenue-summary");
  return data;
}

export async function fetchWebhookEvents(page = 1): Promise<PaginatedResult<WebhookEvent>> {
  const { data } = await apiClient.get<PaginatedResult<WebhookEvent>>("/payments/webhook-events", {
    params: { page, limit: 20 },
  });
  return data;
}
