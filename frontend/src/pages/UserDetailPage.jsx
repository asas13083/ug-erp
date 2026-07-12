import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { resolveActivityLink } from '../utils/activityLink';
import { useLanguage } from '../context/LanguageContext';

const STATUS_LABELS = {
  PLANNED: ['مخطط لها', 'bg-blue-50 text-blue-600'],
  ONGOING: ['جارية الآن', 'bg-amber-50 text-amber-600'],
  CLOSED: ['مغلقة', 'bg-emerald-50 text-emerald-600'],
  CANCELLED: ['ملغاة', 'bg-gray-100 text-gray-600'],
};

const ACTION_LABELS = {
  CREATE: 'إضافة', UPDATE: 'تعديل', DELETE: 'حذف', ISSUE: 'صرف',
  RETURN: 'مرتجع', LOSS: 'فاقد', TRANSFER: 'نقل', STOCK_COUNT: 'جرد', LOGIN: 'دخول',
};

export default function UserDetailPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/auth/users').then(({ data }) => data.data.find((u) => u.id === id)),
      api.get(`/auth/users/${id}/history`),
    ])
      .then(([foundUser, { data: history }]) => {
        setUser(foundUser);
        setEvents(history.data.events);
        setActivityLogs(history.data.activityLogs);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function goToLog(log) {
    const link = resolveActivityLink(log);
    if (link) navigate(link);
  }

  if (loading) return <div className="p-10 text-center text-gray-600">{t('جاري التحميل...')}</div>;
  if (!user) return <div className="p-10 text-center text-gray-600">{t('المستخدم غير موجود')}</div>;

  return (
    <>
      <PageHeader
        title={user.fullName}
        subtitle={`${user.username} · ${user.roleName}`}
        action={<Link to="/users" className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('كل المستخدمين')}</Link>}
      />
      <div className="p-7">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-blue-600">{events.length}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('حفلة اشتغل فيها على مدار الوقت')}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold text-emerald-600">{activityLogs.length}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('عملية مسجّلة باسمه')}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl font-extrabold" style={{ color: user.restrictToAssignedEvents ? '#C77700' : '#6B7280' }}>
              {user.restrictToAssignedEvents ? t('حفلات معيّنة فقط') : t('كل الحفلات')}
            </div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('نطاق الحفلات')}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-6 overflow-x-auto">
          <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm">{t('الحفلات اللي اشتغل فيها (كل الفترات)')}</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('الرقم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('اسم الحفلة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('العميل')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const [label, cls] = STATUS_LABELS[ev.status] || ['—', ''];
                return (
                  <tr key={ev.id} className="border-t border-gray-100 hover:bg-gray-50/60 transition">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{ev.number}</td>
                    <td className="px-4 py-3 font-bold"><Link to={`/events/${ev.id}`} className="hover:text-blue-600 transition">{ev.name}</Link></td>
                    <td className="px-4 py-3">{ev.client?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(ev.startDate).toLocaleDateString('ar-EG')} → {new Date(ev.endDate).toLocaleDateString('ar-EG')}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{t(label)}</span></td>
                  </tr>
                );
              })}
              {events.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-600">{t('لسه مشتغلش على أي حفلة')}</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm">{t('سجل الحركة الكامل')}</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('العملية')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الوصف')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الوقت')}</th>
              </tr>
            </thead>
            <tbody>
              {activityLogs.map((log) => {
                const clickable = !!resolveActivityLink(log);
                return (
                  <tr key={log.id} onClick={() => goToLog(log)} className={`border-t border-gray-100 ${clickable ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
                    <td className="px-4 py-3"><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{t(ACTION_LABELS[log.action] || log.action)}</span></td>
                    <td className="px-4 py-3">{log.description}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('ar-EG')}</td>
                  </tr>
                );
              })}
              {activityLogs.length === 0 && <tr><td colSpan={3} className="text-center py-10 text-gray-600">{t('مفيش سجل حركة لسه')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
