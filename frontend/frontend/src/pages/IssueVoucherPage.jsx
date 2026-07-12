import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';

export default function IssueVoucherPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [events, setEvents] = useState([]);
  const [items, setItems] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [eventId, setEventId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [lines, setLines] = useState([{ itemId: '', quantity: 1 }]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/warehouses').then(({ data }) => setWarehouses(data.data));
    api.get('/events', { params: { status: 'PLANNED' } }).then(({ data }) => setEvents(data.data));
    api.get('/items').then(({ data }) => setItems(data.data));
  }, []);

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
        items: lines.filter((l) => l.itemId && l.quantity > 0).map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) })),
      });
      setSuccess(`تم الحفظ بنجاح — رقم الإذن: ${data.data.number}. تم خصم الكميات من المخزون.`);
      setLines([{ itemId: '', quantity: 1 }]);
      setRecipientName('');
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSubmitting(false);
    }
  }

  function findItem(id) {
    return items.find((i) => i.id === id);
  }

  return (
    <>
      <PageHeader title="إذن صرف جديد" subtitle="صرف أصناف من المخزن لحفلة معينة" />
      <div className="p-7 max-w-3xl">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-5">
          عند الحفظ، الكميات بتتخصم فعلياً من رصيد المخزن، ولو الكمية مش متوفرة هيظهرلك تنبيه فوري بالمتاح الحقيقي.
        </div>

        {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}
        {success && <div className="text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 text-sm mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">المخزن</label>
              <select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">اختر المخزن</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">الحفلة</label>
              <select required value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">اختر الحفلة</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.number} — {ev.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">اسم المستلم</label>
            <input required value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="اسم الفني أو المستلم" />
          </div>

          <div>
            <div className="text-sm font-extrabold mb-2">الأصناف</div>
            <div className="space-y-2">
              {lines.map((line, idx) => {
                const selected = findItem(line.itemId);
                return (
                  <div key={idx} className="flex gap-2 items-center">
                    <select value={line.itemId} onChange={(e) => updateLine(idx, 'itemId', e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      <option value="">اختر صنف</option>
                      {items.map((i) => <option key={i.id} value={i.id}>{i.name} (متاح: {i.availableQuantity})</option>)}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                      className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                    {selected && <span className="text-xs text-gray-400 w-16">{selected.unit}</span>}
                    <button type="button" onClick={() => removeLine(idx)} className="text-rose-500 text-sm px-2">حذف</button>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={addLine} className="text-blue-600 text-sm font-bold mt-2">+ إضافة صنف</button>
          </div>

          <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl">
            {submitting ? 'جاري الحفظ...' : 'حفظ وخصم من المخزن'}
          </button>
        </form>
      </div>
    </>
  );
}
