import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { escapeHtml as esc } from '../utils/escapeHtml';
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
  // الفاتورة المفتوحة حالياً في جدول "كل الفواتير" (نضغط عليها يظهر تفصيلها)
  const [openEntryId, setOpenEntryId] = useState(null);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  // توزيع الدفعة على فواتير: { entryId: مبلغ مخصّص }
  const [alloc, setAlloc] = useState({});

  function load() {
    setLoading(true);
    api.get(`/suppliers/${id}/profile`)
      .then(({ data }) => setData(data.data))
      .catch((err) => setError(err.response?.data?.message || t('حصل خطأ')))
      .finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  function openPaymentForm() {
    setPayForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
    setAlloc({});
    setError('');
    setShowPaymentForm(true);
  }

  function setAllocFor(entryId, value) {
    setAlloc((prev) => {
      const next = { ...prev };
      if (value === '' || Number(value) <= 0) delete next[entryId];
      else next[entryId] = value;
      return next;
    });
  }

  const allocatedSum = Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0);
  const payAmountNum = Number(payForm.amount) || 0;
  const unallocated = payAmountNum - allocatedSum;

  async function savePayment(e) {
    e.preventDefault();
    setError('');
    if (allocatedSum > payAmountNum + 0.001) {
      setError(t('مجموع الموزّع على الفواتير أكبر من قيمة الدفعة'));
      return;
    }
    try {
      const allocations = Object.entries(alloc)
        .map(([entryId, amount]) => ({ entryId, amount: Number(amount) }))
        .filter((a) => a.amount > 0);
      await api.post(`/suppliers/${id}/payments`, {
        amount: payAmountNum,
        date: payForm.date,
        notes: payForm.notes || undefined,
        allocations: allocations.length ? allocations : undefined,
      });
      setShowPaymentForm(false);
      setAlloc({});
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

  const { supplier, entries, payments, events, openInvoices = [], totalInvoiced, totalPaid, due } = data;

  function paidOf(e) { return e.paidTotal ?? e.paidAmount; }

  function exportInvoicesPdf() {
    const rows = entries.map((e) => {
      const paid = paidOf(e);
      const lines = (e.lines || []).map((l) => `${esc(l.itemName)} — ${l.count} ${esc(l.unit)} × ${l.unitPrice.toLocaleString()}`).join('<br>');
      return `<tr><td>${new Date(e.date).toLocaleDateString('ar-EG')}</td><td>${esc(e.event?.name || '—')}</td><td>${esc(e.description)}${lines ? `<br><span style="color:#666;font-size:11px">${lines}</span>` : ''}</td><td>${e.total.toLocaleString()}</td><td>${paid.toLocaleString()}</td><td>${(e.total - paid).toLocaleString()}</td></tr>`;
    }).join('');
    downloadPdf(
      `فواتير المورد: ${esc(supplier.name)}`,
      `<table><thead><tr><th>التاريخ</th><th>الحفلة</th><th>الوصف</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr></thead><tbody>${rows}
        <tr style="font-weight:bold;background:#f3f4f6;"><td colspan="3">الإجمالي</td><td>${totalInvoiced.toLocaleString()}</td><td>${totalPaid.toLocaleString()}</td><td>${(totalInvoiced - totalPaid).toLocaleString()}</td></tr>
      </tbody></table>`,
    );
  }

  function exportPaymentsPdf() {
    const rows = payments.map((p) => {
      const allocs = (p.allocations || []).map((a) => `${esc(a.entry?.event?.name || a.entry?.description || '')}: ${a.amount.toLocaleString()}`).join('<br>') || 'دفعة عامة';
      return `<tr><td>${new Date(p.date).toLocaleDateString('ar-EG')}</td><td>${p.amount.toLocaleString()}</td><td>${allocs}</td><td>${esc(p.notes || '—')}</td></tr>`;
    }).join('');
    downloadPdf(
      `دفعات المورد: ${esc(supplier.name)}`,
      `<table><thead><tr><th>التاريخ</th><th>المبلغ</th><th>موزّعة على</th><th>ملاحظات</th></tr></thead><tbody>${rows}</tbody></table>`,
    );
  }

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
          <div className={`border rounded-2xl p-5 ${due > 0.001 ? 'bg-rose-50 border-rose-200' : due < -0.001 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="text-xs text-gray-600 font-bold mb-1">
              {due < -0.001 ? t('ليك عند المورد (دفعت زيادة)') : t('المستحق (المتبقي)')}
            </div>
            <div className={`text-2xl font-extrabold ${due > 0.001 ? 'text-rose-600' : due < -0.001 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {Math.abs(due).toLocaleString()}
            </div>
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
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-extrabold">{t('كل الفواتير')}</h3>
            <div className="flex gap-2">
              <button onClick={exportInvoicesPdf} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition">PDF</button>
              <button onClick={() => downloadFile(`/suppliers/${id}/export-excel`, `مورد-${supplier.name}.xlsx`)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition">Excel</button>
            </div>
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
                {entries.map((e) => {
                  const paid = paidOf(e);
                  const remaining = e.total - paid;
                  const isOpen = openEntryId === e.id;
                  return (
                    <>
                      <tr
                        key={e.id}
                        onClick={() => setOpenEntryId(isOpen ? null : e.id)}
                        className="border-t border-gray-50 hover:bg-gray-50/60 transition cursor-pointer"
                      >
                        <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{new Date(e.date).toLocaleDateString(locale)}</td>
                        <td className="px-4 py-2.5">
                          {e.event ? <Link to={`/accounts/${e.event.id}`} onClick={(ev) => ev.stopPropagation()} className="text-blue-600 hover:underline">{e.event.name}</Link> : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-gray-400 text-xs mr-1">{isOpen ? '▾' : '▸'}</span>
                          {e.description}
                        </td>
                        <td className="px-4 py-2.5 font-bold whitespace-nowrap">{e.total.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-emerald-600 whitespace-nowrap">{paid.toLocaleString()}</td>
                        <td className={`px-4 py-2.5 font-bold whitespace-nowrap ${remaining > 0.001 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {remaining.toLocaleString()}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={6} className="px-6 py-3">
                            <div className="text-xs font-bold text-gray-600 mb-1.5">{t('تفاصيل الفاتورة')}</div>
                            {(e.lines || []).length > 0 ? (
                              <table className="w-full text-xs mb-2">
                                <thead>
                                  <tr className="text-gray-400">
                                    <th className="text-right py-1 font-bold">{t('الصنف')}</th>
                                    <th className="text-right py-1 font-bold">{t('العدد')}</th>
                                    <th className="text-right py-1 font-bold">{t('سعر الوحدة')}</th>
                                    <th className="text-right py-1 font-bold">{t('الإجمالي')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {e.lines.map((l) => (
                                    <tr key={l.id} className="border-t border-gray-100">
                                      <td className="py-1">{l.itemName}</td>
                                      <td className="py-1">{l.count} {l.unit}</td>
                                      <td className="py-1">{l.unitPrice.toLocaleString()}</td>
                                      <td className="py-1 font-bold">{l.total.toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="text-xs text-gray-400 mb-2">{t('فاتورة بمبلغ إجمالي بدون بنود تفصيلية')}</div>
                            )}
                            {e.imageUrl && (
                              <a href={getAssetUrl(e.imageUrl)} target="_blank" rel="noreferrer" className="inline-block">
                                <img src={getAssetUrl(e.imageUrl)} alt="" className="w-16 h-16 rounded object-cover border border-gray-200 hover:opacity-80 transition" />
                              </a>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
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
            <div className="flex items-center gap-3">
              <button onClick={exportPaymentsPdf} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition">PDF</button>
              {can('suppliers', 'edit') && (
                <button onClick={openPaymentForm} className="text-blue-600 text-sm font-bold hover:underline">
                  + {t('تسجيل دفعة')}
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[11px]">
                  <th className="text-right px-4 py-2.5 font-bold">{t('التاريخ')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('المبلغ')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('موزّعة على')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('ملاحظات')}</th>
                  <th className="text-right px-4 py-2.5 font-bold">{t('سجّلها')}</th>
                  <th className="text-right px-4 py-2.5 font-bold w-20">{t('إجراءات')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const allocs = p.allocations || [];
                  const allocatedSum = allocs.reduce((s, a) => s + a.amount, 0);
                  const general = p.amount - allocatedSum;
                  return (
                  <tr key={p.id} className="border-t border-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-600">{new Date(p.date).toLocaleDateString(locale)}</td>
                    <td className="px-4 py-2.5 font-extrabold text-emerald-600">{p.amount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {allocs.length === 0 ? (
                        <span className="text-gray-400">{t('دفعة عامة')}</span>
                      ) : (
                        <div className="space-y-0.5">
                          {allocs.map((a) => (
                            <div key={a.id}>
                              <Link to={`/accounts/${a.entry?.event?.id}`} className="text-blue-600 hover:underline">{a.entry?.event?.name || a.entry?.description}</Link>
                              <span className="text-gray-500"> — {a.amount.toLocaleString()}</span>
                            </div>
                          ))}
                          {general > 0.001 && <div className="text-gray-400">{t('عامة')}: {general.toLocaleString()}</div>}
                        </div>
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
                  );
                })}
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
          <form onSubmit={savePayment} className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-3.5 shadow-xl">
            <h3 className="font-extrabold text-lg">{t('تسجيل دفعة')}</h3>
            <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-600">{due < -0.001 ? t('ليك عند المورد') : t('المستحق حالياً')}: </span>
              <span className={`font-extrabold ${due < -0.001 ? 'text-amber-600' : 'text-rose-600'}`}>{Math.abs(due).toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">{t('المبلغ')}</label>
                <input required autoFocus type="number" min={0} step="any" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">{t('التاريخ')}</label>
                <input required type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('ملاحظات')}</label>
              <input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            {openInvoices.length > 0 && (
              <div className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700">{t('وزّع المبلغ على الفواتير')} <span className="font-normal text-gray-500">({t('اختياري')})</span></span>
                  <button
                    type="button"
                    onClick={() => {
                      // توزيع تلقائي: املأ الفواتير من الأقدم للأحدث لحد ما المبلغ يخلص
                      let rem = payAmountNum;
                      const next = {};
                      [...openInvoices].reverse().forEach((inv) => {
                        if (rem <= 0) return;
                        const take = Math.min(rem, inv.remaining);
                        if (take > 0) { next[inv.id] = String(Math.round(take)); rem -= take; }
                      });
                      setAlloc(next);
                    }}
                    className="text-[11px] text-blue-600 font-bold hover:underline"
                  >
                    {t('توزيع تلقائي')}
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {openInvoices.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-800 truncate">{inv.description}</div>
                        <div className="text-gray-500">
                          {inv.event?.name} · {t('متبقّي')}: <span className="font-bold text-rose-600">{Math.round(inv.remaining).toLocaleString()}</span>
                        </div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={inv.remaining}
                        step="any"
                        placeholder="0"
                        value={alloc[inv.id] || ''}
                        onChange={(e) => setAllocFor(inv.id, e.target.value)}
                        className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-[11px] mt-2 pt-2 border-t border-gray-100">
                  <span className="text-gray-500">{t('الموزّع')}: <span className="font-bold text-gray-700">{allocatedSum.toLocaleString()}</span></span>
                  <span className={unallocated < -0.001 ? 'text-rose-600 font-bold' : 'text-gray-500'}>
                    {unallocated >= 0 ? t('غير موزّع (دفعة عامة)') : t('زيادة عن الدفعة')}: <span className="font-bold">{Math.abs(unallocated).toLocaleString()}</span>
                  </span>
                </div>
              </div>
            )}

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
