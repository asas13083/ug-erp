import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { downloadFile } from '../utils/downloadFile';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { getAssetUrl } from '../utils/assetUrl';
import { useLanguage } from '../context/LanguageContext';

const STATUS_LABELS = {
  PLANNED: ['مخطط لها', 'bg-blue-50 text-blue-600'],
  ONGOING: ['جارية الآن', 'bg-amber-50 text-amber-600'],
  CLOSED: ['مغلقة', 'bg-emerald-50 text-emerald-600'],
  CANCELLED: ['ملغاة', 'bg-gray-100 text-gray-600'],
};

export default function ClientDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get(`/clients/${id}`)
      .then(({ data }) => setClient(data.data))
      .catch((err) => setError(err.response?.data?.message || t('تعذر تحميل بيانات العميل')))
      .finally(() => setLoading(false));
  }, [id]);

  function handlePdf() {
    const rows = client.events
      .map((e) => `<tr><td>${esc(e.number)}</td><td>${esc(e.name)}</td><td>${esc(e.location || '—')}</td><td>${new Date(e.startDate).toLocaleDateString('ar-EG')}</td><td>${esc(STATUS_LABELS[e.status]?.[0] || e.status)}</td></tr>`)
      .join('');
    downloadPdf(
      `حفلات العميل — ${esc(client.name)}`,
      `<table><thead><tr><th>الرقم</th><th>اسم الحفلة</th><th>المكان</th><th>التاريخ</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table>`,
      { clientLogoUrl: getAssetUrl(client.logoUrl), clientName: client.name, filename: `عميل-${client.name}.pdf` }
    );
  }

  if (loading) return <div className="p-10 text-center text-gray-600">{t('جاري تحميل بيانات العميل...')}</div>;
  if (error) return <div className="p-10 text-center text-rose-600">{error}</div>;
  if (!client) return <div className="p-10 text-center text-gray-600">{t('العميل غير موجود')}</div>;

  return (
    <>
      <PageHeader
        title={client.name}
        subtitle={`${client.company || ''} · ${client.phone || ''}`}
        action={
          <div className="flex gap-2">
            <Link to="/clients" className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('كل العملاء')}</Link>
            <button onClick={handlePdf} className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-lg hover:border-gray-300 transition">{t('تحميل PDF')}</button>
            <button onClick={() => downloadFile(`/reports/client/${id}.xlsx`, `عميل-${client.name}.xlsx`)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">{t('تصدير Excel')}</button>
          </div>
        }
      />
      <div className="p-7">
        <div className="flex items-center gap-4 mb-6">
          {client.logoUrl && <img src={getAssetUrl(client.logoUrl)} alt="logo" className="h-12 rounded-lg border border-gray-100 p-1 bg-white" />}
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
            <div className="text-2xl font-extrabold text-blue-600">{client.events.length}</div>
            <div className="text-xs text-gray-600 font-medium mt-1">{t('حفلة تعامل بها العميل')}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('الرقم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('اسم الحفلة')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('المكان')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحالة')}</th>
              </tr>
            </thead>
            <tbody>
              {client.events.map((e) => {
                const [label, cls] = STATUS_LABELS[e.status] || ['—', ''];
                return (
                  <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50/60 transition">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      <Link to={`/events/${e.id}`} className="text-blue-600 hover:underline">{e.number}</Link>
                    </td>
                    <td className="px-4 py-3 font-bold">{e.name}</td>
                    <td className="px-4 py-3">{e.location || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{new Date(e.startDate).toLocaleDateString('ar-EG')}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{t(label)}</span></td>
                  </tr>
                );
              })}
              {client.events.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-600">{t('لا توجد حفلات لهذا العميل بعد')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
