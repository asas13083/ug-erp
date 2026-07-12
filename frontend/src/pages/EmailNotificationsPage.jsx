import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';

const STATUS_LABELS = {
  PENDING: ['في الانتظار', 'bg-amber-50 text-amber-600'],
  SENT: ['تم الإرسال', 'bg-emerald-50 text-emerald-600'],
  FAILED: ['فشل الإرسال', 'bg-rose-50 text-rose-600'],
};

export default function EmailNotificationsPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('recipients');
  const [recipients, setRecipients] = useState([]);
  const [queue, setQueue] = useState([]);
  const [form, setForm] = useState({ name: '', email: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState('');
  const [sendMsg, setSendMsg] = useState('');

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
      setError(err.response?.data?.message || t('حدث خطأ'));
    }
  }

  async function sendTestReport(type) {
    setSending(type);
    setSendMsg('');
    try {
      const { data } = await api.post(`/email-reports/${type}`);
      setSendMsg(data.message);
      loadQueue();
      setTab('queue');
    } catch (err) {
      setSendMsg(err.response?.data?.message || t('تعذر الإرسال'));
    } finally {
      setSending('');
    }
  }

  async function cancelQueueItem(id) {
    if (!window.confirm(t('متأكد إنك عايز تلغي الرسالة دي قبل ما تتبعت؟'))) return;
    try {
      await api.delete(`/activity-log/email-queue/${id}`);
      loadQueue();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الإلغاء'));
    }
  }

  async function retryQueueItem(id) {
    try {
      await api.put(`/activity-log/email-queue/${id}`, { status: 'PENDING', attempts: 0 });
      loadQueue();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر إعادة المحاولة'));
    }
  }

  async function clearQueueByStatus(status) {
    const label = status === 'SENT' ? t('الناجحة') : t('الفاشلة');
    if (!window.confirm(`${t('متأكد إنك عايز تمسح كل الرسائل')} ${label} ${t('من الطابور؟')}`)) return;
    try {
      await api.delete('/activity-log/email-queue', { params: { status } });
      loadQueue();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر المسح'));
    }
  }

  async function toggleRecipient(r) {
    try {
      await api.put(`/email-recipients/${r.id}`, { isActive: !r.isActive });
      loadRecipients();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر التحديث'));
    }
  }

  return (
    <>
      <PageHeader
        title={t('إشعارات الإيميل')}
        subtitle={t('تقرير يومي وشهري شامل — مش إشعار لكل عملية صغيرة')}
        action={
          <div className="flex gap-2">
            <button onClick={() => sendTestReport('daily')} disabled={sending} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition disabled:opacity-60">
              {sending === 'daily' ? t('جاري الإرسال...') : t('أرسل تقرير اليوم الآن')}
            </button>
            <button onClick={() => sendTestReport('monthly')} disabled={sending} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition disabled:opacity-60">
              {sending === 'monthly' ? t('جاري الإرسال...') : t('أرسل تقرير الشهر الآن')}
            </button>
          </div>
        }
      />
      <div className="p-7">
        {sendMsg && <div className="text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 text-sm mb-4">{sendMsg}</div>}
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-5">
          {t('النظام بيبعت تلقائياً:')} <b>{t('تقرير يومي')}</b> {t('كل يوم الساعة 10 بالليل، و')}<b>{t('تقرير شهري')}</b> {t('في آخر يوم بالشهر — بدل إشعار لكل عملية صغيرة. النظام Offline-Safe: لو النت مقطوع وقت الإرسال، بيتسجل في الطابور ويتبعت أول ما يرجع الاتصال.')}
        </div>

        <div className="inline-flex bg-gray-100 rounded-xl p-1 mb-5 gap-1">
          <button onClick={() => setTab('recipients')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'recipients' ? 'bg-white shadow-sm' : 'text-gray-600'}`}>{t('المستقبِلون')}</button>
          <button onClick={() => setTab('queue')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'queue' ? 'bg-white shadow-sm' : 'text-gray-600'}`}>{t('طابور الإرسال')}</button>
        </div>

        {tab === 'recipients' && (
          <div className="max-w-2xl">
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-4">
              {t('كل التقارير بتتبعت لكل المستقبِلين "النشطين" مع بعض. لو عايز تبعت لشخص واحد بس مؤقتاً، دوس "إيقاف" لباقي الأسماء، وسيب اللي عايزه بس "نشط"، وبعد كده ارجع فعّلهم تاني.')}
            </div>
            <form onSubmit={handleAdd} className="flex gap-2 mb-5">
              <input required placeholder={t('الاسم')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white" />
              <input required type="email" placeholder={t('الإيميل')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white" />
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 rounded-xl">{t('إضافة')}</button>
            </form>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm mb-4">{error}</div>}

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-100">
              {recipients.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{r.name?.[0]}</div>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{r.name}</div>
                    <div className="text-xs text-gray-600">{r.email}</div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                    {r.isActive ? t('نشط') : t('موقوف')}
                  </span>
                  <button onClick={() => toggleRecipient(r)} className="text-xs font-bold text-blue-600 hover:underline">
                    {r.isActive ? t('إيقاف') : t('تفعيل')}
                  </button>
                </div>
              ))}
              {recipients.length === 0 && <div className="text-center py-10 text-gray-600 text-sm">{t('لا يوجد مستقبِلون بعد — أضف واحد فوق')}</div>}
            </div>
          </div>
        )}

        {tab === 'queue' && (
          <div>
            <div className="flex gap-2 mb-3">
              <button onClick={() => clearQueueByStatus('SENT')} className="border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:border-gray-300 transition">{t('مسح كل الرسائل الناجحة')}</button>
              <button onClick={() => clearQueueByStatus('FAILED')} className="border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:border-gray-300 transition">{t('مسح كل الرسائل الفاشلة')}</button>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs">
                  <th className="text-right px-4 py-3 font-bold">{t('الموضوع')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('المحاولات')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('سبب الفشل')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                  <th className="text-right px-4 py-3 font-bold w-20">{t('إجراءات')}</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((q) => {
                  const [label, cls] = STATUS_LABELS[q.status] || [q.status, ''];
                  return (
                    <tr key={q.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">{q.subject}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{t(label)}</span></td>
                      <td className="px-4 py-3">{q.attempts}</td>
                      <td className="px-4 py-3 text-xs text-rose-500 max-w-xs truncate" title={q.lastError || ''}>{q.lastError || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{new Date(q.createdAt).toLocaleString('ar-EG')}</td>
                      <td className="px-4 py-3">
                        {q.status === 'PENDING' && (
                          <button onClick={() => cancelQueueItem(q.id)} className="text-rose-600 text-xs font-bold hover:underline">{t('إلغاء')}</button>
                        )}
                        {q.status === 'FAILED' && (
                          <button onClick={() => retryQueueItem(q.id)} className="text-blue-600 text-xs font-bold hover:underline">{t('إعادة المحاولة')}</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {queue.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-600">{t('الطابور فاضي')}</td></tr>}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
