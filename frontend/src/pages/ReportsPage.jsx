import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { downloadFile } from '../utils/downloadFile';
import api from '../api/client';
import { downloadPdf } from '../utils/printDocument';
import { esc } from '../utils/escapeHtml';
import { useLanguage } from '../context/LanguageContext';

function ReportCard({ title, desc, onExcel, onPdf, onOpen }) {
  const { t } = useLanguage();
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="font-extrabold text-sm">{title}</div>
      <div className="text-xs text-gray-600 mt-1 mb-4">{desc}</div>
      <div className="flex gap-2 flex-wrap">
        {onOpen && <button onClick={onOpen} className="border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:border-gray-300 transition">{t('فتح السجل')}</button>}
        {onPdf && <button onClick={onPdf} className="border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:border-gray-300 transition">{t('تحميل PDF')}</button>}
        {onExcel && <button onClick={onExcel} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">{t('تصدير Excel')}</button>}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    api.get('/warehouses', { params: { pageSize: 200 } }).then(({ data }) => setWarehouses(data.data));
  }, []);

  async function stockPdf() {
    const { data } = await api.get('/items', { params: { pageSize: 1000 } });
    const rows = data.data.map((i) => `<tr><td>${esc(i.code)}</td><td>${esc(i.name)}</td><td>${esc(i.category?.name)}</td><td>${i.totalQuantity}</td><td>${i.minQuantity}</td></tr>`).join('');
    downloadPdf('تقرير رصيد المخزون', `<table><thead><tr><th>الكود</th><th>الصنف</th><th>التصنيف</th><th>الكمية</th><th>الحد الأدنى</th></tr></thead><tbody>${rows}</tbody></table>`, { filename: 'تقرير-رصيد-المخزون.pdf' });
  }

  async function warehousesMovementPdf() {
    const rowsPerWarehouse = await Promise.all(
      warehouses.map(async (w) => {
        const { data } = await api.get(`/warehouses/${w.id}/stock`);
        return data.data.map((s) => `<tr><td>${esc(w.name)}</td><td>${esc(s.item.name)}</td><td>${esc(s.item.category?.name || '—')}</td><td>${s.quantity}</td><td>${s.reservedQty}</td></tr>`);
      })
    );
    const rows = rowsPerWarehouse.flat().join('');
    downloadPdf('تقرير حركة المخازن', `<table><thead><tr><th>المخزن</th><th>الصنف</th><th>التصنيف</th><th>الكمية</th><th>محجوز</th></tr></thead><tbody>${rows}</tbody></table>`, { filename: 'تقرير-حركة-المخازن.pdf' });
  }

  async function eventsPdf() {
    const { data } = await api.get('/events', { params: { pageSize: 1000 } });
    const rows = data.data.map((e) => `<tr><td>${esc(e.number)}</td><td>${esc(e.name)}</td><td>${esc(e.client?.name || '—')}</td><td>${new Date(e.startDate).toLocaleDateString('ar-EG')}</td><td>${esc(e.status)}</td></tr>`).join('');
    downloadPdf('تقرير الحفلات', `<table><thead><tr><th>الرقم</th><th>اسم الحفلة</th><th>العميل</th><th>التاريخ</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table>`, { filename: 'تقرير-الحفلات.pdf' });
  }

  async function issueVouchersPdf() {
    const { data } = await api.get('/issue-vouchers', { params: { pageSize: 1000 } });
    const rows = data.data.map((v) => `<tr><td>${esc(v.number)}</td><td>${esc(v.event?.name || '—')}</td><td>${esc(v.warehouse?.name || '—')}</td><td>${esc(v.recipientName)}</td><td>${esc(v.items.map((i) => `${i.item.name} ×${i.quantity}`).join('، '))}</td><td>${v.status === 'CANCELLED' ? 'ملغى' : 'فعّال'}</td></tr>`).join('');
    downloadPdf('تقرير أذون الصرف', `<table><thead><tr><th>رقم الإذن</th><th>الحفلة</th><th>المخزن</th><th>المستلم</th><th>الأصناف</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table>`, { filename: 'تقرير-أذون-الصرف.pdf' });
  }

  async function returnVouchersPdf() {
    const { data } = await api.get('/return-vouchers', { params: { pageSize: 1000 } });
    const rows = data.data
      .map((v) => `<tr><td>${esc(v.number)}</td><td>${esc(v.event?.name || '—')}</td><td>${esc(v.items.map((i) => `${i.item.name}: سليم ${i.returnedQuantity}، تالف ${i.damagedQuantity}`).join('، '))}</td><td>${v.status === 'CANCELLED' ? 'ملغى' : 'فعّال'}</td></tr>`)
      .join('');
    downloadPdf('تقرير أذون المرتجع', `<table><thead><tr><th>رقم الإذن</th><th>الحفلة</th><th>التفاصيل</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table>`, { filename: 'تقرير-أذون-المرتجع.pdf' });
  }

  async function lossPdf() {
    const { data } = await api.get('/loss-records', { params: { pageSize: 1000 } });
    const rows = data.data.map((l) => `<tr><td>${esc(l.item?.name)}</td><td>${esc(l.reason)}</td><td>${l.quantity}</td><td>${esc(l.event?.name || '—')}</td><td>${l.status === 'CANCELLED' ? 'ملغى' : 'فعّال'}</td></tr>`).join('');
    downloadPdf('تقرير الفاقد', `<table><thead><tr><th>الصنف</th><th>السبب</th><th>الكمية</th><th>الحفلة</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table>`, { filename: 'تقرير-الفاقد.pdf' });
  }

  async function activityLogPdf() {
    const { data } = await api.get('/activity-log', { params: { pageSize: 500 } });
    const rows = data.data.map((l) => `<tr><td>${esc(l.action)}</td><td>${esc(l.description)}</td><td>${esc(l.user?.fullName || '—')}</td><td>${new Date(l.createdAt).toLocaleString('ar-EG')}</td></tr>`).join('');
    downloadPdf('تقرير سجل الحركة', `<table><thead><tr><th>العملية</th><th>الوصف</th><th>المستخدم</th><th>الوقت</th></tr></thead><tbody>${rows}</tbody></table>`, { filename: 'تقرير-سجل-الحركة.pdf' });
  }

  async function warehousePdf(w, type) {
    if (type === 'stock') {
      const { data } = await api.get(`/warehouses/${w.id}/stock`);
      const rows = data.data.map((s) => `<tr><td>${esc(s.item.code)}</td><td>${esc(s.item.name)}</td><td>${s.quantity}</td><td>${s.reservedQty}</td></tr>`).join('');
      downloadPdf(`رصيد مخزن ${esc(w.name)}`, `<table><thead><tr><th>الكود</th><th>الصنف</th><th>الكمية</th><th>محجوز</th></tr></thead><tbody>${rows}</tbody></table>`, { filename: `رصيد-مخزن-${w.name}.pdf` });
    } else if (type === 'issued') {
      const { data } = await api.get('/issue-vouchers', { params: { warehouseId: w.id, pageSize: 1000 } });
      const rows = data.data.map((v) => `<tr><td>${esc(v.number)}</td><td>${esc(v.event?.name || '—')}</td><td>${esc(v.items.map((i) => `${i.item.name} ×${i.quantity}`).join('، '))}</td><td>${v.status === 'CANCELLED' ? 'ملغى' : 'فعّال'}</td></tr>`).join('');
      downloadPdf(`صرف مخزن ${esc(w.name)}`, `<table><thead><tr><th>رقم الإذن</th><th>الحفلة</th><th>الأصناف</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table>`, { filename: `صرف-مخزن-${w.name}.pdf` });
    } else if (type === 'lost') {
      const { data } = await api.get('/loss-records', { params: { warehouseId: w.id, pageSize: 1000 } });
      const rows = data.data.map((l) => `<tr><td>${esc(l.item?.name)}</td><td>${esc(l.reason)}</td><td>${l.quantity}</td><td>${l.status === 'CANCELLED' ? 'ملغى' : 'فعّال'}</td></tr>`).join('');
      downloadPdf(`فاقد مخزن ${esc(w.name)}`, `<table><thead><tr><th>الصنف</th><th>السبب</th><th>الكمية</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table>`, { filename: `فاقد-مخزن-${w.name}.pdf` });
    }
  }

  return (
    <>
      <PageHeader title={t('التقارير')} subtitle={t('تقرير منفصل قابل للتصدير لكل قسم — بلوجو UG مضمّن تلقائياً في كل ملف')} />
      <div className="p-7">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <ReportCard
            title={t('رصيد المخزون (كل المخازن مجمّعة)')}
            desc={t('كل الأصناف والكميات الحالية في كل المخازن')}
            onExcel={() => downloadFile('/reports/stock.xlsx', 'تقرير-رصيد-المخزون.xlsx')}
            onPdf={stockPdf}
          />
          <ReportCard
            title={t('حركة المخازن (كل المخازن مجمّعة)')}
            desc={t('رصيد كل صنف داخل كل مخزن على حدة')}
            onExcel={() => downloadFile('/reports/warehouses.xlsx', 'تقرير-حركة-المخازن.xlsx')}
            onPdf={warehousesMovementPdf}
          />
          <ReportCard
            title={t('تقرير الحفلات')}
            desc={t('كل الحفلات وحالتها وتواريخها')}
            onExcel={() => downloadFile('/reports/events.xlsx', 'تقرير-الحفلات.xlsx')}
            onPdf={eventsPdf}
            onOpen={() => navigate('/events')}
          />
          <ReportCard
            title={t('تقرير الصرف (كل المخازن مجمّعة)')}
            desc={t('كل أذون الصرف — Excel أو PDF، أو تحميل PDF لكل إذن على حدة من السجل')}
            onExcel={() => downloadFile('/reports/issue-vouchers.xlsx', 'تقرير-أذون-الصرف.xlsx')}
            onPdf={issueVouchersPdf}
            onOpen={() => navigate('/issue-vouchers-log')}
          />
          <ReportCard
            title={t('تقرير المرتجع (كل المخازن مجمّعة)')}
            desc={t('سليم/تالف/مفقود لكل حفلة')}
            onExcel={() => downloadFile('/reports/return-vouchers.xlsx', 'تقرير-أذون-المرتجع.xlsx')}
            onPdf={returnVouchersPdf}
            onOpen={() => navigate('/return-vouchers-log')}
          />
          <ReportCard
            title={t('تقرير الفاقد (كل المخازن مجمّعة)')}
            desc={t('كل التلف والفقد والسرقة المسجّلة')}
            onExcel={() => downloadFile('/reports/loss.xlsx', 'تقرير-الفاقد.xlsx')}
            onPdf={lossPdf}
            onOpen={() => navigate('/loss')}
          />
          <ReportCard
            title={t('سجل الحركة الكامل')}
            desc={t('كل عملية حصلت في النظام (حتى 500 عملية في PDF، 2000 في Excel)')}
            onExcel={() => downloadFile('/reports/activity-log.xlsx', 'تقرير-سجل-الحركة.xlsx')}
            onPdf={activityLogPdf}
            onOpen={() => navigate('/log')}
          />
          <ReportCard
            title={t('تقرير يومي / شهري شامل')}
            desc={t('ملخص كل حاجة حصلت في يوم أو شهر معين — صرف، مرتجع، فاقد، وأكتر')}
            onOpen={() => navigate('/period-report')}
          />
        </div>

        <div className="font-extrabold text-base mb-1">{t('تقارير كل مخزن لوحده')}</div>
        <div className="text-xs text-gray-600 mb-4">{t('اختار مخزن واطلع تقريره الخاص بيه بس — رصيد، صرف، أو فاقد — Excel أو PDF')}</div>

        <div className="space-y-3">
          {warehouses.map((w) => (
            <div key={w.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[140px]">
                <Link to={`/warehouses/${w.id}`} className="font-extrabold text-sm hover:text-blue-600 transition">{w.name}</Link>
                <div className="text-xs text-gray-600">{w.location || '—'}</div>
              </div>
              <button onClick={() => warehousePdf(w, 'stock')} className="border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:border-gray-300 transition">{t('رصيد PDF')}</button>
              <button onClick={() => downloadFile(`/reports/warehouse/${w.id}.xlsx`, `رصيد-مخزن-${w.name}.xlsx`)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">{t('رصيد Excel')}</button>
              <button onClick={() => warehousePdf(w, 'issued')} className="border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:border-gray-300 transition">{t('صرف PDF')}</button>
              <button onClick={() => downloadFile(`/reports/warehouse/${w.id}/issued.xlsx`, `صرف-مخزن-${w.name}.xlsx`)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">{t('صرف Excel')}</button>
              <button onClick={() => warehousePdf(w, 'lost')} className="border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:border-gray-300 transition">{t('فاقد PDF')}</button>
              <button onClick={() => downloadFile(`/reports/warehouse/${w.id}/lost.xlsx`, `فاقد-مخزن-${w.name}.xlsx`)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">{t('فاقد Excel')}</button>
            </div>
          ))}
          {warehouses.length === 0 && <div className="text-center py-8 text-gray-600 text-sm">{t('لا توجد مخازن بعد')}</div>}
        </div>
      </div>
    </>
  );
}
