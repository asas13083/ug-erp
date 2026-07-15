import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import VehiclesInput from '../components/VehiclesInput';
import { useLanguage } from '../context/LanguageContext';

export default function CustodyTransferPage() {
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);
  const [toEvents, setToEvents] = useState([]);
  const [fromEventId, setFromEventId] = useState('');
  const [toEventId, setToEventId] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [notes, setNotes] = useState('');
  const [users, setUsers] = useState([]);
  const [handedByUserId, setHandedByUserId] = useState('');
  const [receivedByUserId, setReceivedByUserId] = useState('');
  const [pendingItems, setPendingItems] = useState([]);
  const [lines, setLines] = useState({});
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/events', { params: { status: 'ONGOING', pageSize: 200 } }).then(({ data }) => setEvents(data.data));
    // قايمة "الحفلة المستقبِلة" منفصلة ومش مقيّدة بحفلات المستخدم — عشان
    // يقدر ينقل عهدة لحفلة مش معيّن عليها شخصياً
    api.get('/events/list-for-custody-transfer').then(({ data }) => setToEvents(data.data));
    api.get('/auth/users/handover-list').then(({ data }) => setUsers(data.data));
  }, []);

  useEffect(() => {
    if (!fromEventId) {
      setPendingItems([]);
      return;
    }
    setLoadingItems(true);
    api
      .get(`/events/${fromEventId}`)
      .then(({ data }) => {
        const stillOut = data.data.itemsSummary.filter((s) => s.pending > 0);
        setPendingItems(stillOut);
        const init = {};
        stillOut.forEach((s) => { init[s.itemId] = 0; });
        setLines(init);
      })
      .finally(() => setLoadingItems(false));
  }, [fromEventId]);

  function updateLine(itemId, value) {
    setLines((prev) => ({ ...prev, [itemId]: Number(value) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (fromEventId === toEventId) {
      setError(t('لازم تكون الحفلة المصدر مختلفة عن الحفلة الهدف'));
      return;
    }
    setSubmitting(true);
    try {
      const items = pendingItems.filter((s) => lines[s.itemId] > 0).map((s) => ({ itemId: s.itemId, quantity: lines[s.itemId] }));
      if (items.length === 0) {
        setError(t('لازم تحدد كمية صنف واحد على الأقل عايز تنقله'));
        setSubmitting(false);
        return;
      }
      const { data } = await api.post('/custody-transfers', { fromEventId, toEventId, receiverName, handedByUserId: handedByUserId || undefined, receivedByUserId: receivedByUserId || undefined, vehicles, notes, items });
      setSuccess(`${t('تم نقل العهدة بنجاح — رقم العملية:')} ${data.data.number}`);
      setFromEventId('');
      setToEventId('');
      setReceiverName('');
      setVehicles([]);
      setNotes('');
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ أثناء نقل العهدة'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title={t('نقل عهدة بين الحفلات')} subtitle={t('نقل أصناف لسه برا من حفلة مباشرة لحفلة تانية شغالة، من غير ما ترجع المخزن')} />
      <div className="p-7 max-w-3xl">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-5">
          {t('الكميات اللي هتشوفها هي بس اللي "لسه برا فعلياً" من الحفلة المصدر (بعد خصم أي مرتجع أو نقل سابق). أول ما تنقلها، هتتحسب "خارجة" على الحفلة الهدف كمان.')}
        </div>
        {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}
        {success && <div className="text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 text-sm mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('من حفلة')}</label>
              <select required value={fromEventId} onChange={(e) => setFromEventId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('اختر الحفلة المصدر')}</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.number} — {ev.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('إلى حفلة')}</label>
              <select required value={toEventId} onChange={(e) => setToEventId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('اختر الحفلة الهدف')}</option>
                {toEvents.filter((ev) => ev.id !== fromEventId).map((ev) => <option key={ev.id} value={ev.id}>{ev.number} — {ev.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">{t('اسم المسؤول المستلم في الحفلة التانية')}</label>
            <input required value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('اسم الأوبريشن أو المسؤول هناك')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('المُسلّم (اختياري)')}</label>
              <select value={handedByUserId} onChange={(e) => setHandedByUserId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('بدون تحديد')}</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('المُستلم من الأوبريشن (اختياري)')}</label>
              <select value={receivedByUserId} onChange={(e) => setReceivedByUserId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('بدون تحديد')}</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
          </div>
          <div className="text-[11px] text-gray-600 -mt-2">{t('استخدمهم لو النقل بين أوبريشن وأوبريشن تاني، عشان تحدد مين سلّم لمين بالظبط')}</div>

          <VehiclesInput value={vehicles} onChange={setVehicles} />

          {loadingItems && <div className="text-xs text-gray-600">{t('جاري تحميل الأصناف اللي لسه برا...')}</div>}

          {fromEventId && !loadingItems && pendingItems.length === 0 && (
            <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3">✓ {t('مفيش أي كمية لسه برا من الحفلة دي تقدر تنقلها.')}</div>
          )}

          {pendingItems.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-extrabold">{t('الأصناف اللي لسه برا')}</div>
              {pendingItems.map((s) => (
                <div key={s.itemId} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <div className="flex-1 text-sm font-bold">
                    {s.itemName} <span className="text-gray-600 font-normal">({t('لسه برا')} {s.pending})</span>
                    {s.sources?.length > 0 && (
                      <div className="text-[11px] text-gray-500 font-normal mt-0.5">
                        {t('المصدر')}: {s.sources.map((src) => `${src.type === 'warehouse' ? t('من مخزن') : t('نقل عهدة من حفلة')} ${src.name} ×${src.quantity}`).join('، ')}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600">{t('الكمية المنقولة')}</label>
                    <input type="number" min={0} max={s.pending} value={lines[s.itemId] ?? 0} onChange={(e) => updateLine(s.itemId, e.target.value)} className="w-24 border border-gray-200 rounded px-2 py-1 text-sm" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('ملاحظات (اختياري)')} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />

          <button type="submit" disabled={submitting || pendingItems.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl">
            {submitting ? t('جاري النقل...') : t('تأكيد نقل العهدة')}
          </button>
        </form>
      </div>
    </>
  );
}
