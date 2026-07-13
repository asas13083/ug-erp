import { useEffect, useState, Fragment } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { getAssetUrl } from '../utils/assetUrl';
import VehiclesInput from '../components/VehiclesInput';
import { esc } from '../utils/escapeHtml';
import { useLanguage } from '../context/LanguageContext';

function transportSummary(v, t) {
  if (v.vehicleCount && v.transportInfo) return `${v.vehicleCount} ${t('سيارة')} · ${v.transportInfo}`;
  if (v.vehicleCount) return `${v.vehicleCount} ${t('سيارة')}`;
  if (v.transportInfo) return v.transportInfo;
  return '—';
}

export default function ReturnVouchersListPage() {
  const { t } = useLanguage();
  const [vouchers, setVouchers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [eventFilter, setEventFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const filters = { eventId: eventFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

  const [showEdit, setShowEdit] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [lines, setLines] = useState([]);
  const [notes, setNotes] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.get('/return-vouchers', { params: { page, pageSize: 20, ...filters } }).then(({ data }) => {
      setVouchers(data.data);
      setMeta(data.meta);
    });
  }
  useEffect(load, [page, eventFilter, dateFrom, dateTo]);
  useEffect(() => setPage(1), [eventFilter, dateFrom, dateTo]);
  useEffect(() => {
    api.get('/events', { params: { pageSize: 200 } }).then(({ data }) => setEvents(data.data));
  }, []);

  function exportExcel() {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    downloadFile(`/reports/return-vouchers.xlsx?${params.toString()}`, 'تقرير-أذون-المرتجع.xlsx');
  }

  function printVoucher(v) {
    const rows = v.items
      .map(
        (i) =>
          `<tr><td>${esc(i.item.name)}</td><td>${i.issuedQuantity}</td><td>${i.returnedQuantity}</td><td>${i.damagedQuantity}</td><td>${i.lostQuantity}</td></tr>`
      )
      .join('');
    downloadPdf(
      `إذن مرتجع`,
      `
      <div class="meta">
        <div><b>رقم الإذن:</b> ${esc(v.number)}</div>
        <div><b>التاريخ:</b> ${new Date(v.createdAt).toLocaleString('ar-EG')}</div>
        <div><b>الحفلة:</b> ${esc(v.event?.name || '—')}</div>
        ${v.handedBy ? `<div><b>المُسلّم:</b> ${esc(v.handedBy.fullName)}</div>` : ''}
        ${v.receivedBy ? `<div><b>المُستلم من الأوبريشن:</b> ${esc(v.receivedBy.fullName)}</div>` : ''}
        <div><b>بواسطة:</b> ${esc(v.user?.fullName || '—')}</div>
        ${v.vehicleCount ? `<div><b>عدد سيارات النقل:</b> ${v.vehicleCount}</div>` : ''}
        ${v.transportInfo ? `<div><b>بيانات النقل:</b> ${esc(v.transportInfo)}</div>` : ''}
      </div>
      <table>
        <thead><tr><th>الصنف</th><th>المصروف</th><th>سليم</th><th>تالف</th><th>مفقود</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      `,
      { docNumber: v.number, clientLogoUrl: getAssetUrl(v.event?.client?.logoUrl), clientName: v.event?.client?.name, filename: `اذن-مرتجع-${v.number}.pdf` }
    );
  }

  async function handleCancel(v) {
    if (!window.confirm(`${t('متأكد إنك عايز تلغي إذن المرتجع')} ${v.number}؟ ${t('هيتم عكس أثره على المخزون.')}`)) return;
    try {
      await api.delete(`/return-vouchers/${v.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر إلغاء الإذن'));
    }
  }

  function openEdit(v) {
    setEditingVoucher(v);
    setNotes(v.notes || '');
    setVehicles(
      Array.isArray(v.vehicles)
        ? v.vehicles.map((x) => (typeof x === 'string' ? { type: x, count: 1 } : x)) // توافق مع بيانات قديمة كانت نص بس
        : []
    );
    setError('');
    setLines(
      v.items.map((i) => ({
        itemId: i.itemId,
        name: i.item.name,
        issuedQuantity: i.issuedQuantity,
        returnedQuantity: i.returnedQuantity,
        damagedQuantity: i.damagedQuantity,
      }))
    );
    setShowEdit(true);
  }

  function updateLine(idx, field, value) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: Number(value) } : l)));
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.put(`/return-vouchers/${editingVoucher.id}`, {
        notes,
        vehicles,
        items: lines.map((l) => ({
          itemId: l.itemId,
          issuedQuantity: l.issuedQuantity,
          returnedQuantity: l.returnedQuantity,
          damagedQuantity: l.damagedQuantity,
        })),
      });
      setShowEdit(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('تعذر حفظ التعديل'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t('سجل أذون المرتجع')}
        subtitle={`${meta.total} ${t('إذن')}`}
        action={<button onClick={exportExcel} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">{t('تصدير Excel (حسب الفلتر)')}</button>}
      />
      <div className="p-7">
        <div className="flex flex-wrap items-center gap-2 mb-4">
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
          {(eventFilter || dateFrom || dateTo) && (
            <button onClick={() => { setEventFilter(''); setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-600 hover:text-rose-600 font-bold">{t('مسح الفلتر')}</button>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold w-6"></th>
                <th className="text-right px-4 py-3 font-bold">{t('الرقم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحفلة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('بواسطة')}</th>
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
                    <td className="px-4 py-3 text-xs">
                      {v.user?.fullName || '—'}
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
                      <td colSpan={8} className="px-6 py-3">
                        <div className="text-xs font-bold text-gray-500 mb-1.5">{t('بنود الإذن')}</div>
                        <table className="w-full text-xs bg-white rounded-lg overflow-hidden border border-gray-100">
                          <thead>
                            <tr className="bg-gray-100 text-gray-600">
                              <th className="text-right px-3 py-2 font-bold">{t('الصنف')}</th>
                              <th className="text-right px-3 py-2 font-bold">{t('مصروف')}</th>
                              <th className="text-right px-3 py-2 font-bold">{t('سليم')}</th>
                              <th className="text-right px-3 py-2 font-bold">{t('تالف')}</th>
                              <th className="text-right px-3 py-2 font-bold">{t('فاقد')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {v.items.map((i) => (
                              <tr key={i.id} className="border-t border-gray-100">
                                <td className="px-3 py-2 font-bold">{i.item.name}</td>
                                <td className="px-3 py-2">{i.issuedQuantity}</td>
                                <td className="px-3 py-2 text-emerald-600">{i.returnedQuantity}</td>
                                <td className="px-3 py-2 text-amber-600">{i.damagedQuantity}</td>
                                <td className="px-3 py-2 text-rose-600">{i.lostQuantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {vouchers.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-gray-600">{t('لا توجد أذون مرتجع بعد')}</td></tr>}
            </tbody>
          </table>
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10 px-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleEditSubmit} className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg">{t('تعديل إذن مرتجع')} — {editingVoucher?.number}</h3>
            <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              {t('التعديل بيعيد حساب المخزون والفاقد التلقائي من جديد بناءً على الأرقام الجديدة.')}
            </div>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}

            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('ملاحظات (اختياري)')} rows={2} />
            <VehiclesInput value={vehicles} onChange={setVehicles} />

            <div className="space-y-2">
              {lines.map((l, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <div className="flex-1 text-sm font-bold">{l.name} <span className="text-gray-600 font-normal">({t('مصروف')} {l.issuedQuantity})</span></div>
                  <div>
                    <label className="block text-[10px] text-gray-600">{t('سليم')}</label>
                    <input type="number" min={0} max={l.issuedQuantity} value={l.returnedQuantity} onChange={(e) => updateLine(idx, 'returnedQuantity', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600">{t('تالف')}</label>
                    <input type="number" min={0} value={l.damagedQuantity} onChange={(e) => updateLine(idx, 'damagedQuantity', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1 text-sm" />
                  </div>
                  <div className="text-xs text-rose-500 w-24 text-left">
                    {t('فاقد')}: {Math.max(l.issuedQuantity - l.returnedQuantity - l.damagedQuantity, 0)}
                  </div>
                </div>
              ))}
            </div>

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
