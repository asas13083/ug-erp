import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * مكوّن اختيار صنف بالبحث المباشر — بديل لـ <select> العادي.
 * props:
 *  - stockItems: [{ item: {id,name,code,unit,categoryId}, quantity, reservedQty }]
 *  - categories: [{id,name}]
 *  - value: itemId المختار حالياً
 *  - onChange(itemId)
 */
export default function ItemPicker({ stockItems, categories = [], value, onChange, placeholder }) {
  const { t } = useLanguage();
  const finalPlaceholder = placeholder || t('اختر صنف...');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  const selected = stockItems.find((s) => s.item.id === value);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = stockItems.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || s.item.name.toLowerCase().includes(q) || (s.item.code || '').toLowerCase().includes(q);
    const matchesCategory = !categoryFilter || s.item.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  function pick(itemId) {
    onChange(itemId);
    setOpen(false);
    setSearch('');
  }

  return (
    <div className="relative flex-1" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right bg-white flex items-center justify-between gap-2"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-600'}>
          {selected ? `${selected.item.name} (${t('متاح')}: ${selected.quantity - selected.reservedQty})` : finalPlaceholder}
        </span>
        <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 space-y-1.5">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('ابحث بالاسم أو الكود...')}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm"
            />
            {categories.length > 0 && (
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs">
                <option value="">{t('كل التصنيفات')}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.map((s) => (
              <button
                type="button"
                key={s.item.id}
                onClick={() => pick(s.item.id)}
                className="w-full text-right px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2"
              >
                <span>{s.item.name}</span>
                <span className="text-xs text-gray-600">{t('متاح')}: {s.quantity - s.reservedQty} {s.item.unit}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="text-center py-6 text-gray-600 text-xs">لا توجد نتائج مطابقة</div>}
          </div>
        </div>
      )}
    </div>
  );
}
