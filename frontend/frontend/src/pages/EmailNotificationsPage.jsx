import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';

const STATUS_LABELS = {
  PENDING: ['في الانتظار', 'bg-amber-50 text-amber-600'],
  SENT: ['تم الإرسال', 'bg-emerald-50 text-emerald-600'],
  FAILED: ['فشل الإرسال', 'bg-rose-50 text-rose-600'],
};

export default function EmailNotificationsPage() {
  const [tab, setTab] = useState('recipients');
  const [recipients, setRecipients] = useState([]);
  const [queue, setQueue] = useState([]);
  const [form, setForm] = useState({ name: '', email: '' });
  const [error, setError] = useState('');

  function loadRecipients() {
    api.get('/email-recipients').then(({ data }) => setRecipients(data.data));
  }
  function loadQueue() {
    api.get('/activity-log/email-queue').then(({ data }) => setQueue(data.data));
  }

  useEffect(() => {
    loadRecipients();
    loadQueue();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/email-recipients', form);
      setForm({ name: '', email: '' });
      loadRecipients();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    }
  }

  return (
    <>
      <PageHeader title="إشعارات الإيميل" subtitle="إدارة المستقبِلين ومتابعة طابور الإرسال" />
      <div className="p-7">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-5">
          النظام Offline-Safe: لو حصلت عملية والنت مقطوع، الإيميل يتسجل في الطابور ويتبعت تلقائياً بمجرد رجوع الاتصال.
        </div>

        <div className="inline-flex bg-gray-100 rounded-xl p-1 mb-5 gap-1">
          <button onClick={() => setTab('recipients')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'recipients' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>المستقبِلون</button>
          <button onClick={() => setTab('queue')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'queue' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>طابور الإرسال</button>
        </div>

        {tab === 'recipients' && (
          <div className="max-w-2xl">
            <form onSubmit={handleAdd} className="flex gap-2 mb-5">
              <input required placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white" />
              <input required type="email" placeholder="الإيميل" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white" />
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 rounded-xl">إضافة</button>
            </form>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm mb-4">{error}</div>}

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-100">
              {recipients.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{r.name?.[0]}</div>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{r.name}</div>
                    <div className="text-xs text-gray-400">{r.email}</div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    {r.isActive ? 'نشط' : 'موقوف'}
                  </span>
                </div>
              ))}
              {recipients.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">لا يوجد مستقبِلون بعد — أضف واحد فوق</div>}
            </div>
          </div>
        )}

        {tab === 'queue' && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-right px-4 py-3 font-bold">الموضوع</th>
                  <th className="text-right px-4 py-3 font-bold">الحالة</th>
                  <th className="text-right px-4 py-3 font-bold">المحاولات</th>
                  <th className="text-right px-4 py-3 font-bold">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((q) => {
                  const [label, cls] = STATUS_LABELS[q.status] || [q.status, ''];
                  return (
                    <tr key={q.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">{q.subject}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{label}</span></td>
                      <td className="px-4 py-3">{q.attempts}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(q.createdAt).toLocaleString('ar-EG')}</td>
                    </tr>
                  );
                })}
                {queue.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-gray-400">الطابور فاضي</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
