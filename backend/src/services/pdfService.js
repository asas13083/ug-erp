const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const prisma = require('../lib/prisma');
const { buildPeriodData, resolvePeriodRange } = require('../controllers/reports.controller');
const { esc } = require('../utils/escapeHtml');

const LOGO_PATH = path.join(__dirname, '../assets/ug-logo.jpg');
const LOGO_BASE64 = `data:image/jpeg;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`;

const STYLES = `
  * { box-sizing: border-box; font-family: 'Tajawal', Arial, sans-serif; }
  body { padding: 0; margin: 0; color: #1a1d23; }
  .sheet { padding: 20px 28px; }
  .doc-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #12151C; padding-bottom: 14px; margin-bottom: 18px; }
  .brand-block { display: flex; align-items: center; gap: 10px; }
  .brand-block img { height: 40px; width: auto; border-radius: 6px; }
  .brand-block .brand-text { font-size: 11px; color: #666; line-height: 1.4; }
  .brand-block .brand-text b { display: block; font-size: 13px; color: #12151C; }
  .doc-title-block h1 { font-size: 17px; margin: 0; color: #12151C; }
  .doc-title-block .sub { font-size: 11px; color: #888; }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
  .stat { flex: 1; min-width: 110px; background: #f9fafb; border-radius: 10px; padding: 10px 12px; }
  .stat b { display: block; font-size: 18px; color: #12151C; }
  .stat span { font-size: 10px; color: #777; }
  h2 { font-size: 14px; margin: 20px 0 8px; color: #12151C; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { border: 1px solid #e2e4e8; padding: 6px 9px; text-align: right; font-size: 11px; }
  th { background: #12151C; color: #fff; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  .footer-note { margin-top: 22px; font-size: 9px; color: #aaa; text-align: center; }
`;

/** يجمع عدد أذون الصرف/المرتجع/التالف/الفاقد لكل مخزن على حدة (بالعدد مش الكمية) */
function buildWarehouseBreakdown(data) {
  const map = new Map(); // warehouseId -> { name, issuedCount, returnedCount, damagedCount, lostCount }

  function ensure(w) {
    const id = w?.id || 'unknown';
    if (!map.has(id)) map.set(id, { name: w?.name || 'غير محدد', issuedCount: 0, returnedCount: 0, damagedCount: 0, lostCount: 0 });
    return map.get(id);
  }

  data.issueVouchers.forEach((v) => {
    ensure(v.warehouse).issuedCount += 1;
  });
  data.returnVouchers.forEach((v) => {
    const row = ensure(v.warehouse);
    row.returnedCount += 1;
    if (v.items.some((i) => i.damagedQuantity > 0)) row.damagedCount += 1;
  });
  data.lossRecords.forEach((l) => {
    ensure(l.warehouse).lostCount += 1;
  });

  return Array.from(map.values());
}

function buildReportHtml(title, subDate, data) {
  const s = data.summary;
  const warehouseRows = buildWarehouseBreakdown(data);

  const warehouseTable = warehouseRows.length
    ? `<table>
        <thead><tr><th>المخزن</th><th>عدد أذون الصرف</th><th>عدد أذون المرتجع</th><th>فيها تالف</th><th>عدد سجلات الفاقد</th></tr></thead>
        <tbody>${warehouseRows.map((w) => `<tr><td>${esc(w.name)}</td><td>${w.issuedCount}</td><td>${w.returnedCount}</td><td>${w.damagedCount}</td><td>${w.lostCount}</td></tr>`).join('')}</tbody>
      </table>`
    : `<div style="font-size:12px;color:#999;">لا توجد حركة مخازن في الفترة دي</div>`;

  const issueRows = data.issueVouchers
    .flatMap((v) => v.items.map((i) => `<tr><td>${esc(v.number)}</td><td>${esc(v.warehouse?.name || '—')}</td><td>${esc(v.event?.name || '—')}</td><td>${esc(i.item.name)}</td><td>${i.quantity}</td></tr>`))
    .join('');
  const returnRows = data.returnVouchers
    .flatMap((v) => v.items.map((i) => `<tr><td>${esc(v.number)}</td><td>${esc(v.warehouse?.name || '—')}</td><td>${esc(v.event?.name || '—')}</td><td>${esc(i.item.name)}</td><td>سليم ${i.returnedQuantity} / تالف ${i.damagedQuantity} / فاقد ${i.lostQuantity}</td></tr>`))
    .join('');

  const activityRows = data.activityLogs
    .map((l) => `<tr><td>${esc(l.action)}</td><td>${esc(l.description)}</td><td>${esc(l.user?.fullName || '—')}</td><td>${new Date(l.createdAt).toLocaleString('ar-EG')}</td></tr>`)
    .join('');

  return `
    <div class="sheet">
      <div class="doc-header">
        <div class="brand-block">
          <img src="${LOGO_BASE64}" alt="UG" />
          <div class="brand-text"><b>UG Production House</b>Inventory ERP</div>
        </div>
        <div class="doc-title-block">
          <h1>${title}</h1>
          <div class="sub">${subDate}</div>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><b>${s.issueVouchersCount}</b><span>أذون صرف</span></div>
        <div class="stat"><b>${s.totalIssuedQty}</b><span>أصناف مصروفة</span></div>
        <div class="stat"><b>${s.returnVouchersCount}</b><span>أذون مرتجع</span></div>
        <div class="stat"><b>${s.totalDamagedQty}</b><span>أصناف تالفة</span></div>
        <div class="stat"><b>${s.lossRecordsCount}</b><span>سجلات فاقد</span></div>
        <div class="stat"><b>${s.newEventsCount}</b><span>حفلات جديدة</span></div>
        <div class="stat"><b>${s.activeEventsCount}</b><span>حفلات شغّالة الآن</span></div>
      </div>

      <h2>حركة كل مخزن</h2>
      ${warehouseTable}

      <h2>الحفلات الجديدة (${data.newEvents.length})</h2>
      ${
        data.newEvents.length
          ? `<table><thead><tr><th>اسم الحفلة</th><th>العميل</th><th>المكان</th><th>التاريخ</th></tr></thead><tbody>${data.newEvents
              .map((e) => `<tr><td>${esc(e.name)}</td><td>${esc(e.client?.name || '—')}</td><td>${esc(e.location || '—')}</td><td>${new Date(e.startDate).toLocaleDateString('ar-EG')}</td></tr>`)
              .join('')}</tbody></table>`
          : `<div style="font-size:12px;color:#999;">لا توجد حفلات جديدة في الفترة دي</div>`
      }

      ${
        data.lowStockItems && data.lowStockItems.length
          ? `<h2 style="color:#D6374B;">⚠ تنبيه نقص المخزون الحالي (${data.lowStockItems.length} صنف)</h2>
             <table><thead><tr><th>الكود</th><th>الصنف</th><th>الكمية الحالية</th><th>الحد الأدنى</th></tr></thead><tbody>${data.lowStockItems
               .map((i) => `<tr><td>${esc(i.code)}</td><td>${esc(i.name)}</td><td>${i.total}</td><td>${i.min}</td></tr>`)
               .join('')}</tbody></table>`
          : ''
      }

      ${issueRows ? `<h2>تفاصيل الصرف</h2><table><thead><tr><th>رقم الإذن</th><th>المخزن</th><th>الحفلة</th><th>الصنف</th><th>الكمية</th></tr></thead><tbody>${issueRows}</tbody></table>` : ''}
      ${returnRows ? `<h2>تفاصيل المرتجع</h2><table><thead><tr><th>رقم الإذن</th><th>المخزن</th><th>الحفلة</th><th>الصنف</th><th>التفاصيل</th></tr></thead><tbody>${returnRows}</tbody></table>` : ''}

      <h2>سجل الحركة الكامل (${data.activityLogs.length} عملية)</h2>
      ${activityRows ? `<table><thead><tr><th>النوع</th><th>الوصف</th><th>المستخدم</th><th>الوقت</th></tr></thead><tbody>${activityRows}</tbody></table>` : `<div style="font-size:12px;color:#999;">لا توجد عمليات مسجّلة في الفترة دي</div>`}

      <div class="footer-note">تم إصدار هذا المستند تلقائياً من نظام UG Production House ERP</div>
    </div>
  `;
}

/** يولّد PDF فعلي (Buffer) لتقرير يومي أو شهري، شامل حركة كل مخزن */
async function generateReportPdf(reportType, dateStr) {
  const type = reportType === 'monthly' ? 'month' : 'day';
  const { start, end } = resolvePeriodRange(type, dateStr);
  const data = await buildPeriodData({ start, end });

  const title = reportType === 'monthly' ? `التقرير الشهري` : `التقرير اليومي`;
  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
      <style>${STYLES}</style>
    </head>
    <body>${buildReportHtml(title, dateStr, data)}</body>
    </html>
  `;

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const buffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
    return buffer;
  } finally {
    await browser.close();
  }
}

module.exports = { generateReportPdf, buildWarehouseBreakdown };
