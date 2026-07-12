import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { useLanguage } from '../context/LanguageContext';

const REASON_LABELS = { DAMAGED: 'تلف', LOST: 'مفقود', THEFT: 'سرقة', OTHER: 'أخرى' };

export default function WarehouseDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const [warehouse, setWarehouse] = useState(null);
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState({ issued: [], returned: [], lost: [] });
  const [tab, setTab] = useState('stock');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lossItem, setLossItem] = useState(null);
  const [lossQuantity, setLossQuantity] = useState(1);
  const [lossReason, setLossReason] = useState('DAMAGED');
  const [lossDescription, setLossDescription] = useState('');
  const [lossError, setLossError] = useState('');
  const [lossSubmitting, setLossSubmitting] = useState(false);
  const [editingMinFor, setEditingMinFor] = useState(null); // itemId اللي بنعدّل حده الأدنى دلوقتي
  const [minDraft, setMinDraft] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/warehouses/${id}`).then(({ data }) => setWarehouse(data.data)),
      api.get(`/warehouses/${id}/stock`).then(({ data }) => setStock(data.data)),
      api.get(`/warehouses/${id}/movements`).then(({ data }) => setMovements(data.data)),
    ])
      .catch((err) => setError(err.response?.data?.message || t('تعذر تحميل بيانات المخزن')))
      .finally(() => setLoading(false));
  }, [id]);

  function reloadStock() {
    api.get(`/warehouses/${id}/stock`).then(({ data }) => setStock(data.data));
  }

  async function saveMinQuantity(itemId) {
    const value = Number(minDraft);
    if (!Number.isFinite(value) || value < 0) {
      setEditingMinFor(null);
      return;
    }
    try {
      await api.put(`/warehouses/${id}/stock/${itemId}/min-quantity`, { minQuantity: value });
      setEditingMinFor(null);
      reloadStock();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر حفظ الحد الأدنى'));
    }
  }

  function openLoss(item) {
    setLossItem(item);
    setLossQuantity(1);
    setLossReason('DAMAGED');
    setLossDescription('');
    setLossError('');
  }

  async function handleLossSubmit(e) {
    e.preventDefault();
    setLossError('');
    setLossSubmitting(true);
    try {
      await api.post('/loss-records', {
        itemId: lossItem.item.id,
        warehouseId: id,
        quantity: Number(lossQuantity),
        reason: lossReason,
        description: lossDescription,
      });
      setLossItem(null);
      reloadStock();
    } catch (err) {
      setLossError(err.response?.data?.message || t('تعذر تسجيل الفاقد'));
    } finally {
      setLossSubmitting(false);
    }
  }

  function handlePdf() {
    const rows = stock.map((s) => `<tr><td>${esc(s.item.code)}</td><td>${esc(s.item.name)}</td><td>${esc(s.item.category?.name)}</td><td>${s.quantity}</td><td>${s.reservedQty}</td><td>${s.quantity - s.reservedQty}</td><td>${s.stillOut || 0}</td><td>${s.lost || 0}</td><td>${(s.quantity - s.reservedQty) + (s.stillOut || 0) + (s.lost || 0)}</td></tr>`).join('');
    downloadPdf(
      `رصيد مخزن ${esc(warehouse?.name || '')}`,
      `<table><thead><tr><th>الكود</th><th>الصنف</th><th>التصنيف</th><th>الكمية</th><th>محجوز</th><th>المتاح</th><th>لسه برا</th><th>الفاقد</th><th>إجمالي كمية الصنف</th></tr></thead><tbody>${rows}</tbody></table>`,
      { filename: `مخزن-${warehouse?.name || 'تقرير'}.pdf` }
    );
  }

  if (loading) return <div className="p-10 text-center text-gray-600">{t('جاري تحميل بيانات المخزن...')}</div>;
  if (error) return <div className="p-10 text-center text-rose-600">{error}</div>;
  if (!warehouse) return <div className="p-10 text-center text-gray-600">{t('المخزن غير موجود')}</div>;

  const TABS = [
    { key: 'stock', label: `${t('الرصيد الحالي')} (${stock.length})` },
    { key: 'issued', label: `${t('إذن الصرف')} (${movements.issued.length})` },
    { key: 'returned', label: `${t('المرتجع')} (${movements.returned.length})` },
    { key: 'lost', label: `${t('الفاقد')} (${movements.lost.length})` },
  ];

  return (
    <>
      <PageHeader
        title={warehouse.name}
        subtitle={`${warehouse.location || '—'} · ${t('المسؤول')}: ${warehouse.responsible || '—'}`}
        action={
          <div className="flex gap-2">
            <Link to="/warehouses" className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('كل المخازن')}</Link>
            <button onClick={handlePdf} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('تحميل PDF')}</button>
            <button onClick={() => downloadFile(`/reports/warehouse/${id}.xlsx`, `مخزن-${warehouse.name}.xlsx`)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">{t('تصدير Excel')}</button>
          </div>
        }
      />
      <div className="p-7">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-blue-600">{stock.length}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('صنف مختلف')}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-emerald-600">{stock.reduce((s, x) => s + x.quantity, 0)}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('إجمالي الكمية')}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-amber-600">{stock.reduce((s, x) => s + x.reservedQty, 0)}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('محجوز لحفلات قادمة')}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-rose-600">{movements.lost.filter((l) => l.status !== 'CANCELLED').reduce((s, l) => s + l.quantity, 0)}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('إجمالي الفاقد من المخزن ده')}</div>
          </div>
        </div>

        <div className="inline-flex bg-gray-100 rounded-xl p-1 mb-5 gap-1">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${tab === tabItem.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'}`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {tab === 'stock' && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs">
                  <th className="text-right px-4 py-3 font-bold">{t('الكود')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('الصنف')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('التصنيف')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('الكمية')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('الحد الأدنى')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('محجوز')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('المتاح')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('لسه برا')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('الفاقد')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('إجمالي كمية الصنف')}</th>
                  <th className="text-right px-4 py-3 font-bold w-24">{t('إجراءات')}</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s) => (
                  <tr key={s.id} className={`border-t border-gray-100 ${s.minQuantity > 0 && s.quantity <= s.minQuantity ? 'bg-rose-50/50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.item.code}</td>
                    <td className="px-4 py-3 font-bold">
                      {s.item.name}
                      {s.minQuantity > 0 && s.quantity <= s.minQuantity && (
                        <span className="mr-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">{t('تنبيه نقص')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{s.item.category?.name}</td>
                    <td className="px-4 py-3 font-extrabold">{s.quantity}</td>
                    <td className="px-4 py-3">
                      {editingMinFor === s.itemId ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            value={minDraft}
                            onChange={(e) => setMinDraft(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveMinQuantity(s.itemId)}
                            autoFocus
                            className="w-16 border border-gray-300 rounded px-1.5 py-1 text-xs"
                          />
                          <button onClick={() => saveMinQuantity(s.itemId)} className="text-emerald-600 text-xs font-bold">✓</button>
                          <button onClick={() => setEditingMinFor(null)} className="text-gray-400 text-xs font-bold">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingMinFor(s.itemId); setMinDraft(String(s.minQuantity || 0)); }}
                          className="text-gray-700 hover:text-blue-600 hover:underline text-xs font-bold"
                        >
                          {s.minQuantity || 0}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">{s.reservedQty}</td>
                    <td className="px-4 py-3">{s.quantity - s.reservedQty}</td>
                    <td className="px-4 py-3 font-bold text-amber-600">{s.stillOut || 0}</td>
                    <td className="px-4 py-3 font-bold text-rose-600">{s.lost || 0}</td>
                    <td className="px-4 py-3 font-extrabold text-gray-800">{(s.quantity - s.reservedQty) + (s.stillOut || 0) + (s.lost || 0)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openLoss(s)} className="text-amber-600 text-xs font-bold hover:underline">{t('تسجيل فاقد')}</button>
                    </td>
                  </tr>
                ))}
                {stock.length === 0 && <tr><td colSpan={11} className="text-center py-10 text-gray-600">{t('لا يوجد رصيد في هذا المخزن')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'issued' && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs">
                  <th className="text-right px-4 py-3 font-bold">{t('رقم الإذن')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('الحفلة')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('الأصناف')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
                </tr>
              </thead>
              <tbody>
                {movements.issued.map((v) => (
                  <tr key={v.id} className={`border-t border-gray-100 ${v.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.number}</td>
                    <td className="px-4 py-3 font-bold">{v.event?.name}</td>
                    <td className="px-4 py-3">{v.items.map((i) => `${i.item.name} ×${i.quantity}`).join('، ')}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(v.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td className="px-4 py-3">
                      {v.status === 'CANCELLED' ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{t('ملغى')}</span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">{t('فعّال')}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {movements.issued.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-600">{t('لا يوجد صرف من هذا المخزن بعد')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'returned' && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs">
                  <th className="text-right px-4 py-3 font-bold">{t('رقم الإذن')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('الحفلة')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('الأصناف')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
                </tr>
              </thead>
              <tbody>
                {movements.returned.map((v) => (
                  <tr key={v.id} className={`border-t border-gray-100 ${v.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{v.number}</td>
                    <td className="px-4 py-3 font-bold">{v.event?.name}</td>
                    <td className="px-4 py-3">{v.items.map((i) => `${i.item.name} (${t('سليم')} ${i.returnedQuantity})`).join('، ')}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(v.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td className="px-4 py-3">
                      {v.status === 'CANCELLED' ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{t('ملغى')}</span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">{t('فعّال')}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {movements.returned.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-600">{t('لا يوجد مرتجع لهذا المخزن بعد')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'lost' && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs">
                  <th className="text-right px-4 py-3 font-bold">{t('الصنف')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('السبب')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('الكمية')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('الحفلة')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                  <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
                </tr>
              </thead>
              <tbody>
                {movements.lost.map((l) => (
                  <tr key={l.id} className={`border-t border-gray-100 ${l.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-bold">{l.item?.name}</td>
                    <td className="px-4 py-3"><span className="bg-rose-50 text-rose-600 text-xs font-bold px-2.5 py-1 rounded-full">{t(REASON_LABELS[l.reason])}</span></td>
                    <td className="px-4 py-3 font-extrabold">{l.quantity}</td>
                    <td className="px-4 py-3">{l.event?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(l.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td className="px-4 py-3">
                      {l.status === 'CANCELLED' ? (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{t('ملغى')}</span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">{t('فعّال')}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {movements.lost.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-600">{t('لا يوجد فاقد من هذا المخزن')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lossItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10 px-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleLossSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5 shadow-xl">
            <h3 className="font-extrabold text-lg mb-2">{t('تسجيل فاقد')} — {lossItem.item.name}</h3>
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{t('هيتخصم من رصيد')} {warehouse?.name} {t('فوراً.')}</div>
            {lossError && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{lossError}</div>}

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('الكمية')}</label>
              <input required type="number" min={1} value={lossQuantity} onChange={(e) => setLossQuantity(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('السبب')}</label>
              <select value={lossReason} onChange={(e) => setLossReason(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="DAMAGED">{t('تلف')}</option>
                <option value="LOST">{t('مفقود')}</option>
                <option value="THEFT">{t('سرقة')}</option>
                <option value="OTHER">{t('أخرى')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('ملاحظات (اختياري)')}</label>
              <textarea value={lossDescription} onChange={(e) => setLossDescription(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={lossSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition">
                {lossSubmitting ? t('جاري الحفظ...') : t('تسجيل الفاقد')}
              </button>
              <button type="button" onClick={() => setLossItem(null)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
