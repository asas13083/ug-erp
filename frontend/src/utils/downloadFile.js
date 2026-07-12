import api from '../api/client';

// بيحمّل أي ملف من الباك إند (زي ملفات Excel) — الجلسة بتتبعت تلقائياً عبر الكوكيز
export async function downloadFile(url, filename) {
  const { data } = await api.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}
