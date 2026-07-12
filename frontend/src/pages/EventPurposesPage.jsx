import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';

export default function EventPurposesPage() {
  const { t } = useLanguage();
  const [purposes, setPurposes] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');

  function load() {
    api.get('/event-purposes').then(({ data }) => setPurposes(data.data));
  }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/event-purposes', { name });
      setName('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ'));
    }
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEditingName(p.name);
  }

  async function saveEdit(id) {
    setError('');
    try {
      await api.put(`/event-purposes/${id}`, { name: editingName });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ أثناء التعديل'));
    }
  }

  async function handleDelete(p) {
    if (!window.confirm(`${t('متأكد إنك عايز تحذف غرض')} "${p.name}"؟`)) return;
    try {
      await api.delete(`/event-purposes/${p.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحذف'));
    }
  }

  return (
    <>
      <PageHeader title={t('الأغراض')} subtitle={t('زي: أرضيات، برودكشن، ديكور — تستخدمها لتصنيف حركات التكاليف اليومية في قسم الحسابات')} />
      <div className="p-7 max-w-2xl">
        <form onSubmit={handleAdd} className="flex gap-2 mb-5">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('اسم غرض جديد (مثال: برودكشن)')}
            className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 rounded-xl transition">{t('إضافة')}</button>
        </form>
        {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm mb-4">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {purposes.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3 group hover:border-gray-300 transition">
              {editingId === p.id ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(p.id)}
                    className="flex-1 border border-blue-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                  <button onClick={() => saveEdit(p.id)} className="text-emerald-600 text-xs font-bold px-2">{t('حفظ')}</button>
                  <button onClick={() => setEditingId(null)} className="text-gray-600 text-xs font-bold px-1">{t('إلغاء')}</button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-bold text-sm">{p.name}</span>
                  <button onClick={() => startEdit(p)} className="text-gray-600 hover:text-blue-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition px-1.5">{t('تعديل')}</button>
                  <button onClick={() => handleDelete(p)} className="text-gray-600 hover:text-rose-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition px-1.5">{t('حذف')}</button>
                </>
              )}
            </div>
          ))}
          {purposes.length === 0 && <div className="col-span-2 text-center py-10 text-gray-600 text-sm">{t('لا توجد أغراض بعد')}</div>}
        </div>
      </div>
    </>
  );
}
