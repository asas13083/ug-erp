import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { getAssetUrl } from '../utils/assetUrl';
import { useLanguage } from '../context/LanguageContext';

export default function ItemDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get(`/items/${id}/detail`)
      .then(({ data }) => setData(data.data))
      .catch((err) => setError(err.response?.data?.message || t('تعذر تحميل بيانات الصنف')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-center text-gray-600">{t('جاري التحميل...')}</div>;
  if (error) return <div className="p-10 text-center text-rose-600">{error}</div>;
  if (!data) return null;

  const { item, currentTotal, totalStillOut, totalLost, eventsDistributedCount, stillOutSources, warehouses } = data;

  return (
    <>
      <PageHeader
        title={item.name}
        subtitle={`${item.code} · ${item.category?.name || ''}`}
        action={<Link to="/items" className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('كل الأصناف')}</Link>}
      />
      <div className="p-7">
        <div className="flex items-center gap-4 mb-6">
          {item.imageUrl && <img src={getAssetUrl(item.imageUrl)} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-100" />}
          <div>
            <div className="text-xs text-gray-600">{t('الوحدة')}: {item.unit} · {t('الحد الأدنى')}: {item.minQuantity}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-blue-600">{currentTotal}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('الكمية الحالية الكلية')}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-amber-600">{totalStillOut}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('لسه برا (كل الحفلات)')}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-rose-600">{totalLost}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('إجمالي الفاقد')}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-purple-600">{eventsDistributedCount}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('موزّع على كام حفلة دلوقتي')}</div>
          </div>
        </div>

        {stillOutSources?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-6">
            <div className="font-extrabold text-sm mb-3">{t('مصدر الكمية اللي لسه برا')}</div>
            <div className="space-y-1.5">
              {stillOutSources.map((src, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{src.type === 'warehouse' ? t('من مخزن') : t('نقل عهدة من حفلة')} {src.name}</span>
                  <span className="font-bold text-amber-600">×{src.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm">{t('تفصيل كل مخزن')}</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('المخزن')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الرصيد الحالي')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('دخل')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('خرج')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('فاقد')}</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((w) => (
                <tr key={w.warehouseId} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-bold">
                    <Link to={`/warehouses/${w.warehouseId}`} className="hover:text-blue-600 transition">{w.warehouseName}</Link>
                  </td>
                  <td className="px-4 py-3 font-extrabold">{w.current}</td>
                  <td className="px-4 py-3 text-emerald-600">{w.in}</td>
                  <td className="px-4 py-3 text-blue-600">{w.out}</td>
                  <td className="px-4 py-3 text-rose-600">{w.lost}</td>
                </tr>
              ))}
              {warehouses.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-600">{t('الصنف ده مش موجود في أي مخزن بعد')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
