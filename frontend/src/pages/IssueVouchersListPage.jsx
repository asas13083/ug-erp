import { useEffect, useState, Fragment } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { getAssetUrl } from '../utils/assetUrl';
import ItemPicker from '../components/ItemPicker';
import VehiclesInput from '../components/VehiclesInput';
import { useLanguage } from '../context/LanguageContext';

function transportSummary(v, t) {
  if (v.vehicleCount && v.transportInfo) return `${v.vehicleCount} ${t('سيارة')} · ${v.transportInfo}`;
  if (v.vehicleCount) return `${v.vehicleCount} ${t('سيارة')}`;
  if (v.transportInfo) return v.transportInfo;
  return '—';
}

export default function IssueVouchersListPage() {
  const { t } = useLanguage();
  const [vouchers, setVouchers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [warehouses, setWarehouses] = useState([]);
  const [events, setEvents] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const filters = { warehouseId: warehouseFilter || undefined, eventId: eventFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

  const [showEdit, setShowEdit] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [warehouseItems, setWarehouseItems] = useState([]);
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [lines, setLines] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.get('/issue-vouchers', { params: { page, pageSize: 20, ...filters } }).then(({ data }) => {
      setVouchers(data.data);
      setMeta(data.meta);
    });
  }
  useEffect(load, [page, warehouseFilter, eventFilter, dateFrom, dateTo]);
  useEffect(() => setPage(1), [warehouseFilter, eventFilter, dateFrom, dateTo]);
  useEffect(() => {
    api.get('/warehouses', { params: { pageSize: 200 } }).then(({ data }) => setWarehouses(data.data));
    api.get('/events', { params: { pageSize: 200 } }).then(({ data }) => setEvents(data.data));
  }, []);

  function exportExcel() {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    downloadFile(`/reports/issue-vouchers.xlsx?${params.toString()}`, 'تقرير-أذون-الصرف.xlsx');
  }

  function printVoucher(v) {
    const rows = v.items
      .map((i) => `<tr><td>${esc(i.item.name)}</td><td>${i.quantity}</td><td>${esc(i.item.unit)}</td></tr>`)
      .join('');
    downloadPdf(
      `إذن صرف`,
      `
      <div class="meta">
        <div><b>رقم الإذن:</b> ${esc(v.number)}</div>
        <div><b>التاريخ:</b> ${new Date(v.createdAt).toLocaleString('ar-EG')}</div>
        <div><b>الحفلة:</b> ${esc(v.event?.name || '—')}</div>
        <div><b>المخزن:</b> ${esc(v.warehouse?.name || '—')}</div>
        <div><b>المستلم:</b> ${esc(v.recipientName)}</div>
        ${v.handedBy ? `<div><b>المُسلّم:</b> ${esc(v.handedBy.fullName)}</div>` : ''}
        ${v.receivedBy ? `<div><b>المُستلم من الأوبريشن:</b> ${esc(v.receivedBy.fullName)}</div>` : ''}
        <div><b>بواسطة:</b> ${esc(v.user?.fullName || '—')}</div>
        ${v.vehicleCount ? `<div><b>عدد سيارات النقل:</b> ${v.vehicleCount}</div>` : ''}
        ${v.transportInfo ? `<div><b>بيانات النقل:</b> ${esc(v.transportInfo)}</div>` : ''}
      </div>
      <table>
        <thead><tr><th>الصنف</th><th>الكمية</th><th>الوحدة</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      `,
      { docNumber: v.number, clientLogoUrl: getAssetUrl(v.event?.client?.logoUrl), clientName: v.event?.client?.name, filename: `اذن-صرف-${v.number}.pdf` }
    );
  }

  async function handleCancel(v) {
    if (!window.confirm(`${t('متأكد إنك عايز تلغي إذن الصرف')} ${v.number}؟ ${t('الكميات هترجع تلقائياً للمخزون.')}`)) return;
    try {
      await api.delete(`/issue-vouchers/${v.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر إلغاء الإذن'));
    }
  }

  async function openEdit(v) {
    setEditingVoucher(v);
    setRecipientName(v.recipientName);
    setNotes(v.notes || '');
    setVehicles(Array.isArray(v.vehicles) ? v.vehicles : []);
    setError('');
    const { data } = await api.get(`/warehouses/${v.warehouseId}/stock`);
    setWarehouseItems(data.data);
    setLines(v.items.map((i) => ({ itemId: i.itemId, quantity: i.quantity, name: i.item.name, unit: i.item.unit })));
    setShowEdit(true);
  }

  function updateLine(idx, field, value) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { itemId: '', quantity: 1 }]);
  }
  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.put(`/issue-vouchers/${editingVoucher.id}`, {
        recipientName,
        notes,
        vehicles,
        items: lines.filter((l) => l.itemId && l.quantity > 0).map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) })),
      });
      setShowEdit(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('تعذر حفظ التعديل'));
    } finally {
      setSubmitting(false);
    }
  }

  function stockFor(itemId) {
    return warehouseItems.find((s) => s.item.id === itemId);
  }

  return (
    <>
      <PageHeader
        title={t('سجل أذون الصرف')}
        subtitle={`${meta.total} ${t('إذن')}`}
        action={<button onClick={exportExcel} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">{t('تصدير Excel (حسب الفلتر)')}</button>}
      />
      <div className="p-7">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">{t('كل المخازن')}</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">{t('كل الحفلات')}</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span>{t('من')}</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
            <span>{t('إلى')}</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
          </div>
          {(warehouseFilter || eventFilter || dateFrom || dateTo) && (
            <button onClick={() => { setWarehouseFilter(''); setEventFilter(''); setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-600 hover:text-rose-600 font-bold">{t('مسح الفلتر')}</button>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold w-6"></th>
                <th className="text-right px-4 py-3 font-bold">{t('الرقم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحفلة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المخزن')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المستلم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('النقل')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                <th className="text-right px-4 py-3 font-bold w-48">{t('إجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <Fragment key={v.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                    className={`border-t border-gray-100 hover:bg-gray-50/60 transition cursor-pointer ${v.status === 'CANCELLED' ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-gray-400">{expandedId === v.id ? '▾' : '▸'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.number}</td>
                    <td className="px-4 py-3 font-bold">{v.event?.name}</td>
                    <td className="px-4 py-3">{v.warehouse?.name}</td>
                    <td className="px-4 py-3">
                      {v.recipientName}
                      {(v.handedBy || v.receivedBy) && (
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {v.handedBy && `${t('سلّم')}: ${v.handedBy.fullName}`}
                          {v.handedBy && v.receivedBy && ' · '}
                          {v.receivedBy && `${t('استلم')}: ${v.receivedBy.fullName}`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{transportSummary(v, t)}</td>
                    <td className="px-4 py-3">
                      {v.status === 'CANCELLED' ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600">{t('ملغي')}</span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">{t('فعّال')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(v.createdAt).toLocaleString('ar-EG')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => printVoucher(v)} className="text-blue-600 text-xs font-bold hover:underline">{t('تحميل PDF')}</button>
                        {v.status !== 'CANCELLED' && (
                          <>
                            <button onClick={() => openEdit(v)} className="text-blue-600 text-xs font-bold hover:underline">{t('تعديل')}</button>
                            <button onClick={() => handleCancel(v)} className="text-rose-600 text-xs font-bold hover:underline">{t('إلغاء')}</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === v.id && (
                    <tr className="bg-gray-50/70">
                      <td colSpan={9} className="px-6 py-3">
                        <div className="text-xs font-bold text-gray-500 mb-1.5">{t('بنود الإذن')}</div>
                        <table className="w-full text-xs bg-white rounded-lg overflow-hidden border border-gray-100">
                          <thead>
                            <tr className="bg-gray-100 text-gray-600">
                              <th className="text-right px-3 py-2 font-bold">{t('الصنف')}</th>
                              <th className="text-right px-3 py-2 font-bold">{t('الكمية')}</th>
                              <th className="text-right px-3 py-2 font-bold">{t('الوحدة')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {v.items.map((i) => (
                              <tr key={i.id} className="border-t border-gray-100">
                                <td className="px-3 py-2 font-bold">{i.item.name}</td>
                                <td className="px-3 py-2">{i.quantity}</td>
                                <td className="px-3 py-2 text-gray-500">{i.item.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {vouchers.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-gray-600">{t('لا توجد أذون صرف بعد')}</td></tr>}
            </tbody>
          </table>
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10 px-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleEditSubmit} className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg">{t('تعديل إذن صرف')} — {editingVoucher?.number}</h3>
            <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              {t('أي زيادة في الكمية بتتخصم من المخزون فوراً (لو متاحة)، وأي نقصان أو حذف صنف بيرجع الفرق للمخزون تلقائياً.')}
            </div>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}

            <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('اسم المستلم')} />
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('ملاحظات (اختياري)')} rows={2} />
            <VehiclesInput value={vehicles} onChange={setVehicles} />

            <div className="space-y-2">
              {lines.map((line, idx) => {
                const stock = stockFor(line.itemId);
                return (
                  <div key={idx} className="flex gap-2 items-center">
                    <ItemPicker stockItems={warehouseItems} value={line.itemId} onChange={(itemId) => updateLine(idx, 'itemId', itemId)} />
                    <input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    {stock && <span className="text-xs text-gray-600 w-14">{stock.item.unit}</span>}
                    <button type="button" onClick={() => removeLine(idx)} className="text-rose-500 text-sm px-2">{t('حذف')}</button>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={addLine} className="text-blue-600 text-sm font-bold">+ {t('إضافة صنف')}</button>

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition">
                {submitting ? t('جاري الحفظ...') : t('حفظ التعديلات')}
              </button>
              <button type="button" onClick={() => setShowEdit(false)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
