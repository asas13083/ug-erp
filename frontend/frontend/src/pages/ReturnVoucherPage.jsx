import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';

export default function ReturnVoucherPage() {
  const [events, setEvents] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [eventId, setEventId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [issuedItems, setIssuedItems] = useState([]); // items from selected event's issue vouchers
  const [lines, setLines] = useState({}); // itemId -> { returnedQuantity, damagedQuantity }
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/events', { params: { status: 'RETURN_PENDING' } }).then(({ data }) => setEvents(data.data));
    api.get('/warehouses').then(({ data }) => setWarehouses(data.data));
  }, []);

  useEffect(() => {
    if (!eventId) return setIssuedItems([]);
    api.get(`/events/${eventId}`).then(({ data }) => {
      const totals = {};
      data.data.issueVouchers.forEach((v) => {
        v.items.forEach((line) => {
          totals[line.itemId] = totals[line.itemId] || { item: line.item, issued: 0 };
          totals[line.itemId].issued += line.quantity;
        });
      });
      const arr = Object.entries(totals).map(([itemId, v]) => ({ itemId, ...v }));
      setIssuedItems(arr);
      const initLines = {};
      arr.forEach((l) => { initLines[l.itemId] = { returnedQuantity: l.issued, damagedQuantity: 0 }; });
      setLines(initLines);
    });
  }, [eventId]);

  function updateLine(itemId, field, value) {
    setLines((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: Number(value) } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const items = issuedItems.map((l) => ({
        itemId: l.itemId,
        issuedQuantity: l.issued,
        returnedQuantity: lines[l.itemId]?.returnedQuantity ?? 0,
        damagedQuantity: lines[l.itemId]?.damagedQuantity ?? 0,
      }));
      const { data } = await api.post('/return-vouchers', { eventId, warehouseId, items });
      setSuccess(`تم تسجيل المرتجع بنجاح — رقم الإذن: ${data.data.number}`);
      setEventId('');
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="إذن مرتجع" subtitle="استلام الأصناف بعد انتهاء الحفلة" />
      <div className="p-7 max-w-3xl">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-5">
          الكمية السليمة والتالفة بترجع للمخزون، وأي فرق ناقص بيتسجل تلقائياً كفاقد.
        </div>
        {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}
        {success && <div className="text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 text-sm mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">الحفلة (بانتظار المرتجع)</label>
              <select required value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">اختر الحفلة</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.number} — {ev.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">المخزن المستلم</label>
              <select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">اختر المخزن</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          {issuedItems.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-extrabold">الأصناف المصروفة</div>
              {issuedItems.map((l) => (
                <div key={l.itemId} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <div className="flex-1 text-sm font-bold">{l.item.name} <span className="text-gray-400 font-normal">(مصروف {l.issued})</span></div>
                  <div>
                    <label className="block text-[10px] text-gray-500">سليم</label>
                    <input type="number" min={0} max={l.issued} value={lines[l.itemId]?.returnedQuantity ?? 0} onChange={(e) => updateLine(l.itemId, 'returnedQuantity', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500">تالف</label>
                    <input type="number" min={0} value={lines[l.itemId]?.damagedQuantity ?? 0} onChange={(e) => updateLine(l.itemId, 'damagedQuantity', e.target.value)} className="w-20 border border-gray-200 rounded px-2 py-1 text-sm" />
                  </div>
                  <div className="text-xs text-rose-500 w-24 text-left">
                    فاقد: {Math.max(l.issued - (lines[l.itemId]?.returnedQuantity ?? 0) - (lines[l.itemId]?.damagedQuantity ?? 0), 0)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button type="submit" disabled={submitting || issuedItems.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl">
            {submitting ? 'جاري الحفظ...' : 'تأكيد المرتجع'}
          </button>
        </form>
      </div>
    </>
  );
}
