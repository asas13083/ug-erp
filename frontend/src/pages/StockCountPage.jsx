import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { useLanguage } from '../context/LanguageContext';

export default function StockCountPage() {
  const { t } = useLanguage();
  const [warehouses, setWarehouses] = useState([]);
  const [counts, setCounts] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [stock, setStock] = useState([]);
  const [actuals, setActuals] = useState({});
  const [loadingStock, setLoadingStock] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function loadCounts() {
    api.get('/stock-counts').then(({ data }) => setCounts(data.data));
  }

  function handlePdf() {
    const rows = counts
      .flatMap((c) =>
        c.items.map(
          (i) =>
            `<tr><td>${esc(c.number)}</td><td>${esc(c.warehouse?.name || '—')}</td><td>${esc(i.item.name)}</td><td>${i.systemQuantity}</td><td>${i.actualQuantity}</td><td>${i.difference > 0 ? '+' : ''}${i.difference}</td></tr>`
        )
      )
      .join('');
    downloadPdf(
      'تقرير الجرد',
      `<table><thead><tr><th>رقم الجرد</th><th>المخزن</th><th>الصنف</th><th>الرصيد بالنظام</th><th>الكمية الفعلية</th><th>الفرق</th></tr></thead><tbody>${rows}</tbody></table>`,
      { filename: 'تقرير-الجرد.pdf' }
    );
  }

  useEffect(() => {
    api.get('/warehouses', { params: { pageSize: 200 } }).then(({ data }) => setWarehouses(data.data));
    loadCounts();
  }, []);

  useEffect(() => {
    if (!warehouseId) {
      setStock([]);
      return;
    }
    setLoadingStock(true);
    api
      .get(`/warehouses/${warehouseId}/stock`)
      .then(({ data }) => {
        setStock(data.data);
        const init = {};
        data.data.forEach((s) => (init[s.item.id] = s.quantity));
        setActuals(init);
      })
      .finally(() => setLoadingStock(false));
  }, [warehouseId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/stock-counts', {
        warehouseId,
        notes,
        items: stock.map((s) => ({ itemId: s.item.id, actualQuantity: Number(actuals[s.item.id] ?? s.quantity) })),
      });
      setSuccess(`${t('تم حفظ الجرد بنجاح — رقم العملية:')} ${data.data.number}`);
      loadCounts();
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ أثناء حفظ الجرد'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title={t('الجرد الدوري')} subtitle={t('عدّ الأصناف فعلياً والنظام يصلّح أي فرق تلقائياً')} />
      <div className="p-7 max-w-3xl space-y-8">
        {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-4 py-3 text-sm">{error}</div>}
        {success && <div className="text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">{t('المخزن')}</label>
            <select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">{t('اختر المخزن اللي هتجرده')}</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          {loadingStock && <div className="text-xs text-gray-600">{t('جاري تحميل الأصناف...')}</div>}

          {stock.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-sm font-extrabold mb-1">{t('عدّ كل صنف فعلياً واكتب الكمية الحقيقية')}</div>
              {stock.map((s) => {
                const actual = actuals[s.item.id] ?? s.quantity;
                const diff = Number(actual) - s.quantity;
                return (
                  <div key={s.item.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <div className="flex-1 text-sm font-bold">
                      {s.item.name} <span className="text-gray-600 font-normal text-xs">({t('بالنظام')}: {s.quantity})</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={actual}
                      onChange={(e) => setActuals((prev) => ({ ...prev, [s.item.id]: e.target.value }))}
                      className="w-24 border border-gray-200 rounded px-2 py-1.5 text-sm"
                    />
                    {diff !== 0 && (
                      <span className={`text-xs font-bold w-20 text-left ${diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{diff > 0 ? `+${diff}` : diff}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('ملاحظات (اختياري)')} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />

          <button type="submit" disabled={submitting || stock.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl">
            {submitting ? t('جاري الحفظ...') : t('حفظ الجرد وتسوية المخزون')}
          </button>
        </form>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm flex items-center justify-between">
            <span>{t('سجل الجرد السابق')}</span>
            <div className="flex gap-2">
              <button onClick={handlePdf} className="border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:border-gray-300 transition">{t('تحميل PDF')}</button>
              <button onClick={() => downloadFile('/reports/stock-counts.xlsx', 'تقرير-الجرد.xlsx')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">{t('تصدير Excel')}</button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('الرقم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المخزن')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الفروقات')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((c) => {
                const diffs = c.items.filter((i) => i.difference !== 0);
                return (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.number}</td>
                    <td className="px-4 py-3">{c.warehouse?.name}</td>
                    <td className="px-4 py-3 text-xs">
                      {diffs.length === 0 ? <span className="text-emerald-600">{t('مفيش فروقات')}</span> : diffs.map((i) => `${i.item.name} (${i.difference > 0 ? '+' : ''}${i.difference})`).join('، ')}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(c.createdAt).toLocaleString('ar-EG')}</td>
                  </tr>
                );
              })}
              {counts.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-gray-600">{t('لا يوجد جرد مسجّل بعد')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
