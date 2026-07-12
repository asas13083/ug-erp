import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';

const STATUS_COLORS = {
  PLANNED: 'bg-blue-100 text-blue-700 border-blue-200',
  ONGOING: 'bg-amber-100 text-amber-700 border-amber-200',
  CLOSED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
};

const WEEKDAYS = { ar: ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
const MONTH_NAMES = {
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

function toDateOnly(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function EventsCalendarPage() {
  const { t, lang } = useLanguage();
  const [cursor, setCursor] = useState(() => toDateOnly(new Date()));
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get('/events', { params: { pageSize: 300 } }).then(({ data }) => setEvents(data.data));
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  function eventsForDay(day) {
    if (!day) return [];
    const dayTime = toDateOnly(day).getTime();
    return events.filter((ev) => {
      const start = toDateOnly(ev.startDate).getTime();
      const end = toDateOnly(ev.endDate).getTime();
      return dayTime >= start && dayTime <= end;
    });
  }

  function changeMonth(delta) {
    setCursor(new Date(year, month + delta, 1));
  }

  const today = toDateOnly(new Date()).getTime();
  const weekDays = WEEKDAYS[lang];
  const monthNames = MONTH_NAMES[lang];

  return (
    <>
      <PageHeader
        title={t('تقويم الحفلات')}
        subtitle={`${monthNames[month]} ${year}`}
        action={
          <div className="flex gap-2">
            <button onClick={() => changeMonth(-1)} className="border border-gray-200 px-3 py-2 rounded-lg text-sm font-bold hover:border-gray-300 transition">‹ {t('الشهر اللي فات')}</button>
            <button onClick={() => setCursor(toDateOnly(new Date()))} className="border border-gray-200 px-3 py-2 rounded-lg text-sm font-bold hover:border-gray-300 transition">{t('النهاردة')}</button>
            <button onClick={() => changeMonth(1)} className="border border-gray-200 px-3 py-2 rounded-lg text-sm font-bold hover:border-gray-300 transition">{t('الشهر الجاي')} ›</button>
          </div>
        }
      />
      <div className="p-7">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-xs font-bold text-gray-600 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((day, idx) => {
            const dayEvents = eventsForDay(day);
            const isToday = day && toDateOnly(day).getTime() === today;
            return (
              <div
                key={idx}
                className={`min-h-[100px] rounded-xl border p-2 ${day ? 'bg-white border-gray-200' : 'bg-transparent border-transparent'} ${isToday ? 'ring-2 ring-blue-400' : ''}`}
              >
                {day && (
                  <>
                    <div className={`text-xs font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>{day.getDate()}</div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <Link
                          key={ev.id}
                          to={`/events/${ev.id}`}
                          className={`block text-[10px] font-bold px-1.5 py-1 rounded border truncate ${STATUS_COLORS[ev.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}
                          title={ev.name}
                        >
                          {ev.name}
                        </Link>
                      ))}
                      {dayEvents.length > 3 && <div className="text-[10px] text-gray-600">+{dayEvents.length - 3} {t('كمان')}</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-6 text-xs text-gray-600 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block"></span> {t('مخطط لها')}</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block"></span> {t('جارية')}</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200 inline-block"></span> {t('مغلقة')}</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block"></span> {t('ملغاة')}</span>
        </div>
      </div>
    </>
  );
}
