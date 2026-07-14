import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { downloadFile } from '../utils/downloadFile';
import { getAssetUrl } from '../utils/assetUrl';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function SupplierDetailPage() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const { can } = useAuth();
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '', eventId: '' });

  function load() {
    setLoading(true);
    api.get(`/suppliers/${id}/profile`)
      .then(({ data }) => setData(data.data))
      .catch((err) => setError(err.response?.data?.message || t('حصل خطأ')))
      .finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function savePayment(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/suppliers/${id}/payments`, {
        amount: Number(payForm.amount),
        date: payForm.date,
        notes: payForm.notes || undefined,
        eventId: payForm.eventId || undefined,
      });
      setShowPaymentForm(false);
      setPayForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '', eventId: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('حصل خطأ'));
    }
  }

  async function deletePayment(payment) {
    if (!confirm(t('متأكد من حذف الدفعة دي؟'))) return;
    try {
      await api.delete(`/suppliers/payments/${payment.id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('حصل خطأ'));
    }
  }

  if (loading) return <div className="p-7 text-center text-gray-600 text-sm">{t('جاري التحميل...')}</div>;
  if (!data) return <div className="p-7 text-center text-rose-600 text-sm">{error || t('المورد غير موجود')}</div>;

  const { supplier, entries, payments, events, totalInvoiced, totalPaid, due } = data;

  return (
    <>
      <PageHeader
        title={supplier.name}
        subtitle={[supplier.company, supplier.phone].filter(Boolean).join(' · ') || t('ملف المورد')}
        action={
          <button
            onClick={() => downloadFile(`/suppliers/${id}/export-excel`, `مورد-${supplier.name}.xlsx`)}
            className="border border-gray-200 hover:border-gray-300 text-sm font-bold px-4 py-2 rounded-lg transition"
          >
            Excel
          </button>
        }
      />

      <div className="p-7 space-y-6">
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

        {/* ============ الملخص المالي ============ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="text-xs text-gray-500 font-bold mb-1">{t('إجمالي التعاملات')}</div>
            <div className="text-2xl font-extrabold">{totalInvoiced.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="text-xs text-gray-500 font-bold mb-1">{t('المدفوع')}</div>
            <div className="text-2xl font-extrabold text-emerald-600">{totalPaid.toLocaleString()}</div>
          </div>
          <div className={`border rounded-2xl p-5 ${due > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="text-xs text-gray-600 font-bold mb-1">{t('المستحق (المتبقي)')}</div>
            <div className={`text-2xl font-extrabold ${due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{due.toLocaleString()}</div>
          </div>
        </div>

        {/* ============ الحفلات ============ */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-extrabold">{t('الحفلات اللي اتعامل فيها')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[11px]">
                  <th className="text-right px-4 py-2.5 font-bold">{t('الحفلة')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('عدد الفواتير')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('الإجمالي')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('المدفوع')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('المتبقي')}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((row) => (
                  <tr key={row.event.id} className="border-t border-gray-50">
                    <td className="px-4 py-2.5 font-bold">
                      <Link to={`/accounts/${row.event.id}`} className="text-blue-600 hover:underline">{row.event.name}</Link>
                      <span className="text-[10px] text-gray-500 font-normal"> · {row.event.number}</span>
                    </td>
                    <td className="px-4 py-2.5">{row.count}</td>
                    <td className="px-4 py-2.5 font-bold">{row.total.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-emerald-600">{row.paid.toLocaleString()}</td>
                    <td className={`px-4 py-2.5 font-bold ${row.total - row.paid > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {(row.total - row.paid).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-500 text-sm">{t('مفيش تعاملات لسه')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ============ كل الفواتير ============ */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-extrabold">{t('كل الفواتير')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[11px]">
                  <th className="text-right px-4 py-2.5 font-bold">{t('التاريخ')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('الحفلة')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('الوصف')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('الإجمالي')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('المدفوع')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('المتبقي')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-gray-50 align-top">
                    <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{new Date(e.date).toLocaleDateString(locale)}</td>
                    <td className="px-4 py-2.5">{e.event?.name || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div>{e.description}</div>
                      <div className="mt-1 space-y-0.5">
                        {(e.lines || []).map((l) => (
                          <div key={l.id} className="text-[11px] text-gray-500">
                            {l.itemName} — {l.count} {l.unit} × {l.unitPrice.toLocaleString()}
                          </div>
                        ))}
                      </div>
                      {e.imageUrl && (
                        <a href={getAssetUrl(e.imageUrl)} target="_blank" rel="noreferrer" className="inline-block mt-1">
                          <img src={getAssetUrl(e.imageUrl)} alt="" className="w-9 h-9 rounded object-cover border border-gray-200 hover:opacity-80 transition" />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-bold whitespace-nowrap">{e.total.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-emerald-600 whitespace-nowrap">{e.paidAmount.toLocaleString()}</td>
                    <td className={`px-4 py-2.5 font-bold whitespace-nowrap ${e.total - e.paidAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {(e.total - e.paidAmount).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500 text-sm">{t('مفيش فواتير لسه')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ============ الدفعات ============ */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-extrabold">{t('الدفعات')}</h3>
            {can('suppliers', 'edit') && (
              <button onClick={() => setShowPaymentForm(true)} className="text-blue-600 text-sm font-bold hover:underline">
                + {t('تسجيل دفعة')}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[11px]">
                  <th className="text-right px-4 py-2.5 font-bold">{t('التاريخ')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('المبلغ')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('عن حفلة')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('ملاحظات')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('سجّلها')}</th>
                  <th className="text-right px-4 py-2.5 font-bold w-20">{t('إجراءات')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-600">{new Date(p.date).toLocaleDateString(locale)}</td>
                    <td className="px-4 py-2.5 font-extrabold text-emerald-600">{p.amount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {p.event ? (
                        <Link to={`/accounts/${p.event.id}`} className="text-blue-600 hover:underline">{p.event.name}</Link>
                      ) : (
                        <span className="text-gray-400">{t('عامة')}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{p.notes || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{p.user?.fullName || '—'}</td>
                    <td className="px-4 py-2.5">
                      {can('suppliers', 'delete') && (
                        <button onClick={() => deletePayment(p)} className="text-rose-600 text-xs font-bold hover:underline">{t('حذف')}</button>
                      )}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500 text-sm">{t('مفيش دفعات لسه')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============ نافذة تسجيل دفعة ============ */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={savePayment} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3.5 shadow-xl">
            <h3 className="font-extrabold text-lg">{t('تسجيل دفعة')}</h3>
            <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-600">{t('المستحق حالياً')}: </span>
              <span className="font-extrabold text-rose-600">{due.toLocaleString()}</span>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('المبلغ')}</label>
              <input required autoFocus type="number" min={0} step="any" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">
                {t('عن حفلة معيّنة؟')} <span className="font-normal text-gray-500">({t('اختياري')})</span>
              </label>
              <select value={payForm.eventId} onChange={(e) => setPayForm({ ...payForm, eventId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('دفعة عامة (مش لحفلة بعينها)')}</option>
                {events.map((row) => (
                  <option key={row.event.id} value={row.event.id}>{row.event.name} — {row.event.number}</option>
                ))}
              </select>
              <div className="text-[11px] text-gray-500 mt-1">
                {t('لو الدفعة دي مقابل حفلة معيّنة، اختارها عشان "المستحق" يظهر صح جوه كشف حساب الحفلة نفسها')}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('التاريخ')}</label>
              <input required type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('ملاحظات')}</label>
              <input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition">{t('حفظ')}</button>
              <button type="button" onClick={() => setShowPaymentForm(false)} className="flex-1 border border-gray-200 hover:border-gray-300 font-bold py-2.5 rounded-xl text-sm transition">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
