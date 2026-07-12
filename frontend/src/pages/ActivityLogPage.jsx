import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { downloadFile } from '../utils/downloadFile';
import { resolveActivityLink } from '../utils/activityLink';
import { useLanguage } from '../context/LanguageContext';

const ACTION_LABELS = {
  CREATE: ['إضافة', 'bg-gray-100 text-gray-600'],
  UPDATE: ['تعديل', 'bg-gray-100 text-gray-600'],
  DELETE: ['حذف', 'bg-rose-50 text-rose-600'],
  ISSUE: ['صرف', 'bg-blue-50 text-blue-600'],
  RETURN: ['مرتجع', 'bg-emerald-50 text-emerald-600'],
  LOSS: ['فاقد', 'bg-rose-50 text-rose-600'],
  TRANSFER: ['نقل', 'bg-amber-50 text-amber-600'],
  STOCK_COUNT: ['جرد', 'bg-purple-50 text-purple-600'],
  LOGIN: ['دخول', 'bg-gray-100 text-gray-600'],
};

export default function ActivityLogPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);

  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filters = { action: action || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

  useEffect(() => {
    api.get('/activity-log', { params: { page, pageSize: 30, ...filters } }).then(({ data }) => {
      setLogs(data.data);
      setMeta(data.meta);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, action, dateFrom, dateTo]);

  useEffect(() => setPage(1), [action, dateFrom, dateTo]);

  function exportExcel() {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    downloadFile(`/reports/activity-log.xlsx?${params.toString()}`, 'تقرير-سجل-الحركة.xlsx');
  }

  return (
    <>
      <PageHeader
        title={t('سجل الحركة')}
        subtitle={`${meta.total} ${t('عملية مسجّلة')}`}
        action={<button onClick={exportExcel} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">{t('تصدير Excel (حسب الفلتر)')}</button>}
      />
      <div className="p-7">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select value={action} onChange={(e) => setAction(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">{t('كل العمليات')}</option>
            {Object.entries(ACTION_LABELS).map(([key, [label]]) => <option key={key} value={key}>{t(label)}</option>)}
          </select>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span>{t('من')}</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
            <span>{t('إلى')}</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
          </div>
          {(action || dateFrom || dateTo) && (
            <button onClick={() => { setAction(''); setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-600 hover:text-rose-600 font-bold">{t('مسح الفلتر')}</button>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
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
              {logs.map((log) => {
                const [label, cls] = ACTION_LABELS[log.action] || [log.action, ''];
                const link = resolveActivityLink(log);
                return (
                  <tr
                    key={log.id}
                    onClick={() => link && navigate(link)}
                    className={`border-t border-gray-100 ${link ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  >
                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{t(label)}</span></td>
                    <td className="px-4 py-3">{log.description}</td>
                    <td className="px-4 py-3">{log.user?.fullName}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('ar-EG')}</td>
                  </tr>
                );
              })}
              {logs.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-gray-600">{t('لا يوجد سجل حركة مطابق')}</td></tr>}
            </tbody>
          </table>
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
        </div>
      </div>
    </>
  );
}
