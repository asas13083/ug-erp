import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', categoryId: '', unit: 'قطعة', minQuantity: 0, initialWarehouseId: '', initialQuantity: 0 });
  const [error, setError] = useState('');

  async function loadItems() {
    const { data } = await api.get('/items', { params: { q } });
    setItems(data.data);
  }

  useEffect(() => {
    loadItems();
    api.get('/categories').then(({ data }) => setCategories(data.data));
    api.get('/warehouses').then(({ data }) => setWarehouses(data.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(loadItems, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/items', form);
      setShowForm(false);
      setForm({ name: '', categoryId: '', unit: 'قطعة', minQuantity: 0, initialWarehouseId: '', initialQuantity: 0 });
      loadItems();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الإضافة');
    }
  }

  return (
    <>
      <PageHeader
        title="الأصناف"
        subtitle={`${items.length} صنف`}
        action={
          <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg">
            + صنف جديد
          </button>
        }
      />
      <div className="p-7">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالاسم أو الكود..."
          className="w-72 mb-4 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
        />

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right px-4 py-3 font-bold">الكود</th>
                <th className="text-right px-4 py-3 font-bold">الصنف</th>
                <th className="text-right px-4 py-3 font-bold">التصنيف</th>
                <th className="text-right px-4 py-3 font-bold">الكمية الكلية</th>
                <th className="text-right px-4 py-3 font-bold">المتاح فعلياً</th>
                <th className="text-right px-4 py-3 font-bold">الحد الأدنى</th>
                <th className="text-right px-4 py-3 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{i.code}</td>
                  <td className="px-4 py-3 font-bold">{i.name}</td>
                  <td className="px-4 py-3">{i.category?.name}</td>
                  <td className="px-4 py-3 font-extrabold">{i.totalQuantity} <span className="text-gray-400 text-xs font-normal">{i.unit}</span></td>
                  <td className="px-4 py-3">{i.availableQuantity}</td>
                  <td className="px-4 py-3">{i.minQuantity}</td>
                  <td className="px-4 py-3">
                    {i.totalQuantity <= i.minQuantity ? (
                      <span className="bg-rose-50 text-rose-600 text-xs font-bold px-2.5 py-1 rounded-full">منخفض</span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-full">متوفر</span>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">لا توجد أصناف مطابقة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5">
            <h3 className="font-extrabold text-lg mb-2">إضافة صنف جديد</h3>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">اسم الصنف</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">التصنيف</label>
                <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">اختر تصنيف</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">الوحدة</label>
                <input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">الحد الأدنى للتنبيه</label>
              <input type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">المخزن (اختياري)</label>
                <select value={form.initialWarehouseId} onChange={(e) => setForm({ ...form, initialWarehouseId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">بدون كمية ابتدائية</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">الكمية الابتدائية</label>
                <input type="number" value={form.initialQuantity} onChange={(e) => setForm({ ...form, initialQuantity: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm">حفظ</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
