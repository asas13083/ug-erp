import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { useLanguage } from '../context/LanguageContext';

export default function AccountsComparisonPage() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';
  const filters = { q: q || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

  function load() {
    api.get('/event-costs/comparison', { params: filters }).then(({ data }) => setData(data.data));
  }
  useEffect(load, [q, dateFrom, dateTo]);

  function exportPdf() {
    if (!data) return;
    const rows = data.rows
      .map(
        (r) =>
          `<tr><td>${esc(r.name)}</td><td>${new Date(r.startDate).toLocaleDateString('ar-EG')}</td><td>${r.itemsTotal.toLocaleString()}</td><td>${r.categoryTotals.DECOR_LABOR.toLocaleString()}</td><td>${r.categoryTotals.UNIFORMS.toLocaleString()}</td><td>${r.categoryTotals.TRANSPORT.toLocaleString()}</td><td>${r.categoryTotals.MICROBUS.toLocaleString()}</td><td>${r.suppliersTotal.toLocaleString()}</td><td>${r.suppliersDue.toLocaleString()}</td><td>${r.grandTotal.toLocaleString()}</td></tr>`
      )
      .join('');
    downloadPdf(
      'تقرير مقارنة الحفلات',
      `<table><thead><tr><th>الحفلة</th><th>التاريخ</th><th>بنود التوتال</th><th>عمالة الديكور</th><th>البدلات</th><th>النقل</th><th>الميكروباص</th><th>الموردين</th><th>مديونية الموردين</th><th>الإجمالي</th></tr></thead><tbody>${rows}
        <tr style="font-weight:bold; background:#f3f4f6;"><td colspan="8">إجمالي كل الحفلات</td><td>${data.overallSuppliersDue.toLocaleString()}</td><td>${data.overallTotal.toLocaleString()}</td></tr>
      </tbody></table>`,
      { filename: 'تقرير-مقارنة-الحفلات.pdf' }
    );
  }

  if (!data) return <div className="p-10 text-center text-gray-600">{t('جاري التحميل...')}</div>;

  return (
    <>
      <PageHeader
        title={t('تقرير مقارنة الحفلات')}
        subtitle={t('مصاريف كل حفلة جنب بعض، ومتوسط التكلفة، عشان يفيدك في التسعير المستقبلي')}
        action={
          <div className="flex gap-2">
            <button onClick={exportPdf} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('تحميل PDF')}</button>
            <button
              onClick={() => downloadFile(`/event-costs/comparison/export.xlsx?${new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()}`, 'تقرير-مقارنة-الحفلات.xlsx')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition"
            >
              {t('تصدير Excel')}
            </button>
          </div>
        }
      />
      <div className="p-7">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('ابحث باسم الحفلة أو رقمها...')} className="border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-white w-64" />
          <span className="text-xs text-gray-600">{t('من')}</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
          <span className="text-xs text-gray-600">{t('إلى')}</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
          {(q || dateFrom || dateTo) && (
            <button onClick={() => { setQ(''); setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-600 hover:text-rose-600 font-bold">{t('مسح الفلتر')}</button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-blue-600">{data.rows.length}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('عدد الحفلات')}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-emerald-600">{data.overallTotal.toLocaleString()}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('إجمالي المصروف')}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-purple-600">{Math.round(data.averagePerEvent).toLocaleString()}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('متوسط تكلفة الحفلة')}</div>
          </div>
          {data.overallSuppliersDue > 0.001 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-sm">
              <div className="text-2xl font-extrabold text-rose-600">{data.overallSuppliersDue.toLocaleString()}</div>
              <div className="text-xs text-gray-600 font-medium mt-1">{t('إجمالي مديونية الموردين لكل الحفلات')}</div>
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-700 space-y-0.5">
              {data.categorySums.map((c) => (
                <div key={c.category} className="flex justify-between text-xs">
                  <span>{t(c.label)}</span><span className="font-extrabold">{c.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-600 font-medium mt-2">{t('إجمالي كل تصنيف متراكم')}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('الحفلة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('بنود التوتال')}</th>
                {Object.entries(data.categoryLabels).map(([key, label]) => (
                  <th key={key} className="text-right px-4 py-3 font-bold">{t(label)}</th>
                ))}
                <th className="text-right px-4 py-3 font-bold">{t('الموردين')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('مديونية الموردين')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الإجمالي')}</th>
                <th className="text-right px-4 py-3 font-bold w-24">{t('إجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <Link to={`/accounts/${r.id}`} className="font-bold text-gray-900 hover:text-blue-600 transition">{r.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(r.startDate).toLocaleDateString(locale)}</td>
                  <td className="px-4 py-3">{r.itemsTotal.toLocaleString()}</td>
                  {Object.keys(data.categoryLabels).map((key) => (
                    <td key={key} className="px-4 py-3">{r.categoryTotals[key].toLocaleString()}</td>
                  ))}
                  <td className="px-4 py-3 text-amber-700 font-bold">{r.suppliersTotal.toLocaleString()}</td>
                  <td className={`px-4 py-3 font-bold ${r.suppliersDue > 0.001 ? 'text-rose-600' : 'text-emerald-600'}`}>{r.suppliersDue.toLocaleString()}</td>
                  <td className="px-4 py-3 font-extrabold">{r.grandTotal.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Link to={`/accounts/${r.id}`} className="text-blue-600 text-xs font-bold hover:underline">{t('الكشف')}</Link>
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && <tr><td colSpan={11} className="text-center py-10 text-gray-600">{t('لا توجد كشوفات مسجّلة في الفترة دي')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
