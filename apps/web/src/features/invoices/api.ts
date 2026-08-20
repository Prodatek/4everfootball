import { apiClient } from "@/lib/api-client";

export type InvoiceStatus = "DRAFT" | "SENT" | "PART_PAID" | "PAID" | "CANCELLED" | "EXPIRED";

export interface InvoiceLine {
  id: string;
  description: string;
  basis: string | null;
  quantity: number;
  unitKobo: number;
  amountKobo: number;
}

export interface Invoice {
  id: string;
  organisationId: string;
  quoteNumber: string;
  status: InvoiceStatus;
  subtotalKobo: number;
  discountKobo: number;
  totalKobo: number;
  validUntil: string;
  depositKobo: number | null;
  balanceKobo: number | null;
  issuedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  lines: InvoiceLine[];
}

export async function fetchInvoicesForOrganisation(organisationId: string): Promise<Invoice[]> {
  const { data } = await apiClient.get<Invoice[]>(`/invoices/organisation/${organisationId}`);
  return data;
}

export async function fetchInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.get<Invoice>(`/invoices/${id}`);
  return data;
}

export async function generateInvoicePdf(id: string): Promise<{ url: string }> {
  const { data } = await apiClient.post<{ url: string }>(`/invoices/${id}/pdf`);
  return data;
}
