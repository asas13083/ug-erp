/**
 * بيحوّل أي نص المستخدم كتبه لنص آمن قبل ما يدخل جوه أي HTML بيتحوّل PDF.
 * لازم تتستخدم على أي بيانات جايه من المستخدم (اسم صنف، ملاحظة، اسم حفلة...)
 * قبل ما تتحط في template string هيتبعت لـ downloadPdf.
 */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
