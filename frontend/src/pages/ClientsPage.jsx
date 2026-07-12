import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { getAssetUrl } from '../utils/assetUrl';
import { useLanguage } from '../context/LanguageContext';

const EMPTY_FORM = { name: '', phone: '', company: '', logoUrl: '' };

export default function ClientsPage() {
  const { t } = useLanguage();
  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get('/clients', { params: { page, pageSize: 20 } }).then(({ data }) => {
      setClients(data.data);
      setMeta(data.meta);
    });
  }
  useEffect(load, [page]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(client) {
    setEditingId(client.id);
    setForm({ name: client.name, phone: client.phone || '', company: client.company || '', logoUrl: client.logoUrl || '' });
    setShowForm(true);
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, logoUrl: data.data.url }));
    } catch (err) {
      setError(err.response?.data?.message || t('تعذر رفع الصورة'));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/clients/${editingId}`, form);
      } else {
        await api.post('/clients', form);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ'));
    }
  }

  async function handleDelete(client) {
    if (!window.confirm(`${t('متأكد إنك عايز تحذف العميل')} "${client.name}"؟`)) return;
    try {
      await api.delete(`/clients/${client.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحذف — قد يكون العميل مرتبط بحفلات موجودة'));
    }
  }

  return (
    <>
      <PageHeader
        title={t('العملاء')}
        subtitle={`${meta.total} ${t('عميل')}`}
        action={<button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">+ {t('عميل جديد')}</button>}
      />
      <div className="p-7">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('الاسم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الهاتف')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الشركة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('اللوجو')}</th>
                <th className="text-right px-4 py-3 font-bold w-28">{t('إجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50/60 transition">
                  <td className="px-4 py-3 font-bold">
                    <Link to={`/clients/${c.id}`} className="hover:text-blue-600 transition">{c.name}</Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.phone || '—'}</td>
                  <td className="px-4 py-3">{c.company || '—'}</td>
                  <td className="px-4 py-3">
                    {c.logoUrl ? <img src={getAssetUrl(c.logoUrl)} alt="logo" className="h-6" onError={(e) => (e.target.style.display = 'none')} /> : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(c)} className="text-blue-600 text-xs font-bold hover:underline">{t('تعديل')}</button>
                      <button onClick={() => handleDelete(c)} className="text-rose-600 text-xs font-bold hover:underline">{t('حذف')}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-600">{t('لا يوجد عملاء بعد')}</td></tr>}
            </tbody>
          </table>
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10 px-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5 shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg mb-2">{editingId ? t('تعديل بيانات العميل') : t('عميل جديد')}</h3>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}
            <input required placeholder={t('اسم العميل')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder={t('رقم الهاتف')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input placeholder={t('اسم الشركة')} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('لوجو العميل (اختياري)')}</label>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2" />
              <div className="text-[11px] text-gray-600 mt-1">{t('هيظهر تلقائياً جنب لوجو UG في كل إذن صرف/مرتجع لحفلات العميل ده')}</div>
              {uploading && <div className="text-xs text-blue-600 mt-1">{t('جاري الرفع...')}</div>}
              {form.logoUrl && !uploading && (
                <img src={getAssetUrl(form.logoUrl)} alt="preview" className="h-12 mt-2 rounded border border-gray-100 p-1" />
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition">{editingId ? t('حفظ التعديلات') : t('حفظ')}</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
