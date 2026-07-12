import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';

const STATUS_LABELS = {
  PLANNED: ['مخطط لها', 'bg-blue-50 text-blue-600'],
  ONGOING: ['جارية الآن', 'bg-amber-50 text-amber-600'],
  RETURN_PENDING: ['بانتظار المرتجع', 'bg-orange-50 text-orange-600'],
  CLOSED: ['مغلقة', 'bg-emerald-50 text-emerald-600'],
  CANCELLED: ['ملغاة', 'bg-gray-100 text-gray-500'],
};

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', clientId: '', location: '', startDate: '', endDate: '' });
  const [error, setError] = useState('');

  function load() {
    api.get('/events').then(({ data }) => setEvents(data.data));
  }
  useEffect(() => {
    load();
    api.get('/clients').then(({ data }) => setClients(data.data));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/events', form);
      setShowForm(false);
      setForm({ name: '', clientId: '', location: '', startDate: '', endDate: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    }
  }

  return (
    <>
      <PageHeader
        title="الحفلات"
        subtitle={`${events.length} حفلة`}
        action={<button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg">+ حفلة جديدة</button>}
      />
      <div className="p-7">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right px-4 py-3 font-bold">الرقم</th>
                <th className="text-right px-4 py-3 font-bold">اسم الحفلة</th>
                <th className="text-right px-4 py-3 font-bold">العميل</th>
                <th className="text-right px-4 py-3 font-bold">التاريخ</th>
                <th className="text-right px-4 py-3 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const [label, cls] = STATUS_LABELS[ev.status] || ['—', ''];
                return (
                  <tr key={ev.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{ev.number}</td>
                    <td className="px-4 py-3 font-bold">{ev.name}</td>
                    <td className="px-4 py-3">{ev.client?.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(ev.startDate).toLocaleDateString('ar-EG')} → {new Date(ev.endDate).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{label}</span></td>
                  </tr>
                );
              })}
              {events.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">لا توجد حفلات</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5">
            <h3 className="font-extrabold text-lg mb-2">حفلة جديدة</h3>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}
            <input required placeholder="اسم الحفلة" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">اختر العميل</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input placeholder="المكان" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input required type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
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
