import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { resolveActivityLink } from '../utils/activityLink';
import { useLanguage } from '../context/LanguageContext';

const LAST_SEEN_KEY = 'ug_erp_notifications_last_seen';

const ACTION_LABELS = {
  CREATE: 'إضافة', UPDATE: 'تعديل', DELETE: 'حذف', ISSUE: 'صرف',
  RETURN: 'مرتجع', LOSS: 'فاقد', TRANSFER: 'نقل', STOCK_COUNT: 'جرد', LOGIN: 'دخول',
};

function timeAgo(dateStr, t, locale) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('الآن');
  if (mins < 60) return `${t('منذ')} ${mins} ${t('دقيقة')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${t('منذ')} ${hours} ${t('ساعة')}`;
  return new Date(dateStr).toLocaleDateString(locale);
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(() => localStorage.getItem(LAST_SEEN_KEY) || new Date(0).toISOString());
  const ref = useRef(null);

  function load() {
    api.get('/notifications').then(({ data }) => setLogs(data.data)).catch(() => {});
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // تحديث تلقائي كل 30 ثانية
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = logs.filter((l) => new Date(l.createdAt) > new Date(lastSeen)).length;

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SEEN_KEY, now);
      setLastSeen(now);
    }
  }

  function handleLogClick(log) {
    const link = resolveActivityLink(log);
    if (link) {
      navigate(link);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggleOpen} className="relative p-2 rounded-full hover:bg-gray-100 transition" aria-label={t('الإشعارات')}>
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -left-0.5 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-glow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* خلفية شفافة تقفل النافذة لو دست برّاها — بتحل مشكلة تراكب النافذة
              فوق باقي الصفحة على الموبايل، وبتخليها تحس إنها "نافذة" منظمة */}
          <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed md:absolute inset-x-3 md:inset-x-auto top-16 md:top-auto left-0 md:mt-2 md:w-80 max-w-full md:max-w-[90vw] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadein">
          <div className="px-4 py-3 border-b border-gray-100 font-extrabold text-sm">{t('آخر التحديثات')}</div>
          <div className="max-h-96 overflow-y-auto">
            {logs.map((l) => {
              const clickable = !!resolveActivityLink(l);
              return (
                <div
                  key={l.id}
                  onClick={() => handleLogClick(l)}
                  className={`px-4 py-2.5 border-b border-gray-50 last:border-0 flex gap-2 items-start ${clickable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                >
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap mt-0.5">{t(ACTION_LABELS[l.action] || l.action)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-800 leading-snug">{l.description}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">{l.user?.fullName} · {timeAgo(l.createdAt, t, locale)}</div>
                  </div>
                </div>
              );
            })}
            {logs.length === 0 && <div className="text-center py-8 text-gray-600 text-xs">{t('مفيش تحديثات لسه')}</div>}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
