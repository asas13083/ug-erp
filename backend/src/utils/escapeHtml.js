/**
 * بيحوّل أي نص المستخدم كتبه (اسم صنف، ملاحظة، سبب فاقد...) لنص آمن 100%
 * قبل ما يدخل جوه أي HTML بيتحوّل PDF أو بيتبعت إيميل. من غيرها، حد يقدر
 * يكتب كود جوه خانة "ملاحظات" ويتنفّذ فعلياً وقت توليد الـPDF — ده أخطر
 * ثغرة كانت موجودة في النظام، فالدالة دي بتتستخدم في كل مكان بيبني HTML
 * من بيانات المستخدم من غير استثناء.
 */
function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { esc };
