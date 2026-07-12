import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { useLanguage } from '../context/LanguageContext';

export default function CategoryDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const [category, setCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/categories/${id}`).then(({ data }) => setCategory(data.data)),
      api.get('/items', { params: { categoryId: id } }).then(({ data }) => setItems(data.data)),
    ])
      .catch((err) => setError(err.response?.data?.message || t('تعذر تحميل بيانات التصنيف')))
      .finally(() => setLoading(false));
  }, [id]);

  function handlePdf() {
    const rows = items
      .map((i) => `<tr><td>${esc(i.code)}</td><td>${esc(i.name)}</td><td>${esc(i.unit)}</td><td>${i.totalQuantity}</td><td>${i.minQuantity}</td></tr>`)
      .join('');
    downloadPdf(
      `أصناف تصنيف ${esc(category?.name || '')}`,
      `<table><thead><tr><th>الكود</th><th>الصنف</th><th>الوحدة</th><th>الكمية الكلية</th><th>الحد الأدنى</th></tr></thead><tbody>${rows}</tbody></table>`,
      { filename: `تصنيف-${category?.name || 'تقرير'}.pdf` }
    );
  }

  if (loading) return <div className="p-10 text-center text-gray-600">{t('جاري تحميل بيانات التصنيف...')}</div>;
  if (error) return <div className="p-10 text-center text-rose-600">{error}</div>;
  if (!category) return <div className="p-10 text-center text-gray-600">{t('التصنيف غير موجود')}</div>;

  return (
    <>
      <PageHeader
        title={category.name}
        subtitle={`${items.length} ${t('صنف تحت هذا التصنيف')}`}
        action={
          <div className="flex gap-2">
            <Link to="/categories" className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('كل التصنيفات')}</Link>
            <button onClick={handlePdf} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('تحميل PDF')}</button>
            <button onClick={() => downloadFile(`/reports/category/${id}.xlsx`, `تصنيف-${category.name}.xlsx`)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">{t('تصدير Excel')}</button>
          </div>
        }
      />
      <div className="p-7">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('الكود')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الصنف')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الوحدة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الكمية الكلية')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحد الأدنى')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('أماكن التخزين')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{i.code}</td>
                  <td className="px-4 py-3 font-bold">{i.name}</td>
                  <td className="px-4 py-3">{i.unit}</td>
                  <td className="px-4 py-3 font-extrabold">{i.totalQuantity}</td>
                  <td className="px-4 py-3">{i.minQuantity}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {i.stockLevels?.filter((s) => s.quantity > 0).map((s) => `${s.warehouse?.name} (${s.quantity})`).join('، ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {i.totalQuantity <= i.minQuantity ? (
                      <span className="bg-rose-50 text-rose-600 text-xs font-bold px-2.5 py-1 rounded-full">{t('منخفض')}</span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-full">{t('متوفر')}</span>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-600">{t('لا توجد أصناف تحت هذا التصنيف بعد')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
