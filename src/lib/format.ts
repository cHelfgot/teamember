export const PROCESS_STATUS_LABELS: Record<string, string> = {
  pending_characterization: "ממתין לאפיון ראשוני",
  in_characterization: "תהליך אפיון",
  pending_approval: "ממתין לאישור על אפיון",
  implementation: "תהליך הטמעה",
  training: "הדרכה",
  live: "עובדים על המערכת",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "שולם",
  partial: "חלקי",
  due: "ממתין לתשלום",
};

export const PROCESS_STATUS_OPTIONS = Object.entries(PROCESS_STATUS_LABELS) as [string, string][];

export function formatHours(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return v.toLocaleString("he-IL", { maximumFractionDigits: 1 });
}

export function formatCurrency(n: number | null | undefined): string {
  return Number(n ?? 0).toLocaleString("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
}

export function normalizeUrl(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}
