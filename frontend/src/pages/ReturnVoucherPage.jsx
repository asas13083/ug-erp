import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import VehiclesInput from '../components/VehiclesInput';
import { useLanguage } from '../context/LanguageContext';

export default function ReturnVoucherPage() {
  const { t } = useLanguage();
  const [events, setEvents] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [eventId, setEventId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [pendingItems, setPendingItems] = useState([]);
  const [lines, setLines] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [handedByUserId, setHandedByUserId] = useState('');
  const [receivedByUserId, setReceivedByUserId] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/events', { params: { status: 'ONGOING' } }).then(({ data }) => setEvents(data.data));
    api.get('/warehouses').then(({ data }) => setWarehouses(data.data));
    api.get('/auth/users/handover-list').then(({ data }) => setUsers(data.data));
  }, []);

  useEffect(() => {
    if (!eventId) {
      setPendingItems([]);
      return;
    }
    setLoadingItems(true);
    api
      .get(`/events/${eventId}`)
      .then(({ data }) => {
        const stillOut = data.data.itemsSummary.filter((s) => s.pending > 0);
        setPendingItems(stillOut);
        const initLines = {};
        stillOut.forEach((s) => { initLines[s.itemId] = { returnedQuantity: s.pending, damagedQuantity: 0, lostQuantity: 0 }; });
        setLines(initLines);
      })
      .finally(() => setLoadingItems(false));
  }, [eventId]);

  function updateLine(itemId, field, value) {
    setLines((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: Number(value) } }));
  }

  // حذف صنف من القائمة خالص — يعني "مش عايز أرجعه دلوقتي أصلاً"، مش مجرد
  // كمية صفر. لو غيّرت رأيك، اختار نفس الحفلة تاني من فوق وهو هيرجع يظهر
  function removeItem(itemId) {
    setPendingItems((prev) => prev.filter((s) => s.itemId !== itemId));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      // مهم جداً: بنبعت issuedQuantity = سليم + تالف + فاقد (اللي بيتعامل معاه
      // فعلياً دلوقتي بس)، مش كل "لسه برا" — عشان أي كمية متذكرتش صراحة
      // تفضل "لسه معلّقة"، مش تتحول فاقد تلقائي من غير ما تقصد
      const items = pendingItems.map((s) => {
        const returned = lines[s.itemId]?.returnedQuantity ?? 0;
        const damaged = lines[s.itemId]?.damagedQuantity ?? 0;
        const lost = lines[s.itemId]?.lostQuantity ?? 0;
        return {
          itemId: s.itemId,
          issuedQuantity: returned + damaged + lost,
          returnedQuantity: returned,
          damagedQuantity: damaged,
        };
      });
      const { data } = await api.post('/return-vouchers', { eventId, warehouseId, vehicles, handedByUserId: handedByUserId || undefined, receivedByUserId: receivedByUserId || undefined, items });
      setSuccess(`${t('تم تسجيل المرتجع بنجاح — رقم الإذن:')} ${data.data.number}`);
      setEventId('');
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ أثناء الحفظ'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title={t('إذن مرتجع')} subtitle={t('استلام الأصناف بعد انتهاء الحفلة')} />
      <div className="p-7 max-w-3xl">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-5">
          {t('الكميات اللي هتشوفها هنا هي بس اللي "لسه برا فعلياً" (بعد خصم أي مرتجع سابق اتعمل لنفس الحفلة) — مش إجمالي الصرف من الأول.')}
        </div>
        {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}
        {success && <div className="text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 text-sm mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('الحفلة (بانتظار المرتجع)')}</label>
              <select required value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('اختر الحفلة')}</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.number} — {ev.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('المخزن المستلم')}</label>
              <select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('اختر المخزن')}</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
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

          <VehiclesInput value={vehicles} onChange={setVehicles} />

          {loadingItems && <div className="text-xs text-gray-600">{t('جاري تحميل الأصناف اللي لسه برا...')}</div>}

          {eventId && !loadingItems && pendingItems.length === 0 && (
            <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3">
              ✓ {t('الحفلة دي مفيهاش أي كمية لسه برا — كل اللي خرج منها رجع أو اتسجل بالفعل.')}
            </div>
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
                    <label className="block text-[10px] text-gray-600">{t('سليم')} ({t('من أصل')} {s.pending})</label>
                    <input type="number" min={0} max={s.pending} value={lines[s.itemId]?.returnedQuantity ?? 0} onChange={(e) => updateLine(s.itemId, 'returnedQuantity', e.target.value)} className="w-24 border border-gray-200 rounded px-2 py-1 text-sm font-bold text-center" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600">{t('تالف')}</label>
                    <input type="number" min={0} value={lines[s.itemId]?.damagedQuantity ?? 0} onChange={(e) => updateLine(s.itemId, 'damagedQuantity', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-600">{t('فاقد فعلي (اختياري)')}</label>
                    <input type="number" min={0} value={lines[s.itemId]?.lostQuantity ?? 0} onChange={(e) => updateLine(s.itemId, 'lostQuantity', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1 text-sm" />
                  </div>
                  <div className="text-xs text-blue-600 w-28 text-left">
                    {t('هيفضل معلّق')}: {Math.max(s.pending - (lines[s.itemId]?.returnedQuantity ?? 0) - (lines[s.itemId]?.damagedQuantity ?? 0) - (lines[s.itemId]?.lostQuantity ?? 0), 0)}
                  </div>
                  <button type="button" onClick={() => removeItem(s.itemId)} title={t('مش عايز أرجع الصنف ده دلوقتي')} className="text-rose-500 hover:text-rose-700 text-lg font-bold px-1 flex-shrink-0">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button type="submit" disabled={submitting || pendingItems.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl">
            {submitting ? t('جاري الحفظ...') : t('تأكيد المرتجع')}
          </button>
        </form>
      </div>
    </>
  );
}
