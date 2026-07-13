import { useState, useEffect, Fragment } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import VehiclesInput from '../components/VehiclesInput';
import { useLanguage } from '../context/LanguageContext';

function transportSummary(ct, t) {
  if (ct.vehicleCount && ct.transportInfo) return `${ct.vehicleCount} ${t('سيارة')} · ${ct.transportInfo}`;
  if (ct.vehicleCount) return `${ct.vehicleCount} ${t('سيارة')}`;
  if (ct.transportInfo) return ct.transportInfo;
  return '—';
}

export default function CustodyTransfersListPage() {
  const { t } = useLanguage();
  const [transfers, setTransfers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const [showEdit, setShowEdit] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [receiverName, setReceiverName] = useState('');
  const [users, setUsers] = useState([]);
  const [handedByUserId, setHandedByUserId] = useState('');
  const [receivedByUserId, setReceivedByUserId] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.get('/custody-transfers', { params: { page, pageSize: 20 } }).then(({ data }) => {
      setTransfers(data.data);
      setMeta(data.meta);
    });
  }
  useEffect(load, [page]);
  useEffect(() => {
    api.get('/auth/users').then(({ data }) => setUsers(data.data));
  }, []);

  function printVoucher(ct) {
    const rows = ct.items.map((i) => `<tr><td>${esc(i.item.name)}</td><td>${i.quantity}</td></tr>`).join('');
    downloadPdf(
      'نقل عهدة بين حفلتين',
      `
      <div class="meta">
        <div><b>رقم العملية:</b> ${esc(ct.number)}</div>
        <div><b>التاريخ:</b> ${new Date(ct.createdAt).toLocaleString('ar-EG')}</div>
        <div><b>من حفلة:</b> ${esc(ct.fromEvent?.name || '—')}</div>
        <div><b>إلى حفلة:</b> ${esc(ct.toEvent?.name || '—')}</div>
        <div><b>المستلم:</b> ${esc(ct.receiverName)}</div>
        ${ct.handedBy ? `<div><b>المُسلّم:</b> ${esc(ct.handedBy.fullName)}</div>` : ''}
        ${ct.receivedBy ? `<div><b>المُستلم من الأوبريشن:</b> ${esc(ct.receivedBy.fullName)}</div>` : ''}
        ${ct.vehicleCount ? `<div><b>عدد سيارات النقل:</b> ${ct.vehicleCount}</div>` : ''}
        ${ct.transportInfo ? `<div><b>بيانات النقل:</b> ${esc(ct.transportInfo)}</div>` : ''}
        <div><b>بواسطة:</b> ${esc(ct.user?.fullName || '—')}</div>
      </div>
      <table><thead><tr><th>الصنف</th><th>الكمية</th></tr></thead><tbody>${rows}</tbody></table>
      `,
      { docNumber: ct.number, filename: `نقل-عهدة-${ct.number}.pdf` }
    );
  }

  function openEdit(ct) {
    setEditingTransfer(ct);
    setReceiverName(ct.receiverName);
    setHandedByUserId(ct.handedByUserId || '');
    setReceivedByUserId(ct.receivedByUserId || '');
    setVehicles(
      Array.isArray(ct.vehicles)
        ? ct.vehicles.map((x) => (typeof x === 'string' ? { type: x, count: 1 } : x)) // توافق مع بيانات قديمة كانت نص بس
        : []
    );
    setNotes(ct.notes || '');
    setError('');
    setLines(ct.items.map((i) => ({ itemId: i.itemId, name: i.item.name, unit: i.item.unit, quantity: i.quantity })));
    setShowEdit(true);
  }

  function updateLineQty(idx, value) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: value } : l)));
  }
  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.put(`/custody-transfers/${editingTransfer.id}`, {
        receiverName,
        handedByUserId: handedByUserId || null,
        receivedByUserId: receivedByUserId || null,
        vehicles,
        notes,
        items: lines.filter((l) => l.quantity > 0).map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) })),
      });
      setShowEdit(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('تعذر حفظ التعديل'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(ct) {
    if (!window.confirm(`${t('متأكد إنك عايز تلغي نقل العهدة')} ${ct.number}؟`)) return;
    try {
      await api.delete(`/custody-transfers/${ct.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الإلغاء'));
    }
  }

  return (
    <>
      <PageHeader
        title={t('سجل نقل العهدة بين الحفلات')}
        subtitle={`${meta.total} ${t('عملية')}`}
        action={<button onClick={() => downloadFile('/reports/custody-transfers.xlsx', 'تقرير-نقل-العهدة.xlsx')} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">{t('تصدير Excel')}</button>}
      />
      <div className="p-7">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold w-6"></th>
                <th className="text-right px-4 py-3 font-bold">{t('الرقم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('من حفلة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('إلى حفلة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المستلم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('بواسطة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('بيانات النقل')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                <th className="text-right px-4 py-3 font-bold w-40">{t('إجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((ct) => (
                <Fragment key={ct.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === ct.id ? null : ct.id)}
                    className={`border-t border-gray-100 hover:bg-gray-50/60 transition cursor-pointer ${ct.status === 'CANCELLED' ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-gray-400">{expandedId === ct.id ? '▾' : '▸'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{ct.number}</td>
                    <td className="px-4 py-3 font-bold">{ct.fromEvent?.name}</td>
                    <td className="px-4 py-3 font-bold">{ct.toEvent?.name}</td>
                    <td className="px-4 py-3">
                      {ct.receiverName}
                      {(ct.handedBy || ct.receivedBy) && (
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {ct.handedBy && `${t('سلّم')}: ${ct.handedBy.fullName}`}
                          {ct.handedBy && ct.receivedBy && ' · '}
                          {ct.receivedBy && `${t('استلم')}: ${ct.receivedBy.fullName}`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{ct.user?.fullName || '—'}</td>
                    <td className="px-4 py-3 text-xs">{transportSummary(ct, t)}</td>
                    <td className="px-4 py-3">
                      {ct.status === 'CANCELLED' ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600">{t('ملغي')}</span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">{t('فعّال')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(ct.createdAt).toLocaleString('ar-EG')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => printVoucher(ct)} className="text-blue-600 text-xs font-bold hover:underline">{t('تحميل PDF')}</button>
                        {ct.status !== 'CANCELLED' && (
                          <>
                            <button onClick={() => openEdit(ct)} className="text-blue-600 text-xs font-bold hover:underline">{t('تعديل')}</button>
                            <button onClick={() => handleCancel(ct)} className="text-rose-600 text-xs font-bold hover:underline">{t('إلغاء')}</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === ct.id && (
                    <tr className="bg-gray-50/70">
                      <td colSpan={10} className="px-6 py-3">
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
                            {ct.items.map((i) => (
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
              {transfers.length === 0 && <tr><td colSpan={10} className="text-center py-10 text-gray-600">{t('لا توجد عمليات نقل عهدة بعد')}</td></tr>}
            </tbody>
          </table>
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10 px-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleEditSubmit} className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg">{t('تعديل نقل عهدة')} — {editingTransfer?.number}</h3>
            <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              {t('تقدر تغيّر الكميات أو تحذف صنف، بس مينفعش تضيف صنف جديد هنا — لو محتاج صنف جديد، اعمل عملية نقل منفصلة.')}
            </div>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}

            <input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('اسم المسؤول المستلم في الحفلة التانية')} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">{t('المُسلّم (اختياري)')}</label>
                <select value={handedByUserId} onChange={(e) => setHandedByUserId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">{t('بدون تحديد')}</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">{t('المُستلم من الأوبريشن (اختياري)')}</label>
                <select value={receivedByUserId} onChange={(e) => setReceivedByUserId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">{t('بدون تحديد')}</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </div>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('ملاحظات (اختياري)')} rows={2} />
            <VehiclesInput value={vehicles} onChange={setVehicles} />

            <div className="space-y-2">
              {lines.map((l, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-gray-50 rounded-lg p-3">
                  <span className="flex-1 text-sm font-bold">{l.name}</span>
                  <input type="number" min={0} value={l.quantity} onChange={(e) => updateLineQty(idx, e.target.value)} className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <span className="text-xs text-gray-600 w-14">{l.unit}</span>
                  <button type="button" onClick={() => removeLine(idx)} className="text-rose-500 text-sm px-2">{t('حذف')}</button>
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
