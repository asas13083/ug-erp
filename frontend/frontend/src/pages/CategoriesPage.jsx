import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
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
      setError(err.response?.data?.message || 'حدث خطأ');
    }
  }

  return (
    <>
      <PageHeader title="التصنيفات" subtitle={`${categories.length} تصنيف`} />
      <div className="p-7 max-w-2xl">
        <form onSubmit={handleAdd} className="flex gap-2 mb-5">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم تصنيف جديد (مثال: تراسات)"
            className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white"
          />
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 rounded-xl">إضافة</button>
        </form>
        {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm mb-4">{error}</div>}

        <div className="grid grid-cols-3 gap-3">
          {categories.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 text-center font-bold shadow-sm">
              {c.name}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
