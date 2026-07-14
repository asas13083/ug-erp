import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { getAssetUrl } from '../utils/assetUrl';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

/**
 * صفحة واردات الموردين — لأمين المخزن.
 * بتوريه إيه اللي جه من الموردين، من مين، لأي حفلة — من غير أي بيانات مالية
 * خالص (لا سعر ولا إجمالي ولا مدفوع). ولو حب يضيف الصنف للمخزن، بيدوس زرار.
 */
export default function SupplierDeliveriesPage() {
  const { t, lang } = useLanguage();
  const { can } = useAuth();
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';

  const [deliveries, setDeliveries] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending'); // pending | added | all

  const [addingLine, setAddingLine] = useState(null);
  const [addForm, setAddForm] = useState({ warehouseId: '', mode: 'new', itemId: '', categoryId: '', unit: '' });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    const params = filter === 'all' ? {} : { status: filter };
    api.get('/supplier-deliveries', { params })
      .then(({ data }) => setDeliveries(data.data))
      .catch((err) => setError(err.response?.data?.message || t('حصل خطأ')))
      .finally(() => setLoading(false));
  }
  useEffect(load, [filter]);

  useEffect(() => {
    api.get('/warehouses').then(({ data }) => setWarehouses(data.data)).catch(() => {});
    api.get('/items').then(({ data }) => setItems(data.data)).catch(() => {});
    api.get('/categories').then(({ data }) => setCategories(data.data)).catch(() => {});
  }, []);

  function openAddForm(line) {
    setAddingLine(line);
    // بنحاول نلاقي صنف موجود بنفس الاسم — لو لقيناه، بنقترحه تلقائي
    const match = items.find((i) => i.name.trim() === line.itemName.trim());
    setAddForm({
      warehouseId: warehouses[0]?.id || '',
      mode: match ? 'existing' : 'new',
      itemId: match?.id || '',
      categoryId: '',
      unit: line.unit || 'قطعة',
    });
  }

  async function submitAdd(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post(`/supplier-deliveries/${addingLine.id}/add-to-warehouse`, {
        warehouseId: addForm.warehouseId,
        itemId: addForm.mode === 'existing' ? addForm.itemId : undefined,
        categoryId: addForm.mode === 'new' ? addForm.categoryId : undefined,
        unit: addForm.unit,
      });
      setAddingLine(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('حصل خطأ'));
    } finally {
      setSubmitting(false);
    }
  }

  const pendingCount = deliveries.filter((d) => !d.addedToWarehouseId).length;

  return (
    <>
      <PageHeader
        title={t('واردات الموردين')}
        subtitle={t('الأصناف اللي جت من الموردين — إيه جه، من مين، لأي حفلة')}
      />

      <div className="p-7 space-y-5">
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

        {filter === 'pending' && pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            {t('فيه')} <b>{pendingCount}</b> {t('صنف جه من موردين ولسه ماتضافش للمخزن')}
          </div>
        )}

        {/* فلتر */}
        <div className="flex gap-2">
          {[
            { key: 'pending', label: t('لسه ماتضافش') },
            { key: 'added', label: t('اتضاف للمخزن') },
            { key: 'all', label: t('الكل') },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs font-bold px-3.5 py-2 rounded-lg transition border ${
                filter === f.key ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('الصنف')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الكمية')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المورد')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحفلة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الفاتورة')}</th>
                <th className="text-right px-4 py-3 font-bold w-32">{t('الحالة')}</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-bold">{d.itemName}</td>
                  <td className="px-4 py-3">{d.count} <span className="text-xs text-gray-500">{d.unit}</span></td>
                  <td className="px-4 py-3 text-gray-700">{d.supplier.name}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold">{d.event.name}</div>
                    <div className="text-[10px] text-gray-500">{d.event.number}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{new Date(d.invoiceDate).toLocaleDateString(locale)}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-600">{d.invoiceDescription}</div>
                    {d.invoiceImageUrl && (
                      <a href={getAssetUrl(d.invoiceImageUrl)} target="_blank" rel="noreferrer" className="inline-block mt-1">
                        <img src={getAssetUrl(d.invoiceImageUrl)} alt="" className="w-9 h-9 rounded object-cover border border-gray-200 hover:opacity-80 transition" />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {d.addedToWarehouseId ? (
                      <span className="text-emerald-600 text-xs font-bold">✓ {t('اتضاف')}</span>
                    ) : can('items', 'create') ? (
                      <button onClick={() => openAddForm(d)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">
                        {t('أضف للمخزن')}
                      </button>
                    ) : (
                      <span className="text-amber-600 text-xs font-bold">{t('لسه')}</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && deliveries.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-500 text-sm">{t('مفيش واردات')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ نافذة الإضافة للمخزن ============ */}
      {addingLine && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={submitAdd} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5 shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg">{t('إضافة للمخزن')}</h3>

            <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm">
              <div className="font-bold">{addingLine.itemName}</div>
              <div className="text-xs text-gray-600 mt-0.5">
                {addingLine.count} {addingLine.unit} · {t('من')} {addingLine.supplier.name} · {addingLine.event.name}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('المخزن')}</label>
              <select required value={addForm.warehouseId} onChange={(e) => setAddForm({ ...addForm, warehouseId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('اختر المخزن')}</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 text-gray-600">{t('الصنف ده')}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddForm({ ...addForm, mode: 'existing' })}
                  className={`flex-1 text-xs font-bold py-2 rounded-lg border transition ${addForm.mode === 'existing' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200'}`}
                >
                  {t('موجود عندي بالفعل')}
                </button>
                <button
                  type="button"
                  onClick={() => setAddForm({ ...addForm, mode: 'new' })}
                  className={`flex-1 text-xs font-bold py-2 rounded-lg border transition ${addForm.mode === 'new' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200'}`}
                >
                  {t('صنف جديد')}
                </button>
              </div>
            </div>

            {addForm.mode === 'existing' ? (
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">{t('اختر الصنف')}</label>
                <select required value={addForm.itemId} onChange={(e) => setAddForm({ ...addForm, itemId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">{t('اختر الصنف')}</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">{t('التصنيف')}</label>
                  <select required value={addForm.categoryId} onChange={(e) => setAddForm({ ...addForm, categoryId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">{t('اختر التصنيف')}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">{t('وحدة القياس')}</label>
                  <input value={addForm.unit} onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="text-[11px] text-gray-500 bg-blue-50 rounded-lg px-3 py-2">
                  {t('لو فيه صنف بنفس الاسم والتصنيف موجود، الكمية هتتضاف عليه بدل ما يتكرر')}
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition">
                {submitting ? t('جاري الحفظ...') : t('أضف للمخزن')}
              </button>
              <button type="button" onClick={() => setAddingLine(null)} className="flex-1 border border-gray-200 hover:border-gray-300 font-bold py-2.5 rounded-xl text-sm transition">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
