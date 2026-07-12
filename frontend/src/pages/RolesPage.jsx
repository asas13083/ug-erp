import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';

const ACTIONS = [
  { key: 'canView', label: 'عرض' },
  { key: 'canCreate', label: 'إضافة' },
  { key: 'canEdit', label: 'تعديل' },
  { key: 'canDelete', label: 'حذف' },
];

function emptyPermissions(modules) {
  const map = {};
  modules.forEach((m) => {
    map[m.key] = { canView: false, canCreate: false, canEdit: false, canDelete: false };
  });
  return map;
}

export default function RolesPage() {
  const { t } = useLanguage();
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [expandedRoleId, setExpandedRoleId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState({});
  const [appearsInHandoverLists, setAppearsInHandoverLists] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get('/roles').then(({ data }) => setRoles(data.data));
    api.get('/auth/users').then(({ data }) => setAllUsers(data.data));
  }

  useEffect(() => {
    api.get('/roles/modules').then(({ data }) => {
      setModules(data.data);
      setPermissions(emptyPermissions(data.data));
    });
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setName('');
    setPermissions(emptyPermissions(modules));
    setAppearsInHandoverLists(false);
    setShowForm(true);
  }

  function openEdit(role) {
    setEditingId(role.id);
    setName(role.name);
    const map = emptyPermissions(modules);
    role.permissions.forEach((p) => {
      map[p.module] = { canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete };
    });
    setPermissions(map);
    setAppearsInHandoverLists(!!role.appearsInHandoverLists);
    setShowForm(true);
  }

  function toggle(moduleKey, actionKey) {
    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey], [actionKey]: !prev[moduleKey][actionKey] },
    }));
  }

  function toggleAllForModule(moduleKey, value) {
    setPermissions((prev) => ({
      ...prev,
      [moduleKey]: { canView: value, canCreate: value, canEdit: value, canDelete: value },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/roles/${editingId}`, { name, permissions, appearsInHandoverLists });
      } else {
        await api.post('/roles', { name, permissions, appearsInHandoverLists });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ'));
    }
  }

  async function handleDelete(role) {
    if (!window.confirm(`${t('متأكد إنك عايز تحذف دور')} "${role.name}"؟`)) return;
    try {
      await api.delete(`/roles/${role.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحذف'));
    }
  }

  return (
    <>
      <PageHeader
        title={t('الأدوار والصلاحيات')}
        subtitle={t('اكتب اسم أي وظيفة (مدير، محاسب، مسؤول إضاءة...) وحدد بحرية كل قسم يشوف أو يعدّل أو يحذف إيه')}
        action={<button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">+ {t('دور جديد')}</button>}
      />
      <div className="p-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {roles.map((role) => {
          const activeModules = role.permissions.filter((p) => p.canView).length;
          const roleUsers = allUsers.filter((u) => u.roleId === role.id);
          const isExpanded = expandedRoleId === role.id;
          return (
            <div key={role.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-extrabold flex items-center gap-2">
                    {role.name}
                    {role.isSystem && <span className="text-[10px] bg-purple-50 text-purple-600 font-bold px-2 py-0.5 rounded-full">{t('أساسي')}</span>}
                  </div>
                  <button onClick={() => setExpandedRoleId(isExpanded ? null : role.id)} className="text-xs text-gray-600 mt-1 hover:text-blue-600 transition">
                    {role._count.users} {t('مستخدم')} · {t('صلاحية عرض على')} {activeModules} {t('قسم')} {isExpanded ? '▾' : '▸'}
                  </button>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openEdit(role)} className="text-blue-600 text-xs font-bold hover:underline">{t('تعديل الصلاحيات')}</button>
                  {!role.isSystem && (
                    <button onClick={() => handleDelete(role)} className="text-rose-600 text-xs font-bold hover:underline">{t('حذف')}</button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                  {roleUsers.length === 0 && <div className="text-xs text-gray-500">{t('لا يوجد مستخدمون بهذا الدور')}</div>}
                  {roleUsers.map((u) => (
                    <Link key={u.id} to={`/users/${u.id}`} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 transition">
                      <span className="text-sm font-bold">{u.fullName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? t('نشط') : t('موقوف')}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10 px-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto space-y-4 shadow-xl">
            <h3 className="font-extrabold text-lg">{editingId ? t('تعديل الدور والصلاحيات') : t('دور جديد')}</h3>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}

            <div>
              <label className="block text-xs font-bold mb-1 text-gray-600">{t('اسم الوظيفة/الدور (اكتب أي اسم تحب)')}</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('مثال: محاسب، مسؤول إضاءة، مشرف مسرح...')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <label className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 cursor-pointer">
              <input type="checkbox" checked={appearsInHandoverLists} onChange={(e) => setAppearsInHandoverLists(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <span className="text-sm">
                <span className="font-bold">{t('يظهر في قوائم "المُسلّم" و"المُستلم"')}</span>
                <span className="text-xs text-gray-600 block mt-0.5">{t('يعني مستخدمين الدور ده هيظهروا كخيار وقت اختيار المُسلّم أو المُستلم في أذون الصرف والمرتجع ونقل العهدة')}</span>
              </span>
            </label>

            <div className="border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs">
                    <th className="text-right px-3 py-2.5 font-bold">{t('القسم')}</th>
                    {ACTIONS.map((a) => (
                      <th key={a.key} className="text-center px-2 py-2.5 font-bold">{t(a.label)}</th>
                    ))}
                    <th className="text-center px-2 py-2.5 font-bold">{t('الكل')}</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m) => {
                    const perm = permissions[m.key] || {};
                    const allChecked = ACTIONS.every((a) => perm[a.key]);
                    return (
                      <tr key={m.key} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-bold">{t(m.label)}</td>
                        {ACTIONS.map((a) => (
                          <td key={a.key} className="text-center px-2 py-2">
                            <input type="checkbox" checked={!!perm[a.key]} onChange={() => toggle(m.key, a.key)} className="w-4 h-4 accent-blue-600" />
                          </td>
                        ))}
                        <td className="text-center px-2 py-2">
                          <input type="checkbox" checked={allChecked} onChange={(e) => toggleAllForModule(m.key, e.target.checked)} className="w-4 h-4 accent-ink" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 pt-2 sticky bottom-0 bg-white">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition">{t('حفظ الصلاحيات')}</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
