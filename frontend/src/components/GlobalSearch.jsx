import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';

const CATEGORY_LABELS = {
  items: 'أصناف',
  events: 'حفلات',
  clients: 'عملاء',
  suppliers: 'موردين',
  warehouses: 'مخازن',
  issueVouchers: 'أذون صرف',
  returnVouchers: 'أذون مرتجع',
};

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [q, setQ] = useState('');
  const [results, setResults] = useState({});
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults({});
      return;
    }
    const t = setTimeout(() => {
      api.get('/search', { params: { q } }).then(({ data }) => {
        setResults(data.data);
        setOpen(true);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  function goTo(link) {
    navigate(link);
    setOpen(false);
    setQ('');
  }

  const hasResults = Object.values(results).some((arr) => arr && arr.length > 0);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim().length >= 2 && setOpen(true)}
          placeholder={t('بحث شامل...')}
          className="w-48 sm:w-64 border border-gray-200 rounded-full pr-9 pl-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
        />
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 mt-2 w-80 max-w-[90vw] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-modalpop">
          <div className="max-h-96 overflow-y-auto">
            {!hasResults && <div className="text-center py-8 text-gray-600 text-xs">{t('لا توجد نتائج مطابقة')}</div>}
            {Object.entries(results).map(([category, items]) => {
              if (!items || items.length === 0) return null;
              return (
                <div key={category}>
                  <div className="px-4 py-1.5 bg-gray-50 text-[11px] font-bold text-gray-600">{t(CATEGORY_LABELS[category] || category)}</div>
                  {items.map((r) => (
                    <div key={r.id} onClick={() => goTo(r.link)} className="px-4 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50">
                      <div className="text-sm font-bold">{r.title}</div>
                      {r.subtitle && <div className="text-[11px] text-gray-600">{r.subtitle}</div>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
