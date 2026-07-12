import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { useLanguage } from '../context/LanguageContext';

const ACTION_LABELS = {
  CREATE: 'إضافة', UPDATE: 'تعديل', DELETE: 'حذف', ISSUE: 'صرف',
  RETURN: 'مرتجع', LOSS: 'فاقد', TRANSFER: 'نقل', STOCK_COUNT: 'جرد', LOGIN: 'دخول',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function thisMonthStr() {
  return new Date().toISOString().slice(0, 7);
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="text-2xl font-extrabold" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-600 font-medium mt-1">{label}</div>
    </div>
  );
}

export default function PeriodReportPage() {
  const { t } = useLanguage();
  const [type, setType] = useState('day');
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    api
      .get('/reports/period', { params: { type, date } })
      .then(({ data }) => setData(data.data))
      .catch((err) => setError(err.response?.data?.message || t('تعذر تحميل التقرير')))
      .finally(() => setLoading(false));
  }

  useEffect(load, [type, date]);

  function handleTypeChange(newType) {
    setType(newType);
    setDate(newType === 'month' ? thisMonthStr() : todayStr());
  }

  function handlePdf() {
    if (!data) return;
    const rows = data.activityLogs
      .map((l) => `<tr><td>${esc(ACTION_LABELS[l.action] || l.action)}</td><td>${esc(l.description)}</td><td>${esc(l.user?.fullName || '—')}</td><td>${new Date(l.createdAt).toLocaleString('ar-EG')}</td></tr>`)
      .join('');
    downloadPdf(
      type === 'month' ? `تقرير شهر ${date}` : `تقرير يوم ${date}`,
      `<table><thead><tr><th>العملية</th><th>الوصف</th><th>المستخدم</th><th>الوقت</th></tr></thead><tbody>${rows}</tbody></table>`,
      { filename: `تقرير-${date}.pdf` }
    );
  }

  return (
    <>
      <PageHeader
        title={t('التقرير اليومي / الشهري')}
        subtitle={t('ملخص شامل لكل حاجة حصلت في الفترة اللي تختارها')}
        action={
          data && (
            <div className="flex gap-2">
              <button onClick={handlePdf} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('تحميل PDF')}</button>
              <button onClick={() => downloadFile(`/reports/period.xlsx?type=${type}&date=${date}`, `تقرير-${date}.xlsx`)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">{t('تصدير Excel')}</button>
            </div>
          )
        }
      />
      <div className="p-7">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
            <button onClick={() => handleTypeChange('day')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${type === 'day' ? 'bg-white shadow-sm' : 'text-gray-600'}`}>{t('يومي')}</button>
            <button onClick={() => handleTypeChange('month')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${type === 'month' ? 'bg-white shadow-sm' : 'text-gray-600'}`}>{t('شهري')}</button>
          </div>
          <input
            type={type === 'month' ? 'month' : 'date'}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {loading && <div className="text-gray-600 text-sm">{t('جاري تحميل التقرير...')}</div>}
        {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-4 py-3 text-sm">{error}</div>}

        {data && !loading && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <StatCard label={t('أذون صرف')} value={data.summary.issueVouchersCount} color="#2D6CDF" />
              <StatCard label={t('أصناف اتصرفت')} value={data.summary.totalIssuedQty} color="#2D6CDF" />
              <StatCard label={t('أذون مرتجع')} value={data.summary.returnVouchersCount} color="#0E9F6E" />
              <StatCard label={t('أصناف رجعت سليمة')} value={data.summary.totalReturnedQty} color="#0E9F6E" />
              <StatCard label={t('أصناف تالفة')} value={data.summary.totalDamagedQty} color="#C77700" />
              <StatCard label={t('سجلات فاقد')} value={data.summary.lossRecordsCount} color="#D6374B" />
              <StatCard label={t('حفلات جديدة')} value={data.summary.newEventsCount} color="#7C3AED" />
              <StatCard label={t('أصناف/عملاء جدد')} value={`${data.summary.newItemsCount} / ${data.summary.newClientsCount}`} color="#6B7280" />
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
              <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm">{t('كل العمليات')} ({data.summary.activityCount})</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs">
                    <th className="text-right px-4 py-3 font-bold">{t('العملية')}</th>
                    <th className="text-right px-4 py-3 font-bold">{t('الوصف')}</th>
                    <th className="text-right px-4 py-3 font-bold">{t('المستخدم')}</th>
                    <th className="text-right px-4 py-3 font-bold">{t('الوقت')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activityLogs.map((l) => (
                    <tr key={l.id} className="border-t border-gray-100">
                      <td className="px-4 py-3"><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{t(ACTION_LABELS[l.action] || l.action)}</span></td>
                      <td className="px-4 py-3">{l.description}</td>
                      <td className="px-4 py-3">{l.user?.fullName}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{new Date(l.createdAt).toLocaleString('ar-EG')}</td>
                    </tr>
                  ))}
                  {data.activityLogs.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-gray-600">{t('لا توجد أي عمليات في الفترة دي')}</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
