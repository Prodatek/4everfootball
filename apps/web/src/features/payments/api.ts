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
  reference: string,
): Promise<{ confirmed: true }> {
  const { data } = await apiClient.post<{ confirmed: true }>(`/payments/${id}/confirm-transfer`, {
    reference,
  });
  return data;
}

export async function fetchBankDetails(): Promise<BankDetails> {
  const { data } = await apiClient.get<BankDetails>("/payments/bank-details");
  return data;
}
