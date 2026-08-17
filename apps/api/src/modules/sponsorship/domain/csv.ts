/** Minimal RFC-4180-ish CSV serialization — no new dependency for
 * something this small. Quotes any field containing a comma, quote, or
 * newline, doubling embedded quotes. */
function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsvTable(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(','));
  return lines.join('\n');
}
