import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getAssetUrl } from '../utils/assetUrl';

const NAV_GROUPS = [
  { key: 'home', label: null, items: [{ to: '/', label: 'لوحة التحكم', module: null }, { to: '/profile', label: 'الملف الشخصي', module: null }] },
  {
    key: 'stock',
    label: 'المخزون',
    items: [
      { to: '/items', label: 'الأصناف', module: 'items' },
      { to: '/warehouses', label: 'المخازن', module: 'warehouses' },
      { to: '/categories', label: 'التصنيفات', module: 'categories' },
      { to: '/stock-transfer', label: 'النقل بين المخازن', module: 'warehouses', action: 'edit' },
      { to: '/stock-count', label: 'الجرد الدوري', module: 'warehouses', action: 'edit' },
    ],
  },
  {
    key: 'ops',
    label: 'الحفلات والعملاء',
    items: [
      { to: '/clients', label: 'العملاء', module: 'clients' },
      { to: '/events', label: 'الحفلات', module: 'events' },
      { to: '/events-calendar', label: 'تقويم الحفلات', module: 'events' },
    ],
  },
  {
    key: 'vouchers',
    label: 'الصرف والمرتجع',
    items: [
      { to: '/issue', label: 'إذن صرف جديد', module: 'issueVouchers', action: 'create' },
      { to: '/issue-vouchers-log', label: 'سجل أذون الصرف', module: 'issueVouchers' },
      { to: '/return', label: 'إذن مرتجع جديد', module: 'returnVouchers', action: 'create' },
      { to: '/return-vouchers-log', label: 'سجل أذون المرتجع', module: 'returnVouchers' },
      { to: '/loss', label: 'الفاقد', module: 'lossRecords' },
      { to: '/damaged', label: 'التالف', module: 'damagedItems' },
      { to: '/custody-transfer', label: 'نقل عهدة بين الحفلات', module: 'custodyTransfers', action: 'create' },
      { to: '/custody-transfers-log', label: 'سجل نقل العهدة', module: 'custodyTransfers' },
      { to: '/transport-log', label: 'سجل النقل', module: 'issueVouchers' },
    ],
  },
  {
    key: 'follow',
    label: 'المتابعة والتقارير',
    items: [
      { to: '/log', label: 'سجل الحركة', module: 'activityLog' },
      { to: '/reports', label: 'التقارير', module: 'reports' },
      { to: '/period-report', label: 'تقرير يومي/شهري', module: 'reports' },
      { to: '/email-notifications', label: 'إشعارات الإيميل', module: 'emailNotifications' },
    ],
  },
  {
    key: 'accounts',
    label: 'الحسابات',
    items: [
      { to: '/accounts', label: 'كشوفات تكاليف الحفلات', module: 'accounts' },
      { to: '/accounts/comparison', label: 'تقرير مقارنة الحفلات', module: 'accounts' },
      { to: '/event-purposes', label: 'الأغراض', module: 'accounts', action: 'edit' },
      { to: '/event-cost-item-templates', label: 'أسماء بنود التوتال الشائعة', module: 'accounts', action: 'edit' },
    ],
  },
  {
    key: 'admin',
    label: 'الإدارة',
    items: [
      { to: '/users', label: 'المستخدمون', module: 'users' },
      { to: '/roles', label: 'الأدوار والصلاحيات', module: 'users' },
      { to: '/backups', label: 'النسخ الاحتياطي', module: 'settings' },
      { to: '/company-settings', label: 'إعدادات الشركة', module: 'settings' },
      { to: '/trash', label: 'سلة المهملات', module: 'settings' },
    ],
  },
];

// أيقونة بسيطة لكل عنصر في القايمة — شكل موحّد بخط رفيع (Stroke) يناسب هوية النظام
const ICON_PATHS = {
  '/': 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10',
  '/profile': 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  '/items': 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  '/warehouses': 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M14 9h1M14 13h1',
  '/categories': 'M20.59 13.41L13 21l-9-9V4h8l8.59 8.59a2 2 0 010 2.82zM7 7h.01',
  '/stock-transfer': 'M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3',
  '/stock-count': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12l2 2 4-4',
  '/clients': 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  '/events': 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
  '/events-calendar': 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18M8 15h2M13 15h2M8 18h2',
  '/issue': 'M12 19V5M5 12l7-7 7 7',
  '/issue-vouchers-log': 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  '/return': 'M12 5v14M19 12l-7 7-7-7',
  '/return-vouchers-log': 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  '/loss': 'M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  '/damaged': 'M12 22a10 10 0 100-20 10 10 0 000 20zM15 9l-6 6M9 9l6 6',
  '/custody-transfer': 'M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3',
  '/custody-transfers-log': 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  '/transport-log': 'M3 17h1a2 2 0 002-2v-2a2 2 0 00-2-2H2v4a2 2 0 002 2zm0 0h13m0 0h1a2 2 0 002-2v-2a4 4 0 00-4-4h-3l-2-4H8L6 11H3v4a2 2 0 002 2m8-6V7',
  '/log': 'M3 3v5h5M3.05 13a9 9 0 106.16-8.9M12 7v5l4 2',
  '/reports': 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h6',
  '/period-report': 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18M9 16l2 2 4-4',
  '/email-notifications': 'M4 4h16v16H4zM4 6l8 7 8-7',
  '/users': 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  '/roles': 'M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z',
  '/backups': 'M12 3c4.97 0 9 1.34 9 3s-4.03 3-9 3-9-1.34-9-3 4.03-3 9-3zM3 6v6c0 1.66 4.03 3 9 3s9-1.34 9-3V6M3 12v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6',
  '/company-settings': 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9',
  '/trash': 'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z',
};

function NavIcon({ to }) {
  const d = ICON_PATHS[to];
  if (!d) return null;
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? '-rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SidebarContent({ user, can, openKey, setOpenKey, onNavigate }) {
  const { t } = useLanguage();
  return (
    <>
      <div className="relative flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <img src="/ug-logo.jpg" alt="UG" className="w-10 h-10 rounded-xl object-cover shadow-lg animate-glow" />
        <div>
          <h1 className="text-sm font-extrabold text-white leading-tight">{t('UG Production House')}</h1>
          <span className="text-[11px] text-gray-300">{t('Inventory ERP')}</span>
        </div>
      </div>

      <nav className="relative flex-1 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((n) => !n.module || can(n.module, n.action || 'view'));
          if (visibleItems.length === 0) return null;

          if (!group.label) {
            return (
              <div key={group.key} className="mb-1 space-y-1">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        isActive ? 'bg-white/15 text-white shadow-inner' : 'text-gray-300 hover:bg-white/10 hover:text-white hover:translate-x-[-2px]'
                      }`
                    }
                  >
                    <NavIcon to={item.to} />
                    {t(item.label)}
                  </NavLink>
                ))}
              </div>
            );
          }

          const isOpen = openKey === group.key;
          return (
            <div key={group.key} className="mb-1">
              <button
                onClick={() => setOpenKey(isOpen ? '' : group.key)}
                className="w-full flex items-center justify-between px-3 pt-4 pb-1.5 text-[11px] font-bold text-gray-300 tracking-wide hover:text-white transition"
              >
                <span>{t(group.label)}</span>
                <ChevronIcon open={isOpen} />
              </button>
              <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="space-y-1 pt-0.5">
                    {visibleItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            isActive ? 'bg-white/15 text-white shadow-inner' : 'text-gray-300 hover:bg-white/10 hover:text-white hover:translate-x-[-2px]'
                          }`
                        }
                      >
                        <NavIcon to={item.to} />
                        {t(item.label)}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </>
  );
}

export default function MainLayout() {
  const { user, can, logout } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const initialOpenKey = NAV_GROUPS.find((g) => g.items.some((i) => i.to === location.pathname))?.key || 'home';
  const [openKey, setOpenKey] = useState(initialOpenKey);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="md:hidden glass-dark flex items-center justify-between px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <img src="/ug-logo.jpg" alt="UG" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-white font-extrabold text-sm">{t('UG Production House')}</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-white p-1.5" aria-label="فتح القائمة">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <aside className={`hidden md:flex md:flex-col fixed top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} h-screen w-[260px] z-20 text-gray-200 overflow-hidden glass-dark`}>
        <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-blue-500/20 blur-3xl animate-blob" />
        <div className="pointer-events-none absolute bottom-10 -left-14 w-48 h-48 rounded-full bg-slate-400/10 blur-3xl animate-blob" style={{ animationDelay: '3s' }} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none" style={{ fontSize: '13rem', fontWeight: 800, color: 'rgba(255,255,255,0.035)', letterSpacing: '-0.05em' }}>
          UG
        </div>
        <SidebarContent user={user} can={can} openKey={openKey} setOpenKey={setOpenKey} onNavigate={() => {}} />
        <div className="relative px-4 py-3.5 border-t border-white/10 flex items-center gap-2.5">
          {user?.avatarUrl ? (
            <img src={getAssetUrl(user.avatarUrl)} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-xs font-bold text-gray-100">
              {user?.fullName?.[0] || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">{user?.fullName}</div>
            <div className="text-[10px] text-gray-300">{user?.roleName}</div>
          </div>
          <button onClick={toggleLanguage} className="text-[10px] font-bold text-gray-300 hover:text-white transition border border-white/15 rounded-full px-2 py-1" title="Switch language">
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>
          <button onClick={handleLogout} className="text-[11px] text-gray-300 hover:text-white transition" title={t('تسجيل الخروج')}>
            {t('خروج')}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 max-w-[80vw] h-full glass-dark flex flex-col overflow-hidden animate-fadein">
            <button onClick={() => setMobileOpen(false)} className="absolute left-3 top-3 text-white p-1.5 z-10" aria-label="إغلاق">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <SidebarContent user={user} can={can} openKey={openKey} setOpenKey={setOpenKey} onNavigate={() => setMobileOpen(false)} />
            <div className="relative px-4 py-3.5 border-t border-white/10 flex items-center gap-2.5">
              {user?.avatarUrl ? (
                <img src={getAssetUrl(user.avatarUrl)} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-xs font-bold text-gray-100">
                  {user?.fullName?.[0] || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">{user?.fullName}</div>
                <div className="text-[10px] text-gray-300">{user?.roleName}</div>
              </div>
              <button onClick={toggleLanguage} className="text-[10px] font-bold text-gray-300 hover:text-white transition border border-white/15 rounded-full px-2 py-1">
                {lang === 'ar' ? 'EN' : 'AR'}
              </button>
              <button onClick={handleLogout} className="text-[11px] text-gray-300 hover:text-white transition">{t('خروج')}</button>
            </div>
          </div>
        </div>
      )}

      <div className={`${lang === 'ar' ? 'md:mr-[260px]' : 'md:ml-[260px]'} min-h-screen overflow-x-hidden`}>
        <div key={location.pathname} className="animate-fadein">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
