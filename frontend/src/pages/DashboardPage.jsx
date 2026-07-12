import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { resolveActivityLink } from '../utils/activityLink';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const STATUS_LABELS = {
  PLANNED: ['مخطط لها', 'bg-blue-50 text-blue-600'],
  ONGOING: ['جارية الآن', 'bg-amber-50 text-amber-600'],
  CLOSED: ['مغلقة', 'bg-emerald-50 text-emerald-600'],
  CANCELLED: ['ملغاة', 'bg-gray-100 text-gray-600'],
};

const ICONS = {
  items: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  warehouses: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M14 9h1M14 13h1',
  events: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
  alert: 'M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  issue: 'M12 19V5M5 12l7-7 7 7',
  return: 'M12 5v14M19 12l-7 7-7-7',
  transfer: 'M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3',
  loss: 'M12 22a10 10 0 100-20 10 10 0 000 20zM15 9l-6 6M9 9l6 6',
  mail: 'M4 4h16v16H4zM4 6l8 7 8-7',
  backup: 'M12 3c4.97 0 9 1.34 9 3s-4.03 3-9 3-9-1.34-9-3 4.03-3 9-3zM3 6v6c0 1.66 4.03 3 9 3s9-1.34 9-3V6M3 12v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6',
};

function Icon({ path, className, style }) {
  return (
    <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
    </svg>
  );
}

function StatCard({ label, value, sub, color, to, icon }) {
  return (
    <Link to={to} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block">
      <div className="flex items-center justify-between mb-1">
        <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon path={icon} className="w-4.5 h-4.5" style={{ color }} />
        </div>
      </div>
      <div className="text-sm text-gray-600 font-medium">{label}</div>
      {sub && <div className="text-xs text-gray-500 mt-1.5">{sub}</div>}
    </Link>
  );
}

function MiniStat({ label, value, color, icon }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon path={icon} className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <div className="text-lg font-extrabold leading-none" style={{ color }}>{value}</div>
        <div className="text-[11px] text-gray-500 mt-1">{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const { user, can } = useAuth();
  const { t, lang } = useLanguage();

  const hour = new Date().getHours();
  const greeting = t(hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء النور' : 'مساء الخير');
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';

  useEffect(() => {
    api
      .get('/dashboard/stats')
      .then(({ data }) => setStats(data.data))
      .catch((err) => setError(err.response?.data?.message || t('تعذر تحميل الإحصائيات')));
  }, []);

  function goToLog(log) {
    const link = resolveActivityLink(log);
    if (link) navigate(link);
  }

  function timeSince(dateStr) {
    if (!dateStr) return null;
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diffMs / 3600000);
    if (hours < 1) return t('من شوية');
    if (hours < 24) return `${hours} ${t('ساعة مضت')}`;
    return `${Math.floor(hours / 24)} ${t('يوم مضى')}`;
  }

  return (
    <>
      <PageHeader title={`${greeting}${user?.fullName ? '، ' + user.fullName.split(' ')[0] : ''} 👋`} subtitle={t('نظرة عامة على المخزون والعمليات')} />
      <div className="p-7">
        {error && <div className="text-rose-600 bg-rose-50 rounded-lg p-4 mb-4">{error}</div>}
        {!stats && !error && <div className="text-gray-600">{t('جاري التحميل...')}</div>}

        {stats && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {stats.itemsCount != null && <StatCard label={t('إجمالي الأصناف')} value={stats.itemsCount} color="#2D6CDF" icon={ICONS.items} to="/items" />}
              {stats.warehousesCount != null && <StatCard label={t('المخازن النشطة')} value={stats.warehousesCount} color="#C77700" icon={ICONS.warehouses} to="/warehouses" />}
              {stats.openEventsCount != null && <StatCard label={t('حفلات مفتوحة')} value={stats.openEventsCount} color="#0E9F6E" icon={ICONS.events} to="/events" />}
              {stats.lowStockAlertsCount != null && (
                <StatCard
                  label={t('تنبيهات نقص مخزون')}
                  value={stats.lowStockAlertsCount}
                  color="#D6374B"
                  icon={ICONS.alert}
                  sub={stats.lowStockAlertsCount > 0 ? t('دوس تشوف التفاصيل') : t('كل الأصناف متوفرة')}
                  to="/items"
                />
              )}
            </div>

            <div className="mb-2 text-xs font-bold text-gray-500">{t('نشاط اليوم')}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {stats.todayStats.issued != null && <Link to="/issue-vouchers-log"><MiniStat label={t('إذن صرف')} value={stats.todayStats.issued} color="#2D6CDF" icon={ICONS.issue} /></Link>}
              {stats.todayStats.returned != null && <Link to="/return-vouchers-log"><MiniStat label={t('إذن مرتجع')} value={stats.todayStats.returned} color="#0E9F6E" icon={ICONS.return} /></Link>}
              {stats.todayStats.custody != null && <Link to="/custody-transfers-log"><MiniStat label={t('نقل عهدة')} value={stats.todayStats.custody} color="#C77700" icon={ICONS.transfer} /></Link>}
              {stats.todayStats.loss != null && <Link to="/loss"><MiniStat label={t('فاقد')} value={stats.todayStats.loss} color="#D6374B" icon={ICONS.loss} /></Link>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <div className="font-extrabold text-sm mb-3">{t('حالة تسوية الحفلات المفتوحة')}</div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>{t('اتقفلت بالكامل')}</span>
                    <span className="font-extrabold text-emerald-600">{stats.settlementOverview.settled || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>{t('لسه فيها معلّق')}</span>
                    <span className="font-extrabold text-amber-600">{stats.settlementOverview.pending || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>{t('لسه معملهاش صرف')}</span>
                    <span className="font-extrabold text-gray-500">{stats.settlementOverview.none || 0}</span>
                  </div>
                </div>
                <Link to="/events" className="text-xs text-blue-600 font-bold mt-3 inline-block">{t('كل الحفلات')} ←</Link>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <div className="font-extrabold text-sm mb-3">{t('أكتر الأصناف صرفاً الشهر ده')}</div>
                <div className="space-y-2">
                  {stats.topIssuedItems.length === 0 && <div className="text-xs text-gray-500">{t('لا توجد بيانات كافية بعد')}</div>}
                  {stats.topIssuedItems.map((i, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                      <span className="text-sm flex-1 truncate">{i.name}</span>
                      <span className="text-xs font-bold text-gray-600">×{i.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <div className="font-extrabold text-sm mb-3">{t('أكتر المستخدمين نشاطاً الشهر ده')}</div>
                <div className="space-y-2">
                  {stats.mostActiveUsers.length === 0 && <div className="text-xs text-gray-500">{t('لا توجد بيانات كافية بعد')}</div>}
                  {stats.mostActiveUsers.map((u, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                      <span className="text-sm flex-1 truncate">{u.name}</span>
                      <span className="text-xs font-bold text-gray-600">{u.count} {t('عملية')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm flex items-center justify-between">
                  <span>{t('الحفلات القادمة')}</span>
                  <Link to="/events-calendar" className="text-xs text-blue-600 font-bold">{t('التقويم الكامل')}</Link>
                </div>
                <div className="p-2">
                  {stats.upcomingEvents.length === 0 && <div className="p-4 text-sm text-gray-600">{t('لا توجد حفلات قادمة مجدولة')}</div>}
                  {stats.upcomingEvents.map((ev) => {
                    const [label, cls] = STATUS_LABELS[ev.status] || ['—', ''];
                    return (
                      <Link key={ev.id} to={`/events/${ev.id}`} className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg transition">
                        <div className="flex-1">
                          <div className="text-sm font-bold">{ev.name}</div>
                          <div className="text-xs text-gray-500">{ev.client?.name || '—'} · {new Date(ev.startDate).toLocaleDateString(locale)}</div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${cls}`}>{t(label)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm">{t('تنبيهات نقص المخزون')}</div>
                <div className="p-2">
                  {stats.lowStockItems.length === 0 && <div className="p-4 text-sm text-gray-600">{t('لا توجد تنبيهات حالياً')}</div>}
                  {stats.lowStockItems.map((i) => (
                    <Link key={`${i.id}-${i.warehouseId}`} to={`/warehouses/${i.warehouseId}`} className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg transition">
                      <div className="flex-1">
                        <div className="text-sm font-bold">{i.name}</div>
                        <div className="text-xs text-gray-500">{i.warehouseName} · {t('الحد الأدنى')} {i.minQuantity}</div>
                      </div>
                      <div className="text-rose-600 font-extrabold">{i.totalQuantity}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {stats.emailStatus && (
                <Link to="/email-notifications" className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:border-gray-300 transition flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Icon path={ICONS.mail} className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold text-sm">{t('حالة إشعارات الإيميل')}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {stats.emailStatus.lastSentAt ? `${t('آخر تقرير اتبعت')} ${timeSince(stats.emailStatus.lastSentAt)}` : t('لسه مفيش تقارير اتبعتت')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {stats.emailStatus.pending > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">{stats.emailStatus.pending} {t('في الانتظار')}</span>}
                    {stats.emailStatus.failed > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600">{stats.emailStatus.failed} {t('فشل الإرسال')}</span>}
                  </div>
                </Link>
              )}

              {can('settings', 'view') && (
                <Link to="/backups" className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 hover:border-gray-300 transition flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Icon path={ICONS.backup} className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold text-sm">{t('حالة النسخ الاحتياطي')}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {stats.lastBackupAt ? `${t('آخر نسخة')} ${timeSince(stats.lastBackupAt)}` : t('لسه مفيش نسخ احتياطية')}
                    </div>
                  </div>
                </Link>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm flex items-center justify-between">
                <span>{t('آخر العمليات')}</span>
                <Link to="/log" className="text-xs text-blue-600 font-bold">{t('سجل الحركة الكامل')}</Link>
              </div>
              <div className="p-2">
                {stats.recentActivity.map((log) => {
                  const clickable = !!resolveActivityLink(log);
                  return (
                    <div
                      key={log.id}
                      onClick={() => goToLog(log)}
                      className={`px-3 py-2.5 border-b border-gray-50 last:border-0 rounded-lg transition ${clickable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    >
                      <div className="text-sm">{log.description}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{log.user?.fullName} · {new Date(log.createdAt).toLocaleString(locale)}</div>
                    </div>
                  );
                })}
                {stats.recentActivity.length === 0 && <div className="p-4 text-sm text-gray-600">{t('لا توجد عمليات مسجّلة بعد')}</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
