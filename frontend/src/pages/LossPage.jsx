import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { useLanguage } from '../context/LanguageContext';

const REASON_LABELS = { DAMAGED: 'تلف', LOST: 'مفقود', THEFT: 'سرقة', OTHER: 'أخرى' };

export default function LossPage() {
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [warehouses, setWarehouses] = useState([]);

  const [reasonFilter, setReasonFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const filters = { reason: reasonFilter || undefined, warehouseId: warehouseFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

  const [editingRecord, setEditingRecord] = useState(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [editReason, setEditReason] = useState('DAMAGED');
  const [editDescription, setEditDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.get('/loss-records', { params: { page, pageSize: 20, ...filters } }).then(({ data }) => {
      setRecords(data.data);
      setMeta(data.meta);
    });
  }
  useEffect(load, [page, reasonFilter, warehouseFilter, dateFrom, dateTo]);
  useEffect(() => setPage(1), [reasonFilter, warehouseFilter, dateFrom, dateTo]);
  useEffect(() => {
    api.get('/warehouses', { params: { pageSize: 200 } }).then(({ data }) => setWarehouses(data.data));
  }, []);

  function printReport() {
    const rows = records
      .map(
        (r) =>
          `<tr><td>${esc(r.item?.name)}</td><td>${esc(REASON_LABELS[r.reason])}</td><td>${r.quantity}</td><td>${esc(r.event?.name || '—')}</td><td>${esc(r.warehouse?.name || '—')}</td><td>${new Date(r.createdAt).toLocaleDateString('ar-EG')}</td></tr>`
      )
      .join('');
    downloadPdf(
      'تقرير الفاقد',
      `<table><thead><tr><th>الصنف</th><th>السبب</th><th>الكمية</th><th>الحفلة</th><th>المخزن</th><th>التاريخ</th></tr></thead><tbody>${rows}</tbody></table>`,
      { filename: 'تقرير-الفاقد.pdf' }
    );
  }

  function openEdit(r) {
    setEditingRecord(r);
    setEditQuantity(r.quantity);
    setEditReason(r.reason);
    setEditDescription(r.description || '');
    setError('');
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.put(`/loss-records/${editingRecord.id}`, { quantity: Number(editQuantity), reason: editReason, description: editDescription });
      setEditingRecord(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('تعذر حفظ التعديل'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(r) {
    if (!window.confirm(`${t('متأكد إنك عايز تلغي سجل الفاقد ده؟')} ${t('الكمية هترجع تلقائياً للمخزون لو كانت اتخصمت.')}`)) return;
    try {
      await api.delete(`/loss-records/${r.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الإلغاء'));
    }
  }

  return (
    <>
      <PageHeader
        title={t('سجل الفاقد')}
        subtitle={`${meta.total} ${t('سجل')}`}
        action={
          <div className="flex gap-2">
            <button onClick={printReport} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('تحميل PDF')}</button>
            <button onClick={() => downloadFile(`/reports/loss.xlsx?${new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()}`, 'تقرير-الفاقد.xlsx')} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">{t('تصدير Excel (حسب الفلتر)')}</button>
          </div>
        }
      />
      <div className="p-7">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">{t('كل الأسباب')}</option>
            {Object.entries(REASON_LABELS).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}
          </select>
          <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">{t('كل المخازن')}</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span>{t('من')}</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
            <span>{t('إلى')}</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
          </div>
          {(reasonFilter || warehouseFilter || dateFrom || dateTo) && (
            <button onClick={() => { setReasonFilter(''); setWarehouseFilter(''); setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-600 hover:text-rose-600 font-bold">{t('مسح الفلتر')}</button>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('الصنف')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('السبب')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الكمية')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحفلة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المخزن')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المسؤول')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المصدر')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                <th className="text-right px-4 py-3 font-bold w-32">{t('إجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className={`border-t border-gray-100 ${r.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-bold">{r.item?.name}</td>
                  <td className="px-4 py-3"><span className="bg-rose-50 text-rose-600 text-xs font-bold px-2.5 py-1 rounded-full">{t(REASON_LABELS[r.reason])}</span></td>
                  <td className="px-4 py-3 font-extrabold">{r.quantity}</td>
                  <td className="px-4 py-3">{r.event?.name || '—'}</td>
                  <td className="px-4 py-3">{r.warehouse?.name || '—'}</td>
                  <td className="px-4 py-3">{r.user?.fullName}</td>
                  <td className="px-4 py-3">
                    {r.source === 'RETURN_VOUCHER' ? (
                      <span className="text-xs text-gray-500">{t('تلقائي من مرتجع')}</span>
                    ) : r.source === 'STOCK_COUNT' ? (
                      <span className="text-xs text-gray-500">{t('تلقائي من جرد')}</span>
                    ) : (
                      <span className="text-xs text-blue-600 font-bold">{t('يدوي')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'CANCELLED' ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{t('ملغى')}</span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">{t('فعّال')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(r.createdAt).toLocaleDateString('ar-EG')}</td>
                  <td className="px-4 py-3">
                    {r.source === 'MANUAL' && r.status !== 'CANCELLED' ? (
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(r)} className="text-blue-600 text-xs font-bold hover:underline">{t('تعديل')}</button>
                        <button onClick={() => handleCancel(r)} className="text-rose-600 text-xs font-bold hover:underline">{t('إلغاء')}</button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {records.length === 0 && <tr><td colSpan={10} className="text-center py-10 text-gray-600">{t('لا يوجد فاقد مسجّل')}</td></tr>}
            </tbody>
          </table>
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
        </div>
      </div>

      {editingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10 px-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleEditSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5 shadow-xl">
            <h3 className="font-extrabold text-lg mb-2">{t('تعديل سجل فاقد')} — {editingRecord.item?.name}</h3>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('الكمية')}</label>
              <input required type="number" min={1} value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('السبب')}</label>
              <select value={editReason} onChange={(e) => setEditReason(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {Object.entries(REASON_LABELS).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('ملاحظات (اختياري)')}</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition">
                {submitting ? t('جاري الحفظ...') : t('حفظ التعديلات')}
              </button>
              <button type="button" onClick={() => setEditingRecord(null)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
