const prisma = require('../lib/prisma');
const { buildPeriodData, resolvePeriodRange } = require('../controllers/reports.controller');
const { buildWarehouseBreakdown } = require('./pdfService');
const { esc } = require('../utils/escapeHtml');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function thisMonthStr() {
  return new Date().toISOString().slice(0, 7);
}

/** يبني جسم الإيميل كـ HTML مرتب (لوجو + بطاقات إحصائيات + جدول حركة مخازن) بدل نص عادي */
function formatSummaryHtml(label, dateStr, data) {
  const s = data.summary;
  const warehouseRows = buildWarehouseBreakdown(data);

  const statBox = (value, text, color) => `
    <td style="padding:4px;">
      <div style="background:#f7f8fa;border-radius:10px;padding:12px 10px;text-align:center;">
        <div style="font-size:20px;font-weight:800;color:${color};">${value}</div>
        <div style="font-size:11px;color:#777;margin-top:2px;">${text}</div>
      </div>
    </td>`;

  const warehouseTableRows = warehouseRows
    .map(
      (w) => `<tr>
        <td style="padding:8px 10px;border:1px solid #e2e4e8;">${esc(w.name)}</td>
        <td style="padding:8px 10px;border:1px solid #e2e4e8;text-align:center;">${w.issuedCount}</td>
        <td style="padding:8px 10px;border:1px solid #e2e4e8;text-align:center;">${w.returnedCount}</td>
        <td style="padding:8px 10px;border:1px solid #e2e4e8;text-align:center;">${w.damagedCount}</td>
        <td style="padding:8px 10px;border:1px solid #e2e4e8;text-align:center;">${w.lostCount}</td>
      </tr>`
    )
    .join('');

  const eventsTableRows = data.newEvents
    .map(
      (e) => `<tr>
        <td style="padding:8px 10px;border:1px solid #e2e4e8;">${esc(e.name)}</td>
        <td style="padding:8px 10px;border:1px solid #e2e4e8;">${esc(e.client?.name || '—')}</td>
        <td style="padding:8px 10px;border:1px solid #e2e4e8;">${new Date(e.startDate).toLocaleDateString('ar-EG')}</td>
      </tr>`
    )
    .join('');

  return `
  <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;">
    <div style="background:#12151C;padding:18px 24px;border-radius:14px 14px 0 0;display:flex;align-items:center;gap:12px;">
      <img src="cid:uglogo" alt="UG" style="height:42px;width:42px;border-radius:8px;display:inline-block;vertical-align:middle;" />
      <span style="color:#fff;font-weight:800;font-size:16px;vertical-align:middle;">UG Production House</span>
    </div>

    <div style="padding:22px 24px;border:1px solid #eee;border-top:0;">
      <h2 style="margin:0 0 4px;font-size:18px;color:#12151C;">${label}</h2>
      <div style="font-size:12px;color:#888;margin-bottom:18px;">${dateStr}</div>

      <table width="100%" cellspacing="0" cellpadding="0"><tr>
        ${statBox(s.issueVouchersCount, 'أذون صرف', '#2D6CDF')}
        ${statBox(s.returnVouchersCount, 'أذون مرتجع', '#0E9F6E')}
        ${statBox(s.lossRecordsCount, 'سجلات فاقد', '#D6374B')}
        ${statBox(s.newEventsCount, 'حفلات جديدة', '#7C3AED')}
        ${statBox(s.activeEventsCount, 'حفلات شغّالة الآن', '#C77700')}
      </tr></table>

      <h3 style="font-size:14px;color:#12151C;margin:22px 0 8px;">حركة كل مخزن</h3>
      ${
        warehouseRows.length
          ? `<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:12px;">
              <thead><tr style="background:#12151C;color:#fff;">
                <th style="padding:8px 10px;text-align:right;">المخزن</th>
                <th style="padding:8px 10px;">عدد أذون الصرف</th>
                <th style="padding:8px 10px;">عدد أذون المرتجع</th>
                <th style="padding:8px 10px;">فيها تالف</th>
                <th style="padding:8px 10px;">عدد سجلات الفاقد</th>
              </tr></thead>
              <tbody>${warehouseTableRows}</tbody>
            </table>`
          : `<div style="font-size:12px;color:#999;">لا توجد حركة مخازن في الفترة دي</div>`
      }

      <h3 style="font-size:14px;color:#12151C;margin:22px 0 8px;">الحفلات الجديدة (${data.newEvents.length})</h3>
      ${
        data.newEvents.length
          ? `<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:12px;">
              <thead><tr style="background:#12151C;color:#fff;">
                <th style="padding:8px 10px;text-align:right;">اسم الحفلة</th>
                <th style="padding:8px 10px;text-align:right;">العميل</th>
                <th style="padding:8px 10px;text-align:right;">التاريخ</th>
              </tr></thead>
              <tbody>${eventsTableRows}</tbody>
            </table>`
          : `<div style="font-size:12px;color:#999;">لا توجد حفلات جديدة في الفترة دي</div>`
      }

      ${
        data.lowStockItems && data.lowStockItems.length
          ? `<div style="background:#FBE7EA;border:1px solid #f3c6cc;border-radius:10px;padding:12px 14px;margin-top:18px;font-size:12px;color:#8a1f2c;">
              ⚠ <b>${data.lowStockItems.length} صنف</b> وصل أو قرّب من الحد الأدنى دلوقتي: ${data.lowStockItems
              .slice(0, 5)
              .map((i) => i.name)
              .join('، ')}${data.lowStockItems.length > 5 ? '...' : ''}
            </div>`
          : ''
      }

      <div style="background:#FCF1DF;border:1px solid #F0DCB8;border-radius:10px;padding:12px 14px;margin-top:20px;font-size:12px;color:#7a5410;">
        📎 التفاصيل الكاملة (كل إذن صرف ومرتجع، وسجل الحركة الكامل بكل عملية) موجودة في ملف الـ PDF المرفق مع الرسالة دي.
      </div>

      <div style="font-size:10px;color:#aaa;text-align:center;margin-top:24px;">تم إصدار هذه الرسالة تلقائياً من نظام UG Production House ERP</div>
    </div>
  </div>
  `;
}

async function queueDailyReport(dateStr = todayStr()) {
  const { start, end } = resolvePeriodRange('day', dateStr);
  const data = await buildPeriodData({ start, end });
  await prisma.emailQueue.create({
    data: {
      subject: `[تقرير يومي] ${dateStr}`,
      body: formatSummaryHtml('التقرير اليومي', dateStr, data),
      reportType: 'daily',
      reportDate: dateStr,
    },
  });
}

async function queueMonthlyReport(monthStr = thisMonthStr()) {
  const { start, end } = resolvePeriodRange('month', monthStr);
  const data = await buildPeriodData({ start, end });
  await prisma.emailQueue.create({
    data: {
      subject: `[تقرير شهري] ${monthStr}`,
      body: formatSummaryHtml('التقرير الشهري', monthStr, data),
      reportType: 'monthly',
      reportDate: monthStr,
    },
  });
}

/**
 * كل ساعة بتفحص: هل وصل معاد إرسال التقرير اليومي (ساعة محددة كل يوم)؟
 * وهل النهاردة آخر يوم في الشهر (عشان تبعت الشهري كمان)؟
 * بتتأكد إنها مبعتتش نفس التقرير مرتين في نفس اليوم.
 */
function startReportEmailScheduler() {
  const targetHour = Number(process.env.DAILY_REPORT_HOUR ?? 22);

  setInterval(async () => {
    try {
      const now = new Date();
      if (now.getHours() !== targetHour) return;

      const dateStr = todayStr();
      const dailySubject = `[تقرير يومي] ${dateStr}`;
      const alreadySentDaily = await prisma.emailQueue.findFirst({ where: { subject: dailySubject } });
      if (!alreadySentDaily) await queueDailyReport(dateStr);

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isLastDayOfMonth = tomorrow.getMonth() !== now.getMonth();
      if (isLastDayOfMonth) {
        const monthStr = thisMonthStr();
        const monthlySubject = `[تقرير شهري] ${monthStr}`;
        const alreadySentMonthly = await prisma.emailQueue.findFirst({ where: { subject: monthlySubject } });
        if (!alreadySentMonthly) await queueMonthlyReport(monthStr);
      }
    } catch (err) {
      console.error('خطأ في جدولة التقارير الدورية بالإيميل:', err.message);
    }
  }, 60 * 60 * 1000); // فحص كل ساعة

  console.log(`✓ التقارير الدورية بالإيميل مجدولة (يومياً الساعة ${targetHour}:00، وشهرياً آخر يوم في الشهر)`);
}

module.exports = { queueDailyReport, queueMonthlyReport, startReportEmailScheduler };
