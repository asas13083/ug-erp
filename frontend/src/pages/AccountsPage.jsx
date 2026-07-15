import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { useLanguage } from '../context/LanguageContext';

export default function AccountsPage() {
  const { t, lang } = useLanguage();
  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [month, setMonth] = useState('');
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';

  const filters = { q: q || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

  useEffect(() => {
    api.get('/event-costs/events-list', { params: { ...filters, page, pageSize: 20 } }).then(({ data }) => {
      setEvents(data.data);
      setMeta(data.meta);
    });
  }, [q, dateFrom, dateTo, page]);

  useEffect(() => setPage(1), [q, dateFrom, dateTo]);

  function handleMonthChange(value) {
    setMonth(value);
    if (!value) {
      setDateFrom('');
      setDateTo('');
      return;
    }
    const [year, m] = value.split('-').map(Number);
    const from = new Date(year, m - 1, 1);
    const to = new Date(year, m, 0);
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to.toISOString().slice(0, 10));
  }

  const overallTotal = meta.overallTotal || 0;
  const overallSuppliersDue = meta.overallSuppliersDue || 0;

  function exportPdf() {
    const rows = events.map((ev) => `<tr><td>${esc(ev.number)}</td><td>${esc(ev.name)}</td><td>${esc(ev.client?.name || '—')}</td><td>${new Date(ev.startDate).toLocaleDateString('ar-EG')}</td><td>${(ev.suppliersTotal || 0).toLocaleString()}</td><td>${(ev.suppliersDue || 0).toLocaleString()}</td><td>${ev.costsTotal.toLocaleString()}</td><td>${ev.laborDaysCount || '—'}</td></tr>`).join('');
    downloadPdf(
      'كشوفات تكاليف الحفلات',
      `<table><thead><tr><th>رقم الحفلة</th><th>اسم الحفلة</th><th>العميل</th><th>التاريخ</th><th>الموردين</th><th>مديونية الموردين</th><th>الإجمالي</th><th>عدد أيام العمالة</th></tr></thead><tbody>${rows}
        <tr style="font-weight:bold; background:#f3f4f6;"><td colspan="5">إجمالي كل الحفلات</td><td>${overallSuppliersDue.toLocaleString()}</td><td>${overallTotal.toLocaleString()}</td><td></td></tr>
      </tbody></table>`,
      { filename: 'كشوفات-تكاليف-الحفلات.pdf' }
    );
  }

  return (
    <>
      <PageHeader
        title={t('كشوفات تكاليف الحفلات')}
        subtitle={t('اختار حفلة تشوف كشف حساباتها بالتفصيل')}
        action={
          <div className="flex gap-2">
            <button onClick={exportPdf} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('تحميل PDF')}</button>
            <button
              onClick={() => downloadFile(`/event-costs/events-list/export.xlsx?${new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()}`, 'كشوفات-تكاليف-الحفلات.xlsx')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition"
            >
              {t('تصدير Excel')}
            </button>
          </div>
        }
      />
      <div className="p-7">
        <div className="flex flex-wrap gap-4 mb-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm inline-block">
            <div className="text-2xl font-extrabold text-blue-600">{overallTotal.toLocaleString()}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('إجمالي كل الحفلات المعروضة دلوقتي')}</div>
          </div>
          {overallSuppliersDue > 0.001 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-sm inline-block">
              <div className="text-2xl font-extrabold text-rose-600">{overallSuppliersDue.toLocaleString()}</div>
              <div className="text-xs text-gray-600 font-medium mt-1">{t('إجمالي مديونية الموردين لكل الحفلات المعروضة')}</div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('ابحث باسم الحفلة أو رقمها...')}
            className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-white w-64"
          />
          <input type="month" value={month} onChange={(e) => handleMonthChange(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white" />
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span>{t('من')}</span>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setMonth(''); }} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
            <span>{t('إلى')}</span>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setMonth(''); }} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
          </div>
          {(q || dateFrom || dateTo) && (
            <button onClick={() => { setQ(''); setDateFrom(''); setDateTo(''); setMonth(''); }} className="text-xs text-gray-600 hover:text-rose-600 font-bold">{t('مسح الفلتر')}</button>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('رقم الحفلة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('اسم الحفلة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('العميل')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الموردين')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('مديونية الموردين')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الإجمالي')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('عدد أيام العمالة')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{ev.number}</td>
                  <td className="px-4 py-3">
                    <Link to={`/accounts/${ev.id}`} className="font-bold text-gray-900 hover:text-blue-600 transition">{ev.name}</Link>
                  </td>
                  <td className="px-4 py-3">{ev.client?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(ev.startDate).toLocaleDateString(locale)}</td>
                  <td className="px-4 py-3 text-amber-700 font-bold">{(ev.suppliersTotal || 0).toLocaleString()}</td>
                  <td className={`px-4 py-3 font-bold ${ev.suppliersDue > 0.001 ? 'text-rose-600' : 'text-emerald-600'}`}>{(ev.suppliersDue || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-extrabold">{ev.costsTotal.toLocaleString()}</td>
                  <td className="px-4 py-3">{ev.laborDaysCount || '—'}</td>
                </tr>
              ))}
              {events.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-gray-600">{t('لا توجد حفلات مطابقة')}</td></tr>}
            </tbody>
          </table>
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
        </div>
      </div>
    </>
  );
}
