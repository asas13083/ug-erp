import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { useLanguage } from '../context/LanguageContext';

const TYPE_LABELS = {
  ISSUE: ['إذن صرف', 'bg-blue-50 text-blue-600'],
  RETURN: ['إذن مرتجع', 'bg-emerald-50 text-emerald-600'],
  CUSTODY: ['نقل عهدة', 'bg-amber-50 text-amber-600'],
};

const STATUS_LABELS = {
  CONFIRMED: ['فعّال', 'bg-emerald-50 text-emerald-600'],
  CANCELLED: ['ملغى', 'bg-gray-100 text-gray-500'],
};

const TYPE_LINK = { ISSUE: '/issue-vouchers-log', RETURN: '/return-vouchers-log', CUSTODY: '/custody-transfers-log' };

export default function TransportLogPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  function load() {
    setLoading(true);
    api
      .get('/transport-log', { params: { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined } })
      .then(({ data }) => setRows(data.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [dateFrom, dateTo]);

  const totalVehicles = rows.filter((r) => r.status !== 'CANCELLED').reduce((sum, r) => sum + (r.vehicleCount || 0), 0);

  function handlePdf() {
    const rowsHtml = rows
      .map((r) => `<tr><td>${esc(t(TYPE_LABELS[r.type]?.[0]))}</td><td>${esc(r.number)}</td><td>${esc(r.eventName)}</td><td>${esc(r.responsible)}</td><td>${r.vehicleCount || '—'}</td><td>${esc(r.transportInfo || '—')}</td><td>${esc(t(STATUS_LABELS[r.status]?.[0] || r.status))}</td><td>${new Date(r.createdAt).toLocaleDateString('ar-EG')}</td></tr>`)
      .join('');
    downloadPdf(
      'سجل النقل (السيارات)',
      `<table><thead><tr><th>النوع</th><th>رقم الإذن</th><th>الحفلة</th><th>المسؤول</th><th>عدد السيارات</th><th>بيانات النقل</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>${rowsHtml}</tbody></table>`,
      { filename: 'سجل-النقل.pdf' }
    );
  }

  return (
    <>
      <PageHeader
        title={t('سجل النقل')}
        subtitle={`${rows.length} ${t('عملية')} · ${totalVehicles} ${t('سيارة')}`}
        action={
          <div className="flex gap-2">
            <button onClick={handlePdf} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('تحميل PDF')}</button>
            <button onClick={() => downloadFile(`/reports/transport-log.xlsx?dateFrom=${dateFrom}&dateTo=${dateTo}`, 'سجل-النقل.xlsx')} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">{t('تصدير Excel')}</button>
          </div>
        }
      />
      <div className="p-7">
        <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-4">
          {t('تجميع كل عمليات النقل (اللي اتسجل فيها عدد سيارات أو ملاحظة نقل) من أذون الصرف والمرتجع ونقل العهدة، في مكان واحد.')}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span>{t('من')}</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
            <span>{t('إلى')}</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-600 hover:text-rose-600 font-bold">{t('مسح الفلتر')}</button>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('النوع')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('رقم الإذن')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحفلة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المسؤول')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('عدد السيارات')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('بيانات النقل')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-10 text-gray-600">{t('جاري التحميل...')}</td></tr>}
              {!loading && rows.map((r) => {
                const [label, cls] = TYPE_LABELS[r.type] || [r.type, ''];
                const [statusLabel, statusCls] = STATUS_LABELS[r.status] || [r.status, ''];
                const isCancelled = r.status === 'CANCELLED';
                return (
                  <tr key={`${r.type}-${r.id}`} className={`border-t border-gray-100 ${isCancelled ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <Link to={TYPE_LINK[r.type]} className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls} hover:opacity-80 transition`}>{t(label)}</Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.number}</td>
                    <td className="px-4 py-3 font-bold">{r.eventName}</td>
                    <td className="px-4 py-3">{r.responsible}</td>
                    <td className="px-4 py-3 font-extrabold">{r.vehicleCount || '—'}</td>
                    <td className="px-4 py-3 text-xs">{r.transportInfo || '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusCls}`}>{t(statusLabel)}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(r.createdAt).toLocaleString('ar-EG')}</td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-gray-600">{t('لا توجد عمليات نقل مسجّلة بعد')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
