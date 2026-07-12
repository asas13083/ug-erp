import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';

export default function CompanySettingsPage() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ companyName: '', phone: '', address: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/company-settings').then(({ data }) => setForm(data.data));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.put('/company-settings', form);
      setSuccess(t('تم حفظ إعدادات الشركة بنجاح'));
    } catch (err) {
      setError(err.response?.data?.message || t('تعذر حفظ الإعدادات'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title={t('إعدادات الشركة')} subtitle={t('بيانات عامة تظهر في التقارير والمستندات')} />
      <div className="p-7 max-w-lg">
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}
          {success && <div className="text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 text-sm">{success}</div>}

          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">{t('اسم الشركة')}</label>
            <input value={form.companyName || ''} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">{t('رقم الهاتف')}</label>
            <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">{t('العنوان')}</label>
            <textarea value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">{t('الإيميل الرسمي')}</label>
            <input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm w-full transition">
            {submitting ? t('جاري الحفظ...') : t('حفظ الإعدادات')}
          </button>
        </form>
      </div>
    </>
  );
}
