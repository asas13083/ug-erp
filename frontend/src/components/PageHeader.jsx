import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="glass px-4 sm:px-7 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sticky top-0 z-10 border-x-0 border-t-0">
      <div>
        <h2 className="text-lg font-extrabold text-gray-900">{title}</h2>
        {subtitle && <div className="text-xs text-gray-600 font-medium">{subtitle}</div>}
      </div>
      <div className="sm:mr-auto flex flex-wrap items-center gap-2">
        <GlobalSearch />
        {action}
        <NotificationBell />
      </div>
    </div>
  );
}
