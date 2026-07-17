import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl } from '../utils/assetUrl';

const SETTLEMENT_DOT = {
  settled: ['bg-emerald-500', 'اتقفلت بالكامل — كل اللي خرج رجع أو اتسجل'],
  pending: ['bg-amber-500', 'لسه فيها كمية معلّقة برا'],
  none: ['bg-gray-300', 'لسه معملهاش صرف'],
};

const STATUS_LABELS = {
  PLANNED: ['مخطط لها', 'bg-blue-50 text-blue-600'],
  ONGOING: ['جارية الآن', 'bg-amber-50 text-amber-600'],
  CLOSED: ['مغلقة', 'bg-emerald-50 text-emerald-600'],
  CANCELLED: ['ملغاة', 'bg-gray-100 text-gray-600'],
};

const EMPTY_FORM = { name: '', clientId: '', location: '', startDate: '', endDate: '', status: 'ONGOING', notes: '', logoUrl: '' };

function toDateInput(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}

export default function EventsPage() {
  const { t } = useLanguage();
  const { can } = useAuth();
  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [assignedUserIds, setAssignedUserIds] = useState([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get('/events', { params: { page, pageSize: 20 } }).then(({ data }) => {
      setEvents(data.data);
      setMeta(data.meta);
    });
  }
  useEffect(() => {
    load();
    api.get('/clients', { params: { pageSize: 200 } }).then(({ data }) => setClients(data.data));
    api.get('/auth/users').then(({ data }) => setUsers(data.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setAssignedUserIds([]);
    setShowForm(true);
  }

  async function openEdit(ev) {
    setEditingId(ev.id);
    setForm({
      name: ev.name,
      clientId: ev.client?.id || '',
      location: ev.location || '',
      startDate: toDateInput(ev.startDate),
      endDate: toDateInput(ev.endDate),
      status: ev.status,
      notes: ev.notes || '',
      logoUrl: ev.logoUrl || '',
    });
    setShowForm(true);
    const { data } = await api.get(`/events/${ev.id}/assignments`);
    setAssignedUserIds(data.data.map((a) => a.userId));
  }

  // رفع لوجو خاص بالحفلة — بيظهر جنب لوجو الشركة في مستندات PDF وExcel
  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, logoUrl: data.data.url }));
    } catch (err) {
      setError(err.response?.data?.message || t('تعذر رفع الصورة'));
    } finally {
      setUploadingLogo(false);
    }
  }

  function toggleAssignedUser(userId) {
    setAssignedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/events/${editingId}`, {
          name: form.name,
          location: form.location,
          startDate: form.startDate,
          endDate: form.endDate,
          status: form.status,
          notes: form.notes,
        });
        await api.put(`/events/${editingId}/assignments`, { userIds: assignedUserIds });
      } else {
        await api.post('/events', { ...form, assignedUserIds });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('حدث خطأ'));
    }
  }

  async function handleDelete(ev) {
    if (!window.confirm(`${t('متأكد إنك عايز تحذف حفلة')} "${ev.name}"؟`)) return;
    try {
      await api.delete(`/events/${ev.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر الحذف — الحفلة ليها أذون صرف أو مرتجع مسجّلة عليها، غيّر حالتها لـ"ملغاة" بدلاً من الحذف'));
    }
  }

  return (
    <>
      <PageHeader
        title={t('الحفلات')}
        subtitle={`${meta.total} ${t('حفلة')}`}
        action={can('events', 'create') && <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">+ {t('حفلة جديدة')}</button>}
      />
      <div className="p-7">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('الرقم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الشعار')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('اسم الحفلة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('العميل')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
                <th className="text-right px-4 py-3 font-bold w-28">{t('إجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const [label, cls] = STATUS_LABELS[ev.status] || ['—', ''];
                return (
                  <tr key={ev.id} className="border-t border-gray-100 hover:bg-gray-50/60 transition">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{ev.number}</td>
                    <td className="px-4 py-3">
                      {ev.logoUrl ? (
                        <img src={getAssetUrl(ev.logoUrl)} alt="" className="w-9 h-9 rounded-lg object-contain border border-gray-200 bg-white" onError={(e) => (e.target.style.display = 'none')} />
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      <Link to={`/events/${ev.id}`} className="flex items-center gap-2 hover:text-blue-600 transition">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${SETTLEMENT_DOT[ev.settlementStatus]?.[0] || 'bg-gray-300'}`} title={t(SETTLEMENT_DOT[ev.settlementStatus]?.[1] || '')}></span>
                        {ev.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{ev.client?.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {new Date(ev.startDate).toLocaleDateString('ar-EG')} → {new Date(ev.endDate).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{t(label)}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(ev)} className="text-blue-600 text-xs font-bold hover:underline">{t('تعديل')}</button>
                        <button onClick={() => handleDelete(ev)} className="text-rose-600 text-xs font-bold hover:underline">{t('حذف')}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-600">{t('لا توجد حفلات')}</td></tr>}
            </tbody>
          </table>
          <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
        </div>

        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> {t('اتقفلت بالكامل')}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> {t('لسه فيها معلّق')}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block"></span> {t('لسه معملهاش صرف')}</span>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto py-10 px-4" >
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3.5 shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg mb-2">{editingId ? t('تعديل الحفلة') : t('حفلة جديدة')}</h3>
            {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}
            <input required placeholder={t('اسم الحفلة')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <select required disabled={!!editingId} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600">
              <option value="">{t('اختر العميل')}</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input placeholder={t('المكان')} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">{t('من')}</label>
                <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-600">{t('إلى')}</label>
                <input required type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            {editingId && (
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="ONGOING">{t('جارية الآن')}</option>
                <option value="CLOSED">{t('مغلقة')}</option>
                <option value="CANCELLED">{t('ملغاة')}</option>
              </select>
            )}

            <div>
              <label className="block text-xs font-bold mb-1.5 text-gray-600">{t('لوجو الحفلة (اختياري)')}</label>
              <div className="flex items-center gap-3">
                {form.logoUrl && <img src={getAssetUrl(form.logoUrl)} alt="" className="w-12 h-12 rounded-lg object-contain border border-gray-200 bg-white" />}
                <label className="border border-gray-200 hover:border-gray-300 text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer">
                  {uploadingLogo ? t('جاري الرفع...') : form.logoUrl ? t('تغيير الصورة') : t('رفع صورة')}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} disabled={uploadingLogo} className="hidden" />
                </label>
                {form.logoUrl && (
                  <button type="button" onClick={() => setForm({ ...form, logoUrl: '' })} className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-2 transition">
                    {t('حذف الصورة')}
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 text-gray-600">{t('الأوبريشن المعيّنين على الحفلة (اختياري)')}</label>
              <div className="border border-gray-200 rounded-xl max-h-40 overflow-y-auto divide-y divide-gray-50">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={assignedUserIds.includes(u.id)} onChange={() => toggleAssignedUser(u.id)} className="w-4 h-4 accent-blue-600" />
                    <span className="text-sm flex-1">{u.fullName}</span>
                    <span className="text-[11px] text-gray-500">{u.roleName}</span>
                  </label>
                ))}
                {users.length === 0 && <div className="text-center py-4 text-gray-500 text-xs">{t('لا يوجد مستخدمون')}</div>}
              </div>
              <div className="text-[11px] text-gray-600 mt-1">{t('لو حد من المعيّنين هنا مفعّل عليه "يشوف حفلاته المعيّن عليها بس"، هيقدر يشوف الحفلة دي.')}</div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition">{editingId ? t('حفظ التعديلات') : t('حفظ')}</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">{t('إلغاء')}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
