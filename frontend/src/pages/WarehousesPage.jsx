import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';

const EMPTY_FORM = { name: '', location: '', responsible: '', notes: '' };

export default function WarehousesPage() {
  const { t } = useLanguage();
  const [warehouses, setWarehouses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  function load() {
    api.get('/warehouses').then(({ data }) => setWarehouses(data.data));
  }
  useEffect(load, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(w) {
    setEditingId(w.id);
    setForm({ name: w.name, location: w.location || '', responsible: w.responsible || '', notes: w.notes || '' });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/warehouses/${editingId}`, form);
      } else {
        await api.post('/warehouses', form);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ'));
    }
  }

  async function handleDelete(w) {
    if (!window.confirm(`${t('متأكد إنك عايز تحذف مخزن')} "${w.name}"؟`)) return;
    try {
      await api.delete(`/warehouses/${w.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحذف — قد يكون المخزن فيه أصناف مسجّلة عليه'));
    }
  }

  return (
    <>
      <PageHeader
        title={t('المخازن')}
        subtitle={`${warehouses.length} ${t('مخزن')}`}
        action={<button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">+ {t('مخزن جديد')}</button>}
      />
      <div className="p-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {warehouses.map((w) => (
          <div key={w.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm group hover:border-gray-300 transition">
            <div className="flex items-start justify-between">
              <div>
                <Link to={`/warehouses/${w.id}`} className="font-extrabold hover:text-blue-600 transition">{w.name}</Link>
                <div className="text-xs text-gray-600 mt-1">{w.location || '—'}</div>
                <div className="text-xs text-gray-600 mt-2">{t('المسؤول')}: {w.responsible || '—'}</div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => openEdit(w)} className="text-blue-600 text-xs font-bold hover:underline">{t('تعديل')}</button>
                <button onClick={() => handleDelete(w)} className="text-rose-600 text-xs font-bold hover:underline">{t('حذف')}</button>
              </div>
            </div>
          </div>
        ))}
        {warehouses.length === 0 && <div className="col-span-3 text-center py-10 text-gray-600 text-sm">{t('لا توجد مخازن بعد')}</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10 px-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5 shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg mb-2">{editingId ? t('تعديل بيانات المخزن') : t('مخزن جديد')}</h3>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}
            <input required placeholder={t('اسم المخزن')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder={t('الموقع')} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder={t('المسؤول')} value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition">{editingId ? t('حفظ التعديلات') : t('حفظ')}</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
