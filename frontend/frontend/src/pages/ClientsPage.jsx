import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', company: '' });
  const [error, setError] = useState('');

  function load() {
    api.get('/clients').then(({ data }) => setClients(data.data));
  }
  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/clients', form);
      setShowForm(false);
      setForm({ name: '', phone: '', company: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    }
  }

  return (
    <>
      <PageHeader
        title="العملاء"
        subtitle={`${clients.length} عميل`}
        action={<button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg">+ عميل جديد</button>}
      />
      <div className="p-7">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right px-4 py-3 font-bold">الاسم</th>
                <th className="text-right px-4 py-3 font-bold">الهاتف</th>
                <th className="text-right px-4 py-3 font-bold">الشركة</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-bold">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.phone || '—'}</td>
                  <td className="px-4 py-3">{c.company || '—'}</td>
                </tr>
              ))}
              {clients.length === 0 && <tr><td colSpan={3} className="text-center py-10 text-gray-400">لا يوجد عملاء بعد</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5">
            <h3 className="font-extrabold text-lg mb-2">عميل جديد</h3>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}
            <input required placeholder="اسم العميل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="رقم الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="اسم الشركة" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
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
