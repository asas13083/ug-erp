import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { name: '', phone: '', company: '', notes: '' };

export default function SuppliersPage() {
  const { t } = useLanguage();
  const { can } = useAuth();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function load() {
    setLoading(true);
    api.get('/suppliers/with-balances')
      .then(({ data }) => setSuppliers(data.data))
      .catch((err) => setError(err.response?.data?.message || t('حصل خطأ')))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openForm(supplier = null) {
    setEditingId(supplier?.id || null);
    setForm(supplier ? { name: supplier.name, phone: supplier.phone || '', company: supplier.company || '', notes: supplier.notes || '' } : EMPTY_FORM);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('حصل خطأ'));
    }
  }

  async function handleDelete(supplier) {
    if (!confirm(t('متأكد من حذف المورد ده؟'))) return;
    try {
      await api.delete(`/suppliers/${supplier.id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('حصل خطأ'));
    }
  }

  const totalDue = suppliers.reduce((s, x) => s + x.due, 0);

  return (
    <>
      <PageHeader
        title={t('الموردين')}
        subtitle={t('كل الموردين والمستحق لكل واحد')}
        action={
          can('suppliers', 'create') && (
            <button onClick={() => openForm()} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">
              + {t('مورد جديد')}
            </button>
          )
        }
      />

      <div className="p-7 space-y-5">
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

        {totalDue > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4">
            <div className="text-xs text-gray-600 font-bold mb-1">{t('إجمالي المستحق لكل الموردين')}</div>
            <div className="text-2xl font-extrabold text-rose-600">{totalDue.toLocaleString()}</div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('المورد')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التليفون')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('إجمالي التعاملات')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المدفوع')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المستحق')}</th>
                <th className="text-right px-4 py-3 font-bold w-28">{t('إجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <Link to={`/suppliers/${s.id}`} className="font-bold text-blue-600 hover:underline">{s.name}</Link>
                    {s.company && <div className="text-[11px] text-gray-500">{s.company}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.phone || '—'}</td>
                  <td className="px-4 py-3 font-bold">{s.totalInvoiced.toLocaleString()}</td>
                  <td className="px-4 py-3 text-emerald-600">{s.totalPaid.toLocaleString()}</td>
                  <td className={`px-4 py-3 font-extrabold ${s.due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {s.due.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      {can('suppliers', 'edit') && (
                        <button onClick={() => openForm(s)} className="text-blue-600 text-xs font-bold hover:underline">{t('تعديل')}</button>
                      )}
                      {can('suppliers', 'delete') && (
                        <button onClick={() => handleDelete(s)} className="text-rose-600 text-xs font-bold hover:underline">{t('حذف')}</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && suppliers.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500 text-sm">{t('مفيش موردين لسه')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5 shadow-xl">
            <h3 className="font-extrabold text-lg">{editingId ? t('تعديل مورد') : t('مورد جديد')}</h3>

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('الاسم')}</label>
              <input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('التليفون')}</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('الشركة')}</label>
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('ملاحظات')}</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition">{t('حفظ')}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="flex-1 border border-gray-200 hover:border-gray-300 font-bold py-2.5 rounded-xl text-sm transition">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
