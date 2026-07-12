// تصدير أي بيانات جدولية لملف CSV (بيفتح مباشرة في Excel بدون مشاكل ترميز عربي)
export function exportToCsv(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  // \uFEFF (BOM) ضروري عشان Excel يفتح العربي صح من غير ترميز مكسور
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
