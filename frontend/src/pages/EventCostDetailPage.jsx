import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { getAssetUrl } from '../utils/assetUrl';
import { useLanguage } from '../context/LanguageContext';

const CATEGORY_LABELS_AR = { DECOR_LABOR: 'عمالة الديكور', UNIFORMS: 'البدلات', TRANSPORT: 'النقل', MICROBUS: 'الميكروباص' };

export default function EventCostDetailPage() {
  const { t, lang } = useLanguage();
  const { eventId } = useParams();
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';

  const [event, setEvent] = useState(null);
  const [summary, setSummary] = useState(null);
  const [purposes, setPurposes] = useState([]);
  const [itemTemplates, setItemTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemLabel, setItemLabel] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemNotes, setItemNotes] = useState('');

  const [expandedCategory, setExpandedCategory] = useState(null);
  const [categoryEntries, setCategoryEntries] = useState({ entries: [], total: 0 });
  const [categoryPurposeFilter, setCategoryPurposeFilter] = useState('');
  const [transportSuggestions, setTransportSuggestions] = useState([]);
  const [importingSuggestion, setImportingSuggestion] = useState(null); // الاقتراح اللي بندخل سعره دلوقتي
  const [importPrice, setImportPrice] = useState('');
  const [openDates, setOpenDates] = useState(new Set()); // مفاتيحها YYYY-MM-DD — الأيام المفتوحة (مش مقفولة بصرياً) في التصنيف المفتوح دلوقتي
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryType, setEntryType] = useState('');
  const [entryPurpose, setEntryPurpose] = useState('');
  const [entryCount, setEntryCount] = useState(1);
  const [entryPrice, setEntryPrice] = useState('');
  const [entryNotes, setEntryNotes] = useState('');

  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceEvents, setCopySourceEvents] = useState([]);
  const [copySourceId, setCopySourceId] = useState('');
  const [copying, setCopying] = useState(false);

  function loadAll() {
    setLoading(true);
    Promise.all([
      api.get(`/events/${eventId}`).then(({ data }) => setEvent(data.data)),
      api.get(`/event-costs/${eventId}/summary`).then(({ data }) => setSummary(data.data)),
      api.get('/event-purposes', { params: { pageSize: 200 } }).then(({ data }) => setPurposes(data.data)),
      api.get('/event-cost-item-templates', { params: { pageSize: 200 } }).then(({ data }) => setItemTemplates(data.data)),
    ])
      .catch((err) => setError(err.response?.data?.message || t('تعذر تحميل بيانات الكشف')))
      .finally(() => setLoading(false));
  }
  useEffect(loadAll, [eventId]);

  function loadCategoryEntries(category, purposeId) {
    api.get(`/event-costs/${eventId}/entries`, { params: { category, purposeId: purposeId || undefined } }).then(({ data }) => {
      setCategoryEntries(data.data);
      // افتراضياً نخلي "أحدث يوم" مفتوح (زي اليوم اللي لسه بتشتغل عليه)، والباقي مقفول بصرياً
      const dates = [...new Set(data.data.entries.map((e) => e.date.slice(0, 10)))].sort();
      const latest = dates[dates.length - 1];
      setOpenDates(latest ? new Set([latest]) : new Set());
    });
  }

  function toggleDate(dateKey) {
    setOpenDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }

  // بيجمّع حركات التصنيف المفتوح دلوقتي حسب اليوم — كل يوم مجموعة قابلة للطي لوحدها
  function groupEntriesByDate(entries) {
    const map = new Map();
    entries.forEach((e) => {
      const key = e.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return Array.from(map.entries())
      .map(([date, list]) => ({ date, list, total: list.reduce((s, x) => s + x.total, 0) }))
      .sort((a, b) => (a.date < b.date ? 1 : -1)); // الأحدث فوق
  }

  function openCategory(category) {
    if (expandedCategory === category) {
      setExpandedCategory(null);
      return;
    }
    setExpandedCategory(category);
    setCategoryPurposeFilter('');
    loadCategoryEntries(category, '');
    if (category === 'TRANSPORT') loadTransportSuggestions();
  }

  function loadTransportSuggestions() {
    api.get(`/event-costs/${eventId}/transport-suggestions`).then(({ data }) => setTransportSuggestions(data.data));
  }

  function openImportForm(suggestion) {
    setImportingSuggestion(suggestion);
    setImportPrice('');
  }

  async function confirmImport(e) {
    e.preventDefault();
    try {
      await api.post(`/event-costs/${eventId}/entries`, {
        category: 'TRANSPORT',
        date: importingSuggestion.date.slice(0, 10),
        typeLabel: importingSuggestion.typeLabel,
        count: importingSuggestion.count || 1,
        unitPrice: Number(importPrice),
        sourceType: importingSuggestion.sourceType,
        sourceId: importingSuggestion.sourceId,
        sourceVehicleIndex: importingSuggestion.sourceVehicleIndex,
      });
      setImportingSuggestion(null);
      loadCategoryEntries('TRANSPORT', categoryPurposeFilter);
      loadTransportSuggestions();
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحفظ'));
    }
  }

  function openItemForm(item) {
    setEditingItem(item || null);
    setItemLabel(item?.label || '');
    setItemAmount(item?.amount ?? '');
    setItemNotes(item?.notes || '');
    setShowItemForm(true);
  }

  async function saveItem(e) {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/event-costs/items/${editingItem.id}`, { label: itemLabel, amount: Number(itemAmount), notes: itemNotes });
      } else {
        await api.post(`/event-costs/${eventId}/items`, { label: itemLabel, amount: Number(itemAmount), notes: itemNotes });
      }
      setShowItemForm(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحفظ'));
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`${t('متأكد إنك عايز تحذف بند')} "${item.label}"؟`)) return;
    try {
      await api.delete(`/event-costs/items/${item.id}`);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحذف'));
    }
  }

  function openEntryForm(entry) {
    setEditingEntry(entry || null);
    setEntryDate(entry ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEntryType(entry?.typeLabel || '');
    setEntryPurpose(entry?.purposeId || '');
    setEntryCount(entry?.count ?? 1);
    setEntryPrice(entry?.unitPrice ?? '');
    setEntryNotes(entry?.notes || '');
    setShowEntryForm(true);
  }

  async function saveEntry(e) {
    e.preventDefault();
    try {
      const body = { date: entryDate, typeLabel: entryType, purposeId: entryPurpose || null, count: Number(entryCount), unitPrice: Number(entryPrice), notes: entryNotes };
      if (editingEntry) {
        await api.put(`/event-costs/entries/${editingEntry.id}`, body);
      } else {
        await api.post(`/event-costs/${eventId}/entries`, { ...body, category: expandedCategory });
      }
      setShowEntryForm(false);
      loadCategoryEntries(expandedCategory, categoryPurposeFilter);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحفظ'));
    }
  }

  async function deleteEntry(entry) {
    if (!window.confirm(`${t('متأكد إنك عايز تحذف الحركة دي')}؟`)) return;
    try {
      await api.delete(`/event-costs/entries/${entry.id}`);
      loadCategoryEntries(expandedCategory, categoryPurposeFilter);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحذف'));
    }
  }

  async function saveBudget() {
    try {
      await api.put(`/events/${eventId}`, { expectedBudget: budgetDraft === '' ? null : Number(budgetDraft) });
      setShowBudgetEdit(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحفظ'));
    }
  }

  async function openCopyModal() {
    const { data } = await api.get('/events', { params: { pageSize: 100 } });
    setCopySourceEvents(data.data.filter((e) => e.id !== eventId));
    setCopySourceId('');
    setShowCopyModal(true);
  }

  async function handleCopy() {
    if (!copySourceId) return;
    setCopying(true);
    try {
      const { data } = await api.post(`/event-costs/${eventId}/copy-from/${copySourceId}`);
      alert(data.message);
      setShowCopyModal(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر النسخ'));
    } finally {
      setCopying(false);
    }
  }

  function exportPdf() {
    if (!summary || !event) return;
    const categoryRows = summary.categoryTotals.map((c) => `<tr><td><b>${esc(t(c.label))}</b></td><td><b>${c.total.toLocaleString()}</b></td><td>—</td></tr>`).join('');
    const itemRows = summary.costItems.map((i) => `<tr><td>${esc(i.label)}</td><td>${i.amount.toLocaleString()}</td><td>${esc(i.notes || '—')}</td></tr>`).join('');
    downloadPdf(
      `كشف حسابات — ${event.name}`,
      `
      <div class="meta">
        <div><b>الحفلة:</b> ${esc(event.name)}</div>
        <div><b>رقم الحفلة:</b> ${esc(event.number)}</div>
        <div><b>العميل:</b> ${esc(event.client?.name || '—')}</div>
        <div><b>تاريخ الحفلة:</b> ${new Date(event.startDate).toLocaleDateString('ar-EG')}</div>
        <div><b>تاريخ الكشف:</b> ${new Date().toLocaleString('ar-EG')}</div>
      </div>
      <table><thead><tr><th>البند</th><th>المبلغ</th><th>ملاحظات</th></tr></thead><tbody>${categoryRows}${itemRows}
        <tr style="font-weight:bold; background:#f3f4f6;"><td>الإجمالي الكلي</td><td>${summary.grandTotal.toLocaleString()}</td><td></td></tr>
      </tbody></table>`,
      {
        docNumber: event.number,
        clientLogoUrl: event.client?.logoUrl ? getAssetUrl(event.client.logoUrl) : undefined,
        eventLogoUrl: event.logoUrl ? getAssetUrl(event.logoUrl) : undefined,
        clientName: event.client?.name,
        filename: `كشف-حسابات-${event.name}.pdf`,
      }
    );
  }

  function exportCategoryPdf() {
    if (!expandedCategory || !event) return;
    const rows = categoryEntries.entries
      .map((e) => `<tr><td>${new Date(e.date).toLocaleDateString('ar-EG')}</td><td>${esc(e.typeLabel)}</td><td>${esc(e.purpose?.name || '—')}</td><td>${e.count}</td><td>${e.unitPrice.toLocaleString()}</td><td>${e.total.toLocaleString()}</td></tr>`)
      .join('');
    downloadPdf(
      `${t(CATEGORY_LABELS_AR[expandedCategory])} — ${event.name}`,
      `
      <div class="meta">
        <div><b>الحفلة:</b> ${esc(event.name)}</div>
        <div><b>العميل:</b> ${esc(event.client?.name || '—')}</div>
        <div><b>تاريخ الكشف:</b> ${new Date().toLocaleString('ar-EG')}</div>
      </div>
      <table><thead><tr><th>التاريخ</th><th>النوع</th><th>الغرض</th><th>العدد</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${rows}
        <tr style="font-weight:bold; background:#f3f4f6;"><td colspan="5">الإجمالي</td><td>${categoryEntries.total.toLocaleString()}</td></tr>
      </tbody></table>`,
      {
        docNumber: event.number,
        clientLogoUrl: event.client?.logoUrl ? getAssetUrl(event.client.logoUrl) : undefined,
        eventLogoUrl: event.logoUrl ? getAssetUrl(event.logoUrl) : undefined,
        clientName: event.client?.name,
        filename: `${CATEGORY_LABELS_AR[expandedCategory]}-${event.name}.pdf`,
      }
    );
  }

  if (loading) return <div className="p-10 text-center text-gray-600">{t('جاري التحميل...')}</div>;
  if (error) return <div className="p-10 text-center text-rose-600">{error}</div>;
  if (!event || !summary) return null;

  return (
    <>
      <PageHeader
        title={`${t('كشف حسابات')} — ${event.name}`}
        subtitle={`${event.number} · ${new Date(event.startDate).toLocaleDateString(locale)}`}
        action={
          <div className="flex gap-2">
            <Link to="/accounts" className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('كل الحفلات')}</Link>
            <button onClick={openCopyModal} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('نسخ من حفلة تانية')}</button>
            <button onClick={exportPdf} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('تحميل PDF')}</button>
            <button onClick={() => downloadFile(`/event-costs/${eventId}/export.xlsx`, `كشف-حسابات-${event.name}.xlsx`)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">{t('تصدير Excel')}</button>
          </div>
        }
      />
      <div className="p-7">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="font-extrabold text-sm">{t('الميزانية المتوقعة مقابل المصروف الفعلي')}</div>
            <button onClick={() => { setBudgetDraft(summary.expectedBudget ?? ''); setShowBudgetEdit(true); }} className="text-blue-600 text-xs font-bold hover:underline">
              {t('تعديل الميزانية')}
            </button>
          </div>
          {summary.expectedBudget != null ? (
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span>{t('المصروف')}: <b>{summary.grandTotal.toLocaleString()}</b></span>
                <span>{t('الميزانية')}: <b>{summary.expectedBudget.toLocaleString()}</b></span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${summary.grandTotal > summary.expectedBudget ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min((summary.grandTotal / summary.expectedBudget) * 100, 100)}%` }}
                />
              </div>
              <div className={`text-xs font-bold mt-1.5 ${summary.budgetDiff < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {summary.budgetDiff < 0
                  ? `${t('فوق الميزانية بـ')} ${Math.abs(summary.budgetDiff).toLocaleString()}`
                  : `${t('لسه تحت الميزانية بـ')} ${summary.budgetDiff.toLocaleString()}`}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">{t('مفيش ميزانية متوقعة متحددة لسه — دوس "تعديل الميزانية" عشان تحددها')}</div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto mb-5">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="font-extrabold text-sm">{t('الكشف')}</div>
            <button onClick={() => openItemForm(null)} className="text-blue-600 text-xs font-bold hover:underline">+ {t('إضافة بند')}</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('البند')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المبلغ')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('ملاحظات')}</th>
                <th className="text-right px-4 py-3 font-bold w-32">{t('إجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.categoryTotals.map((cat) => (
                <tr key={cat.category} className="border-t border-gray-100 bg-blue-50/30">
                  <td className="px-4 py-3 font-bold text-blue-800">{t(cat.label)} <span className="text-[10px] text-gray-500 font-normal">({t('سجل متراكم')})</span></td>
                  <td className="px-4 py-3 font-extrabold text-blue-800">{cat.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">—</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openCategory(cat.category)} className="text-blue-600 text-xs font-bold hover:underline">
                      {expandedCategory === cat.category ? t('إخفاء التفاصيل') : t('عرض التفاصيل اليومية')}
                    </button>
                  </td>
                </tr>
              ))}
              {summary.costItems.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-bold">{item.label}</td>
                  <td className="px-4 py-3 font-extrabold">{item.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{item.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => openItemForm(item)} className="text-blue-600 text-xs font-bold hover:underline">{t('تعديل')}</button>
                      <button onClick={() => deleteItem(item)} className="text-rose-600 text-xs font-bold hover:underline">{t('حذف')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="px-4 py-3 font-extrabold">{t('الإجمالي الكلي')}</td>
                <td className="px-4 py-3 font-extrabold text-lg">{summary.grandTotal.toLocaleString()}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {expandedCategory && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="font-extrabold text-sm">{t(CATEGORY_LABELS_AR[expandedCategory])} — {t('التفاصيل اليومية')}</div>
              <div className="flex items-center gap-2">
                <select
                  value={categoryPurposeFilter}
                  onChange={(e) => { setCategoryPurposeFilter(e.target.value); loadCategoryEntries(expandedCategory, e.target.value); }}
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                >
                  <option value="">{t('كل الأغراض')}</option>
                  {purposes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={exportCategoryPdf} className="border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:border-gray-300 transition">{t('PDF')}</button>
                <button
                  onClick={() => downloadFile(`/event-costs/${eventId}/entries/export.xlsx?category=${expandedCategory}${categoryPurposeFilter ? `&purposeId=${categoryPurposeFilter}` : ''}`, `${t(CATEGORY_LABELS_AR[expandedCategory])}-${event.name}.xlsx`)}
                  className="border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:border-gray-300 transition"
                >
                  {t('Excel')}
                </button>
                <button onClick={() => openEntryForm(null)} className="text-blue-600 text-xs font-bold hover:underline">+ {t('إضافة حركة')}</button>
              </div>
            </div>

            {expandedCategory === 'TRANSPORT' && transportSuggestions.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <div className="font-bold text-xs text-amber-800 mb-2.5">
                  {t('سيارات نقل مسجّلة في أذون الحفلة دي — استوردها وحط سعرها بس')} ({transportSuggestions.length})
                </div>
                <div className="space-y-1.5">
                  {transportSuggestions.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-xs">
                      <div>
                        <span className="font-bold">{s.typeLabel}</span>
                        {s.count > 1 && <span className="text-blue-600 font-bold"> ×{s.count}</span>}
                        <span className="text-gray-500"> — {s.sourceLabel} · {new Date(s.date).toLocaleDateString(locale)}</span>
                      </div>
                      <button onClick={() => openImportForm(s)} className="text-blue-600 font-bold hover:underline">{t('استيراد')}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {groupEntriesByDate(categoryEntries.entries).map((group) => {
              const isOpen = openDates.has(group.date);
              return (
                <div key={group.date} className="border border-gray-200 rounded-xl mb-2.5 overflow-hidden">
                  <button
                    onClick={() => toggleDate(group.date)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>◀</span>
                      <span className="font-bold">{new Date(group.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                      <span className="text-xs text-gray-500">({group.list.length} {t('حركة')})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold">{group.total.toLocaleString()}</span>
                      {isOpen && (
                        <span
                          onClick={(e) => { e.stopPropagation(); toggleDate(group.date); }}
                          className="text-[11px] text-blue-600 font-bold hover:underline"
                        >
                          {t('قفل اليوم')}
                        </span>
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white text-gray-500 text-[11px] border-t border-gray-100">
                          <th className="text-right px-3 py-1.5 font-bold">{t('النوع')}</th>
                          <th className="text-right px-3 py-1.5 font-bold">{t('الغرض')}</th>
                          <th className="text-right px-3 py-1.5 font-bold">{t('العدد')}</th>
                          <th className="text-right px-3 py-1.5 font-bold">{t('السعر اليومي')}</th>
                          <th className="text-right px-3 py-1.5 font-bold">{t('الإجمالي')}</th>
                          <th className="text-right px-3 py-1.5 font-bold w-28">{t('إجراءات')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.list.map((entry) => (
                          <tr key={entry.id} className="border-t border-gray-50">
                            <td className="px-3 py-2 font-bold">
                              {entry.typeLabel}
                              {entry.sourceType && <span className="mr-1.5 text-[10px] text-blue-600 font-normal">({t('تلقائي من إذن')})</span>}
                            </td>
                            <td className="px-3 py-2 text-xs">{entry.purpose?.name || '—'}</td>
                            <td className="px-3 py-2">{entry.count}</td>
                            <td className="px-3 py-2">{entry.unitPrice.toLocaleString()}</td>
                            <td className="px-3 py-2 font-extrabold">{entry.total.toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <div className="flex gap-2.5">
                                <button onClick={() => openEntryForm(entry)} className="text-blue-600 text-xs font-bold hover:underline">{t('تعديل')}</button>
                                <button onClick={() => deleteEntry(entry)} className="text-rose-600 text-xs font-bold hover:underline">{t('حذف')}</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>
              );
            })}
            {categoryEntries.entries.length === 0 && <div className="text-center py-6 text-gray-600 text-xs">{t('لا توجد حركات مسجّلة بعد')}</div>}
            {categoryEntries.entries.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border-t-2 border-gray-200 font-extrabold text-sm mt-2">
                <span>{t('إجمالي')} {t(CATEGORY_LABELS_AR[expandedCategory])}</span>
                <span>{categoryEntries.total.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {showItemForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={saveItem} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5 shadow-xl">
            <h3 className="font-extrabold text-lg">{editingItem ? t('تعديل بند') : t('إضافة بند جديد')}</h3>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('اسم البند')}</label>
              <input required list="item-template-suggestions" value={itemLabel} onChange={(e) => setItemLabel(e.target.value)} placeholder={t('اكتب أو اختار من المقترحات')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <datalist id="item-template-suggestions">
                {itemTemplates.map((tpl) => <option key={tpl.id} value={tpl.name} />)}
              </datalist>
              <Link to="/event-cost-item-templates" className="text-[11px] text-blue-600 hover:underline mt-1 inline-block">{t('إدارة قايمة الأسماء الشائعة')}</Link>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('المبلغ')}</label>
              <input required type="number" min={0} value={itemAmount} onChange={(e) => setItemAmount(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('ملاحظات (اختياري)')}</label>
              <textarea value={itemNotes} onChange={(e) => setItemNotes(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition">{t('حفظ')}</button>
              <button type="button" onClick={() => setShowItemForm(false)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}

      {showEntryForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={saveEntry} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5 shadow-xl">
            <h3 className="font-extrabold text-lg">{editingEntry ? t('تعديل حركة') : t('إضافة حركة جديدة')} — {t(CATEGORY_LABELS_AR[expandedCategory])}</h3>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('التاريخ')}</label>
              <input required type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('النوع (المهنة أو نوع السيارة)')}</label>
              <input required value={entryType} onChange={(e) => setEntryType(e.target.value)} placeholder={t('مثال: نجار')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('الغرض (اختياري)')}</label>
              <select value={entryPurpose} onChange={(e) => setEntryPurpose(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('بدون تحديد')}</option>
                {purposes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">{t('العدد')}</label>
                <input required type="number" min={1} value={entryCount} onChange={(e) => setEntryCount(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">{t('السعر اليومي')}</label>
                <input required type="number" min={0} value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              {t('الإجمالي')}: <b>{((Number(entryCount) || 0) * (Number(entryPrice) || 0)).toLocaleString()}</b>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('ملاحظات (اختياري)')}</label>
              <textarea value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition">{t('حفظ')}</button>
              <button type="button" onClick={() => setShowEntryForm(false)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}

      {showBudgetEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" >
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3.5 shadow-xl">
            <h3 className="font-extrabold text-lg">{t('تعديل الميزانية المتوقعة')}</h3>
            <input type="number" min={0} value={budgetDraft} onChange={(e) => setBudgetDraft(e.target.value)} placeholder={t('اسيبها فاضية لو مفيش ميزانية محددة')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" autoFocus />
            <div className="flex gap-2 pt-2">
              <button onClick={saveBudget} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition">{t('حفظ')}</button>
              <button onClick={() => setShowBudgetEdit(false)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </div>
        </div>
      )}

      {showCopyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => !copying && setShowCopyModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5 shadow-xl">
            <h3 className="font-extrabold text-lg">{t('نسخ كشف من حفلة سابقة')}</h3>
            <p className="text-xs text-gray-600">{t('هيتنسخ كل بنود وحركات الحفلة اللي هتختارها هنا فوق الكشف الحالي (مش بيمسح اللي موجود، بيضيف عليه)')}</p>
            <select value={copySourceId} onChange={(e) => setCopySourceId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">{t('اختار حفلة')}</option>
              {copySourceEvents.map((ev) => <option key={ev.id} value={ev.id}>{ev.name} ({ev.number})</option>)}
            </select>
            <div className="flex gap-2 pt-2">
              <button onClick={handleCopy} disabled={!copySourceId || copying} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition">
                {copying ? t('جاري النسخ...') : t('نسخ')}
              </button>
              <button onClick={() => setShowCopyModal(false)} disabled={copying} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </div>
        </div>
      )}
      {importingSuggestion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={confirmImport} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3.5 shadow-xl">
            <h3 className="font-extrabold text-lg">{t('سعر السيارة')}</h3>
            <div className="text-sm bg-gray-50 rounded-lg px-3 py-2">
              <div className="font-bold flex items-center justify-between">
                <span>{importingSuggestion.typeLabel}</span>
                {importingSuggestion.count > 1 && <span className="text-blue-600">×{importingSuggestion.count}</span>}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">{importingSuggestion.sourceLabel} · {new Date(importingSuggestion.date).toLocaleDateString(locale)}</div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">
                {importingSuggestion.count > 1 ? t('سعر السيارة الواحدة') : t('السعر')}
              </label>
              <input required autoFocus type="number" min={0} value={importPrice} onChange={(e) => setImportPrice(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              {importingSuggestion.count > 1 && Number(importPrice) > 0 && (
                <div className="text-xs text-gray-500 mt-1">{t('الإجمالي')}: {(Number(importPrice) * importingSuggestion.count).toLocaleString()} {t('جنيه')}</div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition">{t('استيراد')}</button>
              <button type="button" onClick={() => setImportingSuggestion(null)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
