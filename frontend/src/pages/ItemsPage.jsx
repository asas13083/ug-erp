import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { getAssetUrl } from '../utils/assetUrl';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { useLanguage } from '../context/LanguageContext';

const EMPTY_FORM = { name: '', categoryId: '', unit: 'قطعة', minQuantity: 0, initialWarehouseId: '', initialQuantity: 0, imageUrl: '' };

export default function ItemsPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lossItem, setLossItem] = useState(null);
  const [lossWarehouseId, setLossWarehouseId] = useState('');
  const [lossQuantity, setLossQuantity] = useState(1);
  const [lossReason, setLossReason] = useState('DAMAGED');
  const [lossDescription, setLossDescription] = useState('');
  const [lossError, setLossError] = useState('');
  const [lossSubmitting, setLossSubmitting] = useState(false);
  const [openEventsDropdown, setOpenEventsDropdown] = useState(null);

  async function handleItemImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, imageUrl: data.data.url }));
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر رفع الصورة'));
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/items/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult(data.data);
      loadItems();
    } catch (err) {
      setImportResult({ created: 0, errors: [err.response?.data?.message || t('تعذر استيراد الملف')] });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  async function loadItems() {
    const { data } = await api.get('/items', { params: { q, page, pageSize: 20 } });
    setItems(data.data);
    setMeta(data.meta);
  }

  useEffect(() => {
    api.get('/categories', { params: { pageSize: 200 } }).then(({ data }) => setCategories(data.data));
    api.get('/warehouses', { params: { pageSize: 200 } }).then(({ data }) => setWarehouses(data.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadItems, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      categoryId: item.categoryId,
      unit: item.unit,
      minQuantity: item.minQuantity,
      initialWarehouseId: '',
      initialQuantity: 0,
      imageUrl: item.imageUrl || '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/items/${editingId}`, {
          name: form.name,
          categoryId: form.categoryId,
          unit: form.unit,
          minQuantity: Number(form.minQuantity),
          imageUrl: form.imageUrl,
        });
      } else {
        const { data } = await api.post('/items', form);
        if (data.merged) {
          alert(data.message);
        }
      }
      setShowForm(false);
      loadItems();
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ أثناء الحفظ'));
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`${t('متأكد إنك عايز تحذف صنف')} "${item.name}"؟`)) return;
    try {
      await api.delete(`/items/${item.id}`);
      loadItems();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحذف'));
    }
  }

  async function handleExportPdf() {
    const { data } = await api.get('/items', { params: { q, pageSize: 1000 } });
    const rows = data.data
      .map(
        (i) => {
          const sourceText = i.stillOutSources?.length > 0
            ? i.stillOutSources.map((src) => `${src.type === 'warehouse' ? 'من مخزن' : 'نقل عهدة من حفلة'} ${src.name} ×${src.quantity}`).join('، ')
            : '—';
          return `<tr><td>${esc(i.code)}</td><td>${esc(i.name)}</td><td>${esc(i.category?.name || '—')}</td><td>${esc(sourceText)}</td><td>${i.totalQuantity}</td><td>${i.availableQuantity}</td><td>${i.stillOut || 0}</td><td>${i.lost || 0}</td><td>${i.availableQuantity + (i.stillOut || 0) + (i.lost || 0)}</td><td>${i.minQuantity}</td></tr>`;
        }
      )
      .join('');
    downloadPdf(
      'تقرير الأصناف',
      `<table><thead><tr><th>الكود</th><th>الصنف</th><th>التصنيف</th><th>المصدر</th><th>الموجود حالياً</th><th>المتاح</th><th>لسه برا</th><th>الفاقد</th><th>إجمالي كمية الصنف</th><th>الحد الأدنى</th></tr></thead><tbody>${rows}</tbody></table>`,
      { filename: 'تقرير-الأصناف.pdf' }
    );
  }

  function openLoss(item) {
    setLossItem(item);
    setLossWarehouseId('');
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
        itemId: lossItem.id,
        warehouseId: lossWarehouseId || undefined,
        quantity: Number(lossQuantity),
        reason: lossReason,
        description: lossDescription,
      });
      setLossItem(null);
      loadItems();
    } catch (err) {
      setLossError(err.response?.data?.message || t('تعذر تسجيل الفاقد'));
    } finally {
      setLossSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t('الأصناف')}
        subtitle={`${meta.total} ${t('صنف')}`}
        action={
          <div className="flex items-center gap-2">
            <button onClick={handleExportPdf} className="border border-gray-200 hover:border-gray-300 text-sm font-bold px-4 py-2 rounded-lg transition">{t('تحميل PDF')}</button>
            <button onClick={() => downloadFile('/reports/stock.xlsx', 'تقرير-الأصناف.xlsx')} className="border border-gray-200 hover:border-gray-300 text-sm font-bold px-4 py-2 rounded-lg transition">{t('تصدير Excel')}</button>
            <label className="border border-gray-200 hover:border-gray-300 text-sm font-bold px-4 py-2 rounded-lg transition cursor-pointer">
              {importing ? t('جاري الاستيراد...') : t('استيراد من Excel')}
              <input type="file" accept=".xlsx,.xls" onChange={handleImport} disabled={importing} className="hidden" />
            </label>
            <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">
              + {t('صنف جديد')}
            </button>
          </div>
        }
      />
      <div className="p-7">
        {importResult && (
          <div className={`rounded-lg px-4 py-3 text-sm mb-4 ${importResult.errors.length ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
            <div className="font-bold">
              {t('تم إضافة')} {importResult.created} {t('صنف بنجاح.')}
              {importResult.merged > 0 && ` ${t('و')} ${importResult.merged} ${t('صنف تاني اتدمجوا في أصناف موجودة أصلاً بنفس الاسم والتصنيف.')}`}
            </div>
            {importResult.errors.length > 0 && (
              <ul className="mt-2 list-disc pr-5 space-y-0.5">
                {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
        <div className="text-xs text-gray-600 mb-3">
          {t('ملف الاستيراد لازم يكون فيه أعمدة بالترتيب ده: اسم الصنف | التصنيف | الوحدة | الحد الأدنى | الكمية الابتدائية (اختياري) | اسم المخزن (اختياري) — والصف الأول عنوان بيتجاهله النظام.')}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('ابحث بالاسم أو الكود...')}
          className="w-72 mb-4 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
        />

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold"></th>
                <th className="text-right px-4 py-3 font-bold">{t('الكود')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الصنف')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التصنيف')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المصدر')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الموجود بالمخازن حالياً')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المتاح فعلياً')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('لسه برا')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الفاقد')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('إجمالي كمية الصنف')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('عدد الحفلات')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
                <th className="text-right px-4 py-3 font-bold w-28">{t('إجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-gray-100 hover:bg-gray-50/60 transition">
                  <td className="px-4 py-3">
                    {i.imageUrl ? (
                      <img src={getAssetUrl(i.imageUrl)} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-100" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 text-xs">—</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{i.code}</td>
                  <td className="px-4 py-3 font-bold"><Link to={`/items/${i.id}`} className="hover:text-blue-600 transition">{i.name}</Link></td>
                  <td className="px-4 py-3">{i.category?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {i.stillOutSources?.length > 0
                      ? i.stillOutSources.map((src) => `${src.type === 'warehouse' ? t('من مخزن') : t('نقل عهدة من حفلة')} ${src.name} ×${src.quantity}`).join('، ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-extrabold">{i.totalQuantity} <span className="text-gray-600 text-xs font-normal">{i.unit}</span></div>
                    {i.stockLevels && i.stockLevels.filter((s) => s.quantity > 0).length > 0 && (
                      <div className="text-[11px] text-gray-600 mt-0.5">
                        {i.stockLevels.filter((s) => s.quantity > 0).map((s) => `${s.warehouse?.name}: ${s.quantity}`).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{i.availableQuantity}</td>
                  <td className="px-4 py-3 font-bold text-amber-600">{i.stillOut || 0}</td>
                  <td className="px-4 py-3 font-bold text-rose-600">{i.lost || 0}</td>
                  <td className="px-4 py-3 font-extrabold text-gray-800">{i.availableQuantity + (i.stillOut || 0) + (i.lost || 0)}</td>
                  <td className="px-4 py-3 relative">
                    {i.eventsCount > 0 ? (
                      i.eventsCount === 1 ? (
                        <Link to={`/events/${i.pendingEvents[0].id}`} className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition">{i.eventsCount} {t('حفلة')}</Link>
                      ) : (
                        <>
                          <button
                            onClick={() => setOpenEventsDropdown(openEventsDropdown === i.id ? null : i.id)}
                            className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
                          >
                            {i.eventsCount} {t('حفلة')}
                          </button>
                          {openEventsDropdown === i.id && (
                            <div className="absolute z-20 top-full mt-1 right-0 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 min-w-[180px]">
                              {i.pendingEvents.map((ev) => (
                                <Link
                                  key={ev.id}
                                  to={`/events/${ev.id}`}
                                  className="block px-3 py-2 text-xs font-bold hover:bg-gray-50 transition truncate"
                                >
                                  {ev.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </>
                      )
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {i.hasLowStockWarehouse ? (
                      <span className="bg-rose-50 text-rose-600 text-xs font-bold px-2.5 py-1 rounded-full">{t('منخفض')}</span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-full">{t('متوفر')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(i)} className="text-blue-600 text-xs font-bold hover:underline">{t('تعديل')}</button>
                      <button onClick={() => openLoss(i)} className="text-amber-600 text-xs font-bold hover:underline">{t('تسجيل فاقد')}</button>
                      <button onClick={() => handleDelete(i)} className="text-rose-600 text-xs font-bold hover:underline">{t('حذف')}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={13} className="text-center py-10 text-gray-600">{t('لا توجد أصناف مطابقة')}</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10 px-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5 shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg mb-2">{editingId ? t('تعديل بيانات الصنف') : t('إضافة صنف جديد')}</h3>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('اسم الصنف')}</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('صورة الصنف (اختياري)')}</label>
              <div className="flex items-center gap-3">
                {form.imageUrl && <img src={getAssetUrl(form.imageUrl)} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />}
                <label className="border border-gray-200 hover:border-gray-300 text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer">
                  {uploadingImage ? t('جاري الرفع...') : form.imageUrl ? t('تغيير الصورة') : t('رفع صورة')}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleItemImageUpload} disabled={uploadingImage} className="hidden" />
                </label>
                {form.imageUrl && (
                  <button type="button" onClick={() => setForm({ ...form, imageUrl: '' })} className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-2 transition">
                    {t('حذف الصورة')}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">{t('التصنيف')}</label>
                <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">{t('اختر تصنيف')}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">{t('الوحدة')}</label>
                <input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('الحد الأدنى للتنبيه')}</label>
              <input type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            {!editingId && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">{t('المخزن (اختياري)')}</label>
                  <select value={form.initialWarehouseId} onChange={(e) => setForm({ ...form, initialWarehouseId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="">{t('بدون كمية ابتدائية')}</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-gray-600">{t('الكمية الابتدائية')}</label>
                  <input type="number" value={form.initialQuantity} onChange={(e) => setForm({ ...form, initialQuantity: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            {editingId && (
              <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                {t('لتعديل الكمية نفسها، استخدم "الجرد الدوري" أو "النقل بين المخازن" — التعديل هنا للبيانات الوصفية فقط.')}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition">{editingId ? t('حفظ التعديلات') : t('حفظ')}</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}

      {lossItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10 px-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleLossSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5 shadow-xl">
            <h3 className="font-extrabold text-lg mb-2">{t('تسجيل فاقد')} — {lossItem.name}</h3>
            {lossError && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{lossError}</div>}

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('المخزن (اختياري)')}</label>
              <select value={lossWarehouseId} onChange={(e) => setLossWarehouseId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('بدون مخزن — فاقد أثناء حفلة مثلاً')}</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <div className="text-[11px] text-gray-600 mt-1">{t('لو اخترت مخزن، الكمية هتتخصم من رصيده فوراً.')}</div>
            </div>
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
