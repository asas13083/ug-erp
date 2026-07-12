import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { getAssetUrl } from '../utils/assetUrl';
import { esc } from '../utils/escapeHtml';
import { useLanguage } from '../context/LanguageContext';

const STATUS_LABELS = {
  PLANNED: ['مخطط لها', 'bg-blue-50 text-blue-600'],
  ONGOING: ['جارية الآن', 'bg-amber-50 text-amber-600'],
  CLOSED: ['مغلقة', 'bg-emerald-50 text-emerald-600'],
  CANCELLED: ['ملغاة', 'bg-gray-100 text-gray-600'],
};

export default function EventDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [assignedUserIds, setAssignedUserIds] = useState([]);
  const [editingAssignments, setEditingAssignments] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get(`/events/${id}`)
      .then(({ data }) => setEvent(data.data))
      .catch((err) => setError(err.response?.data?.message || t('تعذر تحميل بيانات الحفلة')))
      .finally(() => setLoading(false));
    api.get('/auth/users').then(({ data }) => setUsers(data.data)).catch(() => {});
    api.get(`/events/${id}/assignments`).then(({ data }) => setAssignedUserIds(data.data.map((a) => a.userId))).catch(() => {});
  }, [id]);

  function toggleAssignedUser(userId) {
    setAssignedUserIds((prev) => (prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]));
  }

  async function saveAssignments() {
    setSavingAssignments(true);
    try {
      await api.put(`/events/${id}/assignments`, { userIds: assignedUserIds });
      setEditingAssignments(false);
    } catch (err) {
      alert(err.response?.data?.message || t('حدث خطأ'));
    } finally {
      setSavingAssignments(false);
    }
  }

  function handleSummaryPdf() {
    const rows = event.itemsSummary
      .map(
        (s) =>
          `<tr><td>${esc(s.itemName)}</td><td>${s.issued}</td><td>${s.returnedGood}</td><td>${s.damaged}</td><td>${s.lost}</td><td>${s.transferredOut}</td><td>${s.pending}</td><td>${s.settled ? 'اتقفل بالكامل' : 'لسه معلّق'}</td></tr>`
      )
      .join('');
    downloadPdf(
      `ملخص أصناف — ${esc(event.name)}`,
      `<table><thead><tr><th>الصنف</th><th>خرج</th><th>رجع سليم</th><th>تالف</th><th>فاقد</th><th>نقل عهدة</th><th>لسه برا</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table>`,
      { docNumber: event.number, clientLogoUrl: getAssetUrl(event.client?.logoUrl), clientName: event.client?.name, filename: `ملخص-حفلة-${event.name}.pdf` }
    );
  }

  if (loading) return <div className="p-10 text-center text-gray-600">{t('جاري تحميل بيانات الحفلة...')}</div>;
  if (error) return <div className="p-10 text-center text-rose-600">{error}</div>;
  if (!event) return <div className="p-10 text-center text-gray-600">{t('الحفلة غير موجودة')}</div>;
  const [statusLabel, statusCls] = STATUS_LABELS[event.status] || ['—', ''];

  const allSettled = event.itemsSummary.length > 0 && event.itemsSummary.every((s) => s.settled);
  const hasPending = event.itemsSummary.some((s) => !s.settled);

  return (
    <>
      <PageHeader
        title={event.name}
        subtitle={`${event.number} · ${event.client?.name || ''}`}
        action={
          <div className="flex gap-2">
            <Link to="/events" className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('كل الحفلات')}</Link>
            <button onClick={handleSummaryPdf} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('تحميل PDF (ملخص)')}</button>
            <button onClick={() => downloadFile(`/reports/event/${id}.xlsx`, `ملخص-حفلة-${event.name}.xlsx`)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">{t('تصدير ملخص Excel')}</button>
            <button onClick={() => downloadFile(`/reports/event/${id}/full.xlsx`, `حفلة-${event.name}-كامل.xlsx`)} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('كل التفاصيل Excel')}</button>
          </div>
        }
      />
      <div className="p-7">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusCls}`}>{t(statusLabel)}</span>
          <span className="text-sm text-gray-600">{event.location}</span>
          <span className="text-sm text-gray-600">
            {new Date(event.startDate).toLocaleDateString('ar-EG')} → {new Date(event.endDate).toLocaleDateString('ar-EG')}
          </span>
          {event.itemsSummary.length > 0 && (
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${allSettled ? 'bg-emerald-50 text-emerald-600' : hasPending ? 'bg-amber-50 text-amber-600' : ''}`}>
              {allSettled ? `✓ ${t('كل الأصناف اتقفلت بالكامل')}` : t('فيه أصناف لسه معلّقة')}
            </span>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="font-extrabold text-sm">{t('الأوبريشن المعيّنين على الحفلة دي')}</div>
            {!editingAssignments && <button onClick={() => setEditingAssignments(true)} className="text-blue-600 text-xs font-bold hover:underline">{t('تعديل')}</button>}
          </div>

          {!editingAssignments ? (
            <div className="flex flex-wrap gap-2">
              {users.filter((u) => assignedUserIds.includes(u.id)).map((u) => (
                <span key={u.id} className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{u.fullName}</span>
              ))}
              {assignedUserIds.length === 0 && <span className="text-xs text-gray-600">{t('مفيش حد معيّن على الحفلة دي')}</span>}
            </div>
          ) : (
            <>
              <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-50 mb-3">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={assignedUserIds.includes(u.id)} onChange={() => toggleAssignedUser(u.id)} className="w-4 h-4 accent-blue-600" />
                    <span className="text-sm flex-1">{u.fullName}</span>
                    <span className="text-[11px] text-gray-500">{u.roleName}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={saveAssignments} disabled={savingAssignments} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-lg transition">
                  {savingAssignments ? t('جاري الحفظ...') : t('حفظ')}
                </button>
                <button onClick={() => setEditingAssignments(false)} className="border border-gray-200 text-xs font-bold px-4 py-2 rounded-lg">{t('إلغاء')}</button>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-blue-600">{event.issueVouchers.filter((v) => v.status !== 'CANCELLED').length}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('إذن صرف')}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-emerald-600">{event.returnVouchers.filter((v) => v.status !== 'CANCELLED').length}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('إذن مرتجع')}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-rose-600">{event.lossRecords.filter((l) => l.status !== 'CANCELLED').length}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('سجل فاقد')}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-6 overflow-x-auto">
          <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm">
            {t('ملخص الأصناف (مجمّع من كل أذون الصرف والمرتجع الخاصة بالحفلة دي)')}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('الصنف')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('خرج')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('رجع سليم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('تالف')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('فاقد')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('نقل عهدة لحفلة تانية')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('لسه برا')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
              </tr>
            </thead>
            <tbody>
              {event.itemsSummary.map((s) => (
                <tr key={s.itemId} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-bold">
                    {s.itemName}
                    {s.pending > 0 && s.sources?.length > 0 && (
                      <div className="text-[11px] text-gray-500 font-normal mt-0.5">
                        {t('المصدر')}: {s.sources.map((src) => `${src.type === 'warehouse' ? t('من مخزن') : t('نقل عهدة من حفلة')} ${src.name} ×${src.quantity}`).join('، ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{s.issued} <span className="text-gray-500 text-xs">{s.unit}</span></td>
                  <td className="px-4 py-3 text-emerald-600">{s.returnedGood}</td>
                  <td className="px-4 py-3 text-amber-600">{s.damaged}</td>
                  <td className="px-4 py-3 text-rose-600">{s.lost}</td>
                  <td className="px-4 py-3 text-blue-600">{s.transferredOut}</td>
                  <td className="px-4 py-3 font-bold">{s.pending}</td>
                  <td className="px-4 py-3">
                    {s.settled ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">{t('اتقفل بالكامل')}</span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">{t('لسه معلّق')}</span>
                    )}
                  </td>
                </tr>
              ))}
              {event.itemsSummary.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-600">{t('لا توجد أصناف متصرفة لهذه الحفلة بعد')}</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm">{t('تفاصيل كل إذن صرف')}</div>
            <div className="p-2">
              {event.issueVouchers.flatMap((v) => v.items.map((i) => (
                <Link key={i.id} to="/issue-vouchers-log" className={`flex items-center px-3 py-2.5 border-b border-gray-50 last:border-0 text-sm hover:bg-gray-50 transition rounded-lg ${v.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                  <span className="flex-1 font-bold">{i.item.name}</span>
                  <span className="text-blue-600 text-xs ml-3">{v.number} ←</span>
                  <span className="font-extrabold">×{i.quantity}</span>
                  {v.status === 'CANCELLED' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 mr-2">{t('ملغى')}</span>}
                </Link>
              )))}
              {event.issueVouchers.length === 0 && <div className="text-center py-6 text-gray-600 text-sm">{t('لا يوجد صرف لهذه الحفلة بعد')}</div>}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm">{t('تفاصيل كل إذن مرتجع')}</div>
            <div className="p-2">
              {event.returnVouchers.flatMap((v) => v.items.map((i) => (
                <Link key={i.id} to="/return-vouchers-log" className={`flex items-center px-3 py-2.5 border-b border-gray-50 last:border-0 text-sm hover:bg-gray-50 transition rounded-lg ${v.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                  <span className="flex-1 font-bold">{i.item.name}</span>
                  <span className="text-blue-600 text-xs ml-3">{v.number} ←</span>
                  <span className="text-emerald-600 text-xs">{t('سليم')} {i.returnedQuantity}</span>
                  {i.damagedQuantity > 0 && <span className="text-amber-600 text-xs mr-2">{t('تالف')} {i.damagedQuantity}</span>}
                  {i.lostQuantity > 0 && <span className="text-rose-600 text-xs mr-2">{t('فاقد')} {i.lostQuantity}</span>}
                  {v.status === 'CANCELLED' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 mr-2">{t('ملغى')}</span>}
                </Link>
              )))}
              {event.returnVouchers.length === 0 && <div className="text-center py-6 text-gray-600 text-sm">{t('لا يوجد مرتجع لهذه الحفلة بعد')}</div>}
            </div>
          </div>

          {(event.custodyTransfersOut?.length > 0 || event.custodyTransfersIn?.length > 0) && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm">{t('نقل العهدة من/إلى حفلات تانية')}</div>
              <div className="p-2">
                {event.custodyTransfersOut?.map((ct) =>
                  ct.items.map((i) => (
                    <div key={i.id} className={`flex items-center px-3 py-2.5 border-b border-gray-50 last:border-0 text-sm ${ct.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                      <span className="text-amber-600 text-xs font-bold ml-2">{t('خارجة →')}</span>
                      <span className="flex-1 font-bold">{i.item.name}</span>
                      <span className="text-gray-600 text-xs ml-3">{t('إلى')}: {ct.toEvent?.name}</span>
                      <span className="font-extrabold ml-3">×{i.quantity}</span>
                      {ct.status === 'CANCELLED' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{t('ملغى')}</span>}
                    </div>
                  ))
                )}
                {event.custodyTransfersIn?.map((ct) =>
                  ct.items.map((i) => (
                    <div key={i.id} className={`flex items-center px-3 py-2.5 border-b border-gray-50 last:border-0 text-sm ${ct.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                      <span className="text-emerald-600 text-xs font-bold ml-2">{t('← داخلة')}</span>
                      <span className="flex-1 font-bold">{i.item.name}</span>
                      <span className="text-gray-600 text-xs ml-3">{t('من')}: {ct.fromEvent?.name}</span>
                      <span className="font-extrabold ml-3">×{i.quantity}</span>
                      {ct.status === 'CANCELLED' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{t('ملغى')}</span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
