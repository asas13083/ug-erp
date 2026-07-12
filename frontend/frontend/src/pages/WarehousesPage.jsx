import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', responsible: '', notes: '' });
  const [error, setError] = useState('');

  function load() {
    api.get('/warehouses').then(({ data }) => setWarehouses(data.data));
  }
  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/warehouses', form);
      setShowForm(false);
      setForm({ name: '', location: '', responsible: '', notes: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    }
  }

  return (
    <>
      <PageHeader
        title="المخازن"
        subtitle={`${warehouses.length} مخزن`}
        action={<button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg">+ مخزن جديد</button>}
      />
      <div className="p-7 grid grid-cols-3 gap-4">
        {warehouses.map((w) => (
          <div key={w.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="font-extrabold">{w.name}</div>
            <div className="text-xs text-gray-500 mt-1">{w.location || '—'}</div>
            <div className="text-xs text-gray-400 mt-2">المسؤول: {w.responsible || '—'}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5">
            <h3 className="font-extrabold text-lg mb-2">مخزن جديد</h3>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}
            <input required placeholder="اسم المخزن" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="الموقع" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="المسؤول" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
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
