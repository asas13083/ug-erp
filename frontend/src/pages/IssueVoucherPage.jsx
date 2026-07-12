import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import ItemPicker from '../components/ItemPicker';
import VehiclesInput from '../components/VehiclesInput';
import { useLanguage } from '../context/LanguageContext';

export default function IssueVoucherPage() {
  const { t } = useLanguage();
  const [warehouses, setWarehouses] = useState([]);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouseItems, setWarehouseItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [eventId, setEventId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [users, setUsers] = useState([]);
  const [handedByUserId, setHandedByUserId] = useState('');
  const [receivedByUserId, setReceivedByUserId] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [lines, setLines] = useState([{ itemId: '', quantity: 1 }]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/warehouses', { params: { pageSize: 200 } }).then(({ data }) => setWarehouses(data.data));
    api.get('/events', { params: { status: 'PLANNED,ONGOING' } }).then(({ data }) => setEvents(data.data));
    api.get('/categories', { params: { pageSize: 200 } }).then(({ data }) => setCategories(data.data));
    api.get('/auth/users/handover-list').then(({ data }) => setUsers(data.data));
  }, []);

  useEffect(() => {
    if (!warehouseId) {
      setWarehouseItems([]);
      return;
    }
    setLoadingItems(true);
    api
      .get(`/warehouses/${warehouseId}/stock`)
      .then(({ data }) => setWarehouseItems(data.data))
      .finally(() => setLoadingItems(false));
    setLines([{ itemId: '', quantity: 1 }]);
  }, [warehouseId]);

  function updateLine(idx, field, value) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { itemId: '', quantity: 1 }]);
  }
  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/issue-vouchers', {
        warehouseId,
        eventId,
        recipientName,
        handedByUserId: handedByUserId || undefined,
        receivedByUserId: receivedByUserId || undefined,
        vehicles,
        items: lines.filter((l) => l.itemId && l.quantity > 0).map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) })),
      });
      setSuccess(`${t('تم الحفظ بنجاح — رقم الإذن:')} ${data.data.number}. ${t('تم خصم الكميات من المخزون.')}`);
      setLines([{ itemId: '', quantity: 1 }]);
      setRecipientName('');
      setHandedByUserId('');
      setReceivedByUserId('');
      setVehicles([]);
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ أثناء الحفظ'));
    } finally {
      setSubmitting(false);
    }
  }

  function findStockLine(itemId) {
    return warehouseItems.find((s) => s.item.id === itemId);
  }

  return (
    <>
      <PageHeader title={t('إذن صرف جديد')} subtitle={t('صرف أصناف من المخزن لحفلة معينة')} />
      <div className="p-7 max-w-3xl">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-5">
          {t('عند الحفظ، الكميات بتتخصم فعلياً من رصيد المخزن، ولو الكمية مش متوفرة هيظهرلك تنبيه فوري بالمتاح الحقيقي.')}
        </div>

        {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}
        {success && <div className="text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 text-sm mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('المخزن')}</label>
              <select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('اختر المخزن')}</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('الحفلة')}</label>
              <select required value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('اختر الحفلة')}</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.number} — {ev.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">{t('اسم المستلم')}</label>
            <input required value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('اسم الفني أو المستلم')} />
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
          <div className="text-[11px] text-gray-600 -mt-2">{t('استخدمهم لو التسليم بين أوبريشن وأوبريشن تاني، عشان تحدد مين سلّم لمين بالظبط')}</div>

          <VehiclesInput value={vehicles} onChange={setVehicles} />

          <div>
            <div className="text-sm font-extrabold mb-2">{t('الأصناف')}</div>

            {!warehouseId && <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-2">{t('اختر المخزن الأول عشان تظهرلك أصنافه الفعلية')}</div>}
            {warehouseId && loadingItems && <div className="text-xs text-gray-600 mb-2">{t('جاري تحميل أصناف المخزن...')}</div>}
            {warehouseId && !loadingItems && warehouseItems.length === 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-2">{t('المخزن ده لسه مفيهوش أي أصناف مسجّلة')}</div>
            )}

            <div className="space-y-2">
              {lines.map((line, idx) => {
                const stockLine = findStockLine(line.itemId);
                return (
                  <div key={idx} className="flex gap-2 items-center">
                    <ItemPicker
                      stockItems={warehouseItems}
                      categories={categories}
                      value={line.itemId}
                      onChange={(itemId) => updateLine(idx, 'itemId', itemId)}
                      placeholder={warehouseId ? t('اختر صنف من هذا المخزن') : t('اختر المخزن أولاً')}
                    />
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                      className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                    {stockLine && <span className="text-xs text-gray-600 w-14">{stockLine.item.unit}</span>}
                    <button type="button" onClick={() => removeLine(idx)} className="text-rose-500 text-sm px-2">{t('حذف')}</button>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={addLine} disabled={!warehouseId} className="text-blue-600 text-sm font-bold mt-2 disabled:text-gray-600">+ {t('إضافة صنف')}</button>
          </div>

          <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl">
            {submitting ? t('جاري الحفظ...') : t('حفظ وخصم من المخزن')}
          </button>
        </form>
      </div>
    </>
  );
}
