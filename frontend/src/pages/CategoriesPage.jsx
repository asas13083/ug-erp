import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';

export default function CategoriesPage() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');

  function load() {
    api.get('/categories').then(({ data }) => setCategories(data.data));
  }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/categories', { name });
      setName('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ'));
    }
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditingName(cat.name);
  }

  async function saveEdit(id) {
    setError('');
    try {
      await api.put(`/categories/${id}`, { name: editingName });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ أثناء التعديل'));
    }
  }

  async function handleDelete(cat) {
    if (!window.confirm(`${t('متأكد إنك عايز تحذف تصنيف')} "${cat.name}"؟`)) return;
    try {
      await api.delete(`/categories/${cat.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحذف — قد يكون التصنيف مرتبط بأصناف موجودة'));
    }
  }

  return (
    <>
      <PageHeader title={t('التصنيفات')} subtitle={`${categories.length} ${t('تصنيف')}`} />
      <div className="p-7 max-w-2xl">
        <form onSubmit={handleAdd} className="flex gap-2 mb-5">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('اسم تصنيف جديد (مثال: تراسات)')}
            className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 rounded-xl transition">{t('إضافة')}</button>
        </form>
        {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm mb-4">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3 group hover:border-gray-300 transition">
              {editingId === c.id ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(c.id)}
                    className="flex-1 border border-blue-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                  <button onClick={() => saveEdit(c.id)} className="text-emerald-600 text-xs font-bold px-2">{t('حفظ')}</button>
                  <button onClick={() => setEditingId(null)} className="text-gray-600 text-xs font-bold px-1">{t('إلغاء')}</button>
                </>
              ) : (
                <>
                  <Link to={`/categories/${c.id}`} className="flex-1 font-bold text-sm hover:text-blue-600 transition">{c.name}</Link>
                  <button onClick={() => startEdit(c)} className="text-gray-600 hover:text-blue-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition px-1.5" title={t('تعديل')}>
                    {t('تعديل')}
                  </button>
                  <button onClick={() => handleDelete(c)} className="text-gray-600 hover:text-rose-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition px-1.5" title={t('حذف')}>
                    {t('حذف')}
                  </button>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && <div className="col-span-2 text-center py-10 text-gray-600 text-sm">{t('لا توجد تصنيفات بعد')}</div>}
        </div>
      </div>
    </>
  );
}
