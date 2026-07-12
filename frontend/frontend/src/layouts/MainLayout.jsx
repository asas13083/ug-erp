import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'لوحة التحكم', roles: null },
  { to: '/items', label: 'الأصناف', roles: null },
  { to: '/warehouses', label: 'المخازن', roles: null },
  { to: '/categories', label: 'التصنيفات', roles: null },
  { to: '/clients', label: 'العملاء', roles: null },
  { to: '/events', label: 'الحفلات', roles: null },
  { to: '/issue', label: 'إذن صرف', roles: ['ADMIN', 'MANAGER', 'STORE_KEEPER'] },
  { to: '/return', label: 'إذن مرتجع', roles: ['ADMIN', 'MANAGER', 'STORE_KEEPER'] },
  { to: '/loss', label: 'الفاقد', roles: null },
  { to: '/log', label: 'سجل الحركة', roles: null },
  { to: '/reports', label: 'التقارير', roles: null },
  { to: '/email-notifications', label: 'إشعارات الإيميل', roles: ['ADMIN', 'MANAGER'] },
];

const ROLE_LABELS = { ADMIN: 'مدير النظام', MANAGER: 'مدير', STORE_KEEPER: 'أمين مخزن', OPERATION: 'أوبريتور' };

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="grid grid-cols-[250px_1fr] min-h-screen" dir="rtl">
      <aside className="bg-ink text-gray-300 flex flex-col h-screen sticky top-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-inkline">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-400 flex items-center justify-center text-ink font-extrabold">UG</div>
          <div>
            <h1 className="text-sm font-extrabold text-white leading-tight">UG Production House</h1>
            <span className="text-[11px] text-gray-400">Inventory ERP</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.filter((n) => !n.roles || n.roles.includes(user?.role)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-inksoft text-white' : 'text-gray-400 hover:bg-inksoft hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3.5 border-t border-inkline flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-xs font-bold text-gray-200">
            {user?.fullName?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">{user?.fullName}</div>
            <div className="text-[10px] text-gray-500">{ROLE_LABELS[user?.role] || user?.role}</div>
          </div>
          <button onClick={handleLogout} className="text-[11px] text-gray-400 hover:text-white" title="تسجيل الخروج">
            خروج
          </button>
        </div>
      </aside>

      <div className="min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}
