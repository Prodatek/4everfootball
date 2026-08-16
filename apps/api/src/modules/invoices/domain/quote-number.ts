/**
 * Pure formatting only — the actual sequence number comes from the
 * Postgres `invoice_quote_seq` sequence (collision-proof under concurrency,
 * unlike max()+1), read via InvoicesService.nextQuoteNumber().
 */
export function formatQuoteNumber(
  prefix: string,
  year: number,
  sequence: number,
): string {
  if (!Number.isInteger(sequence) || sequence <= 0) {
    throw new Error('sequence must be a positive integer');
  }

  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}
