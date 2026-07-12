import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';

const EMPTY_FORM = { fullName: '', username: '', password: '', roleId: '', phone: '' };

export default function UsersPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // إدارة تقييد الحفلات لمستخدم معيّن
  const [managingUser, setManagingUser] = useState(null);
  const [restrict, setRestrict] = useState(false);
  const [allEvents, setAllEvents] = useState([]);
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [eventSearch, setEventSearch] = useState('');
  const [savingScope, setSavingScope] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');

  function load() {
    api.get('/auth/users').then(({ data }) => setUsers(data.data));
    api.get('/roles').then(({ data }) => setRoles(data.data));
  }
  useEffect(load, []);

  function openCreate() {
    setForm({ ...EMPTY_FORM, roleId: roles[0]?.id || '' });
    setShowForm(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/users', form);
      setSuccess(`${t('تم إنشاء حساب')} "${form.fullName}" ${t('بنجاح')}`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ أثناء الإنشاء'));
    }
  }

  async function openManageScope(user) {
    setManagingUser(user);
    setRestrict(!!user.restrictToAssignedEvents);
    setEventSearch('');
    const [eventsRes, assignedRes] = await Promise.all([
      api.get('/events', { params: { pageSize: 300 } }),
      api.get(`/auth/users/${user.id}/event-assignments`),
    ]);
    setAllEvents(eventsRes.data.data);
    setSelectedEventIds(assignedRes.data.data);
  }

  function toggleEventSelected(eventId) {
    setSelectedEventIds((prev) => (prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]));
  }

  async function saveScope() {
    setSavingScope(true);
    try {
      await api.put(`/auth/users/${managingUser.id}`, { restrictToAssignedEvents: restrict });
      if (restrict) {
        await api.put(`/auth/users/${managingUser.id}/event-assignments`, { eventIds: selectedEventIds });
      }
      setManagingUser(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || t('حدث خطأ'));
    } finally {
      setSavingScope(false);
    }
  }

  const filteredEvents = allEvents.filter((ev) => ev.name.toLowerCase().includes(eventSearch.toLowerCase()) || ev.number.toLowerCase().includes(eventSearch.toLowerCase()));

  const visibleUsers = roleFilter ? users.filter((u) => u.roleId === roleFilter) : users;

  async function toggleActive(u) {
    try {
      await api.put(`/auth/users/${u.id}`, { isActive: !u.isActive });
      load();
    } catch (err) {
      alert(err.response?.data?.message || t('حدث خطأ'));
    }
  }

  async function handleDeleteUser(u) {
    if (!window.confirm(`${t('متأكد إنك عايز تحذف مستخدم')} "${u.fullName}" ${t('نهائياً؟')}`)) return;
    try {
      await api.delete(`/auth/users/${u.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحذف'));
    }
  }

  return (
    <>
      <PageHeader
        title={t('المستخدمون')}
        subtitle={t('تحديد مين يقدر يدخل النظام وبأي دور')}
        action={
          <div className="flex gap-2">
            <button onClick={() => navigate('/roles')} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('إدارة الأدوار والصلاحيات')}</button>
            <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">+ {t('مستخدم جديد')}</button>
          </div>
        }
      />
      <div className="p-7">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(roleFilter === r.id ? '' : r.id)}
              className={`text-right rounded-xl px-4 py-3 text-sm font-bold transition ${roleFilter === r.id ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
            >
              {r.name}
              <div className="text-xs font-normal opacity-70 mt-1">{r._count?.users ?? 0} {t('مستخدم')}</div>
            </button>
          ))}
        </div>
        {roleFilter && (
          <button onClick={() => setRoleFilter('')} className="text-xs text-gray-600 hover:text-rose-600 font-bold mb-4">{t('مسح الفلتر')}</button>
        )}

        {success && <div className="text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 text-sm mb-4">{success}</div>}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('الاسم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('اسم المستخدم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الدور')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الهاتف')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('نطاق الحفلات')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
                <th className="text-right px-4 py-3 font-bold w-20">{t('إجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-bold"><Link to={`/users/${u.id}`} className="hover:text-blue-600 transition">{u.fullName}</Link></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{u.username}</td>
                  <td className="px-4 py-3"><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">{u.roleName}</span></td>
                  <td className="px-4 py-3">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    {u.restrictToAssignedEvents ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">{t('حفلات معيّنة فقط')}</span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{t('كل الحفلات')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${u.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                      {u.isActive ? t('نشط') : t('موقوف')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2.5 flex-wrap">
                      <button onClick={() => openManageScope(u)} className="text-blue-600 text-xs font-bold hover:underline">{t('تحديد الحفلات')}</button>
                      <button onClick={() => toggleActive(u)} className="text-amber-600 text-xs font-bold hover:underline">{u.isActive ? t('إيقاف') : t('تفعيل')}</button>
                      <button onClick={() => handleDeleteUser(u)} className="text-rose-600 text-xs font-bold hover:underline">{t('حذف')}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleUsers.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-600">{t('لا يوجد مستخدمون بعد')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10 px-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5 shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg mb-2">{t('مستخدم جديد')}</h3>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('الاسم الكامل')}</label>
              <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('مثال: كريم فؤاد')} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('اسم المستخدم (بالإنجليزي، بدون مسافات)')}</label>
              <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="karim.fouad" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('كلمة مرور مبدئية')}</label>
              <input required type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('يقدر يغيّرها بعد أول دخول')} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('الدور')}</label>
              <select required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">{t('اختر دور')}</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <div className="text-[11px] text-gray-600 mt-1">{t('مش لاقي الدور اللي عايزه؟ اعمل واحد جديد من "إدارة الأدوار والصلاحيات"')}</div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('رقم الهاتف (اختياري)')}</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition">{t('حفظ')}</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}

      {managingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10 px-4" >
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg">{t('نطاق الحفلات')} — {managingUser.fullName}</h3>

            <label className="flex items-center gap-2.5 bg-gray-50 rounded-xl p-3.5 cursor-pointer">
              <input type="checkbox" checked={restrict} onChange={(e) => setRestrict(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm font-bold">{t('يشوف الحفلات المعيّن عليها بس (مش كل الحفلات)')}</span>
            </label>

            {restrict && (
              <div>
                <input
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  placeholder={t('ابحث عن حفلة...')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2"
                />
                <div className="text-xs text-gray-600 mb-2">{selectedEventIds.length} {t('حفلة معيّنة')}</div>
                <div className="border border-gray-200 rounded-xl max-h-64 overflow-y-auto divide-y divide-gray-50">
                  {filteredEvents.map((ev) => (
                    <label key={ev.id} className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={selectedEventIds.includes(ev.id)} onChange={() => toggleEventSelected(ev.id)} className="w-4 h-4 accent-blue-600" />
                      <span className="text-sm flex-1">{ev.name}</span>
                      <span className="text-xs text-gray-600">{ev.number}</span>
                    </label>
                  ))}
                  {filteredEvents.length === 0 && <div className="text-center py-6 text-gray-600 text-sm">{t('لا توجد نتائج')}</div>}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={saveScope} disabled={savingScope} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition">
                {savingScope ? t('جاري الحفظ...') : t('حفظ')}
              </button>
              <button onClick={() => setManagingUser(null)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
