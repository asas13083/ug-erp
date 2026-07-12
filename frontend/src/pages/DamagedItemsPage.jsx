import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { useLanguage } from '../context/LanguageContext';

export default function DamagedItemsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [warehouses, setWarehouses] = useState([]);

  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const filters = { warehouseId: warehouseFilter || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

  useEffect(() => {
    api.get('/return-vouchers/damaged/list', { params: { page, pageSize: 20, ...filters } }).then(({ data }) => {
      setItems(data.data);
      setMeta(data.meta);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, warehouseFilter, dateFrom, dateTo]);
  useEffect(() => setPage(1), [warehouseFilter, dateFrom, dateTo]);
  useEffect(() => {
    api.get('/warehouses', { params: { pageSize: 200 } }).then(({ data }) => setWarehouses(data.data));
  }, []);

  function handlePdf() {
    const rows = items
      .map((i) => `<tr><td>${esc(i.item.name)}</td><td>${i.damagedQuantity}</td><td>${esc(i.voucher.event?.name || '—')}</td><td>${esc(i.voucher.warehouse?.name || '—')}</td><td>${new Date(i.voucher.createdAt).toLocaleDateString('ar-EG')}</td></tr>`)
      .join('');
    downloadPdf(
      'تقرير التالف',
      `<table><thead><tr><th>الصنف</th><th>الكمية</th><th>الحفلة</th><th>المخزن</th><th>التاريخ</th></tr></thead><tbody>${rows}</tbody></table>`,
      { filename: 'تقرير-التالف.pdf' }
    );
  }

  return (
    <>
      <PageHeader
        title={t('التالف')}
        subtitle={`${meta.total} ${t('سجل')} — ${t('أصناف رجعت تالفة من المرتجعات')}`}
        action={
          <div className="flex gap-2">
            <button onClick={handlePdf} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('تحميل PDF')}</button>
            <button onClick={() => downloadFile(`/reports/damaged.xlsx?${new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()}`, 'تقرير-التالف.xlsx')} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">{t('تصدير Excel (حسب الفلتر)')}</button>
          </div>
        }
      />
      <div className="p-7">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">{t('كل المخازن')}</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <span>{t('من')}</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
            <span>{t('إلى')}</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
          </div>
          {(warehouseFilter || dateFrom || dateTo) && (
            <button onClick={() => { setWarehouseFilter(''); setDateFrom(''); setDateTo(''); }} className="text-xs text-gray-600 hover:text-rose-600 font-bold">{t('مسح الفلتر')}</button>
          )}
        </div>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-5">
          {t('دي أصناف رجعت في المرتجع بحالة تالفة — يعني موجودة فعلياً في المخزن بس محتاجة صيانة أو مش صالحة للاستخدام العادي.')}
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('الصنف')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الكمية التالفة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('رقم الإذن')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحفلة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المخزن')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className={`border-t border-gray-100 ${i.voucher.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-bold">{i.item.name}</td>
                  <td className="px-4 py-3"><span className="bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">{i.damagedQuantity}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{i.voucher.number}</td>
                  <td className="px-4 py-3">{i.voucher.event?.name || '—'}</td>
                  <td className="px-4 py-3">{i.voucher.warehouse?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(i.voucher.createdAt).toLocaleDateString('ar-EG')}</td>
                  <td className="px-4 py-3">
                    {i.voucher.status === 'CANCELLED' ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{t('ملغى')}</span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">{t('فعّال')}</span>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-600">{t('لا توجد أصناف تالفة مسجّلة بعد')}</td></tr>}
            </tbody>
          </table>
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
        </div>
      </div>
    </>
  );
}
