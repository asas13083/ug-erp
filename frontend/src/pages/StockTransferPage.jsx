import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import ItemPicker from '../components/ItemPicker';
import VehiclesInput from '../components/VehiclesInput';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { useLanguage } from '../context/LanguageContext';

export default function StockTransferPage() {
  const { t } = useLanguage();
  const [warehouses, setWarehouses] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [sourceItems, setSourceItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [lines, setLines] = useState([{ itemId: '', quantity: 1 }]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function loadTransfers() {
    api.get('/stock-transfers').then(({ data }) => setTransfers(data.data));
  }

  function handlePdf() {
    const rows = transfers
      .flatMap((tr) => tr.items.map((i) => `<tr><td>${esc(tr.number)}</td><td>${esc(tr.fromWarehouse?.name || '—')}</td><td>${esc(tr.toWarehouse?.name || '—')}</td><td>${esc(i.item.name)}</td><td>${i.quantity}</td><td>${tr.vehicleCount || '—'}</td></tr>`))
      .join('');
    downloadPdf(
      'تقرير النقل بين المخازن',
      `<table><thead><tr><th>رقم العملية</th><th>من مخزن</th><th>إلى مخزن</th><th>الصنف</th><th>الكمية</th><th>عدد السيارات</th></tr></thead><tbody>${rows}</tbody></table>`,
      { filename: 'تقرير-النقل-بين-المخازن.pdf' }
    );
  }

  useEffect(() => {
    api.get('/warehouses', { params: { pageSize: 200 } }).then(({ data }) => setWarehouses(data.data));
    loadTransfers();
  }, []);

  useEffect(() => {
    if (!fromWarehouseId) {
      setSourceItems([]);
      return;
    }
    setLoadingItems(true);
    api
      .get(`/warehouses/${fromWarehouseId}/stock`)
      .then(({ data }) => setSourceItems(data.data))
      .finally(() => setLoadingItems(false));
    setLines([{ itemId: '', quantity: 1 }]);
  }, [fromWarehouseId]);

  function updateLine(idx, field, value) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { itemId: '', quantity: 1 }]);
  }
  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (fromWarehouseId === toWarehouseId) {
      setError(t('لازم يكون المخزن المصدر مختلف عن المخزن الهدف'));
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/stock-transfers', {
        fromWarehouseId,
        toWarehouseId,
        notes,
        vehicles,
        items: lines.filter((l) => l.itemId && l.quantity > 0).map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) })),
      });
      setSuccess(`${t('تم النقل بنجاح — رقم العملية:')} ${data.data.number}`);
      setLines([{ itemId: '', quantity: 1 }]);
      setNotes('');
      setVehicles([]);
      loadTransfers();
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ أثناء النقل'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title={t('النقل بين المخازن')} subtitle={t('نقل أصناف من مخزن لمخزن تاني')} />
      <div className="p-7 max-w-3xl space-y-8">
        {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-4 py-3 text-sm">{error}</div>}
        {success && <div className="text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('من مخزن')}</label>
              <select required value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('اختر المخزن المصدر')}</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('إلى مخزن')}</label>
              <select required value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('اختر المخزن الهدف')}</option>
                {warehouses.filter((w) => w.id !== fromWarehouseId).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="text-sm font-extrabold mb-2">{t('الأصناف')}</div>
            {!fromWarehouseId && <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-2">{t('اختر المخزن المصدر الأول')}</div>}
            {fromWarehouseId && loadingItems && <div className="text-xs text-gray-600 mb-2">{t('جاري تحميل الأصناف...')}</div>}

            <div className="space-y-2">
              {lines.map((line, idx) => {
                const stock = sourceItems.find((s) => s.item.id === line.itemId);
                return (
                  <div key={idx} className="flex gap-2 items-center">
                    <ItemPicker stockItems={sourceItems} value={line.itemId} onChange={(itemId) => updateLine(idx, 'itemId', itemId)} placeholder={fromWarehouseId ? t('اختر صنف') : t('اختر المخزن أولاً')} />
                    <input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    {stock && <span className="text-xs text-gray-600 w-14">{stock.item.unit}</span>}
                    <button type="button" onClick={() => removeLine(idx)} className="text-rose-500 text-sm px-2">{t('حذف')}</button>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={addLine} disabled={!fromWarehouseId} className="text-blue-600 text-sm font-bold mt-2 disabled:text-gray-600">+ {t('إضافة صنف')}</button>
          </div>

          <VehiclesInput value={vehicles} onChange={setVehicles} />

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('ملاحظات (اختياري)')} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />

          <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl">
            {submitting ? t('جاري النقل...') : t('تنفيذ النقل')}
          </button>
        </form>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm flex items-center justify-between">
            <span>{t('سجل عمليات النقل')}</span>
            <div className="flex gap-2">
              <button onClick={handlePdf} className="border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:border-gray-300 transition">{t('تحميل PDF')}</button>
              <button onClick={() => downloadFile('/reports/stock-transfers.xlsx', 'تقرير-النقل-بين-المخازن.xlsx')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">{t('تصدير Excel')}</button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('الرقم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('من')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('إلى')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الأصناف')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('النقل')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((tr) => (
                <tr key={tr.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{tr.number}</td>
                  <td className="px-4 py-3">{tr.fromWarehouse?.name}</td>
                  <td className="px-4 py-3">{tr.toWarehouse?.name}</td>
                  <td className="px-4 py-3 text-xs">{tr.items.map((i) => `${i.item.name} ×${i.quantity}`).join('، ')}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {tr.vehicleCount && tr.transportInfo ? `${tr.vehicleCount} ${t('سيارة')} · ${tr.transportInfo}` : tr.vehicleCount ? `${tr.vehicleCount} ${t('سيارة')}` : tr.transportInfo || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(tr.createdAt).toLocaleString('ar-EG')}</td>
                </tr>
              ))}
              {transfers.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-600">{t('لا توجد عمليات نقل بعد')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
