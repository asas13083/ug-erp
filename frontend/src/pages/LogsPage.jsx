import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';

export default function LogsPage() {
  const { t } = useLanguage();
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get('/logs/errors').then(({ data }) => setLines(data.data)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  return (
    <>
      <PageHeader
        title={t('سجل الأخطاء')}
        subtitle={t('آخر 100 خطأ حقيقي حصل في السيرفر — لو حصلت مشكلة، هتلاقي تفاصيلها هنا من غير ما تحتاج تدخل السيرفر')}
        action={<button onClick={load} className="border border-gray-200 hover:border-gray-300 text-sm font-bold px-4 py-2 rounded-lg transition">{t('تحديث')}</button>}
      />
      <div className="p-7">
        {loading && <div className="text-center py-10 text-gray-600 text-sm">{t('جاري التحميل...')}</div>}
        {!loading && lines.length === 0 && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-5 text-sm text-center">
            {t('مفيش أي أخطاء مسجّلة — كل حاجة شغّالة تمام')} ✓
          </div>
        )}
        {!loading && lines.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-4 overflow-x-auto">
            <div className="font-mono text-xs text-gray-200 space-y-2" dir="ltr">
              {lines.map((line, idx) => (
                <div key={idx} className="border-b border-gray-700 pb-2 whitespace-pre-wrap break-all">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
