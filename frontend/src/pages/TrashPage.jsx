import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';

const SECTIONS = [
  { key: 'items', label: 'الأصناف', endpoint: '/items' },
  { key: 'categories', label: 'التصنيفات', endpoint: '/categories' },
  { key: 'clients', label: 'العملاء', endpoint: '/clients' },
  { key: 'warehouses', label: 'المخازن', endpoint: '/warehouses' },
];

export default function TrashPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('items');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);

  function load(sectionKey) {
    const section = SECTIONS.find((s) => s.key === sectionKey);
    setLoading(true);
    api
      .get(`${section.endpoint}/trash/list`)
      .then(({ data: res }) => setData((prev) => ({ ...prev, [sectionKey]: res.data })))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleRestore(item) {
    const section = SECTIONS.find((s) => s.key === tab);
    try {
      await api.post(`${section.endpoint}/trash/${item.id}/restore`);
      load(tab);
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الاسترجاع'));
    }
  }

  async function handlePermanentDelete(item) {
    const section = SECTIONS.find((s) => s.key === tab);
    if (!window.confirm(`${t('متأكد إنك عايز تمسح')} "${item.name}" ${t('نهائياً؟ الخطوة دي مفيهاش رجوع خالص.')}`)) return;
    try {
      await api.delete(`${section.endpoint}/trash/${item.id}/permanent`);
      load(tab);
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحذف النهائي — قد يكون العنصر مرتبط ببيانات أخرى'));
    }
  }

  const items = data[tab] || [];

  return (
    <>
      <PageHeader title={t('سلة المهملات')} subtitle={t('العناصر المحذوفة — قابلة للاسترجاع أو الحذف النهائي')} />
      <div className="p-7">
        <div className="inline-flex bg-gray-100 rounded-xl p-1 mb-5 gap-1">
          {SECTIONS.map((s) => (
            <button key={s.key} onClick={() => setTab(s.key)} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${tab === s.key ? 'bg-white shadow-sm' : 'text-gray-600'}`}>
              {t(s.label)}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {loading && <div className="p-6 text-center text-gray-600 text-sm">{t('جاري التحميل...')}</div>}
          {!loading && items.length === 0 && <div className="p-10 text-center text-gray-600 text-sm">{t('سلة المهملات فاضية في القسم ده')}</div>}
          {!loading &&
            items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0">
                <div className="flex-1">
                  <div className="text-sm font-bold">{item.name}</div>
                  <div className="text-xs text-gray-600">{t('اتمسح في')} {new Date(item.deletedAt).toLocaleString('ar-EG')}</div>
                </div>
                <button onClick={() => handleRestore(item)} className="text-emerald-600 text-xs font-bold hover:underline">{t('استرجاع')}</button>
                <button onClick={() => handlePermanentDelete(item)} className="text-rose-600 text-xs font-bold hover:underline">{t('حذف نهائي')}</button>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
