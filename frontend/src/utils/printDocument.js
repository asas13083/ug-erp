import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { UG_LOGO_DATA_URI } from '../assets/logoBase64';
import api from '../api/client';
import { esc } from './escapeHtml';

// بيانات الشركة بتتجاب مرة واحدة وتتخزّن في الذاكرة لباقي الجلسة — كل الأذون
// اللي بتتصدّر بعد كده بتاخدها تلقائياً من غير ما كل صفحة تجيبها بنفسها
let cachedCompanySettings = null;
async function getCompanySettings() {
  if (cachedCompanySettings) return cachedCompanySettings;
  try {
    const { data } = await api.get('/company-settings');
    cachedCompanySettings = data.data;
  } catch (err) {
    cachedCompanySettings = {};
  }
  return cachedCompanySettings;
}

// أبعاد صفحة A4 بالنقطة (pt) زي ما بيستخدمها jsPDF بالظبط
const PAGE_WIDTH_PT = 595.28;
const PAGE_HEIGHT_PT = 841.89;
const SHEET_WIDTH_PX = 780; // عرض الورقة الثابت في الـ CSS
const PAGE_HEIGHT_PX = (PAGE_HEIGHT_PT * SHEET_WIDTH_PX) / PAGE_WIDTH_PT;

function buildHeaderAndBodyHtml(title, bodyHtml, { docNumber, clientLogoUrl, clientName, eventLogoUrl, company } = {}) {
  const companyName = esc(company?.companyName || 'UG Production House');

  return `
    <div class="doc-header">
      <div class="brand-block">
        <img src="${UG_LOGO_DATA_URI}" alt="UG" />
        <div class="brand-text"><b>${companyName}</b>Inventory ERP</div>
      </div>
      ${eventLogoUrl ? `<img class="event-logo" src="${eventLogoUrl}" alt="event logo" crossorigin="anonymous" />` : ''}
      <div style="display:flex; align-items:center; gap:16px;">
        ${clientLogoUrl || clientName ? `
          <div class="client-block">
            ${clientLogoUrl ? `<img class="client-logo" src="${clientLogoUrl}" alt="client logo" crossorigin="anonymous" />` : ''}
            ${clientName ? `<div class="client-name">${esc(clientName)}</div>` : ''}
          </div>
        ` : ''}
        <div class="doc-title-block">
          <h1>${esc(title)}</h1>
          ${docNumber ? `<div class="doc-number">${esc(docNumber)}</div>` : ''}
        </div>
      </div>
    </div>
    ${bodyHtml}
  `;
}

function buildFooterHtml(company) {
  const companyName = esc(company?.companyName || 'UG Production House');
  const companyLines = [company?.phone, company?.address, company?.email].filter(Boolean);

  return `
    <div class="footer-sign"><div>توقيع المستلم</div><div>توقيع المسؤول</div></div>
    <div class="footer-bottom">
      <div class="company-details">
        ${companyLines.map((line) => `<div>${esc(line)}</div>`).join('')}
      </div>
      <div class="doc-footer-note">تم إصدار هذا المستند تلقائياً من نظام ${companyName} — Inventory ERP</div>
    </div>
  `;
}

const DOCUMENT_STYLES = `
  * { box-sizing: border-box; font-family: 'Tajawal', Arial, sans-serif; }
  body { padding: 0; margin: 0; color: #1a1d23; }
  .sheet { width: ${SHEET_WIDTH_PX}px; margin: 0 auto; padding: 28px 34px; background: #fff; }
  .doc-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #12151C; padding-bottom: 18px; margin-bottom: 22px; }
  .brand-block { display: flex; align-items: center; gap: 12px; }
  .brand-block img { height: 46px; width: auto; border-radius: 8px; }
  .brand-block .brand-text { font-size: 12px; color: #666; line-height: 1.4; }
  .brand-block .brand-text b { display: block; font-size: 14px; color: #12151C; }
  .client-block { display: flex; align-items: center; gap: 8px; }
  .client-logo { height: 40px; width: auto; border-radius: 6px; opacity: .9; }
  .event-logo { height: 46px; width: auto; object-fit: contain; }
  .client-name { font-size: 13px; font-weight: 700; color: #12151C; }
  .doc-title-block { text-align: left; }
  .doc-title-block h1 { font-size: 19px; margin: 0 0 4px; color: #12151C; }
  .doc-title-block .doc-number { font-size: 12px; color: #888; font-family: monospace; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 18px; font-size: 13px; background: #f9fafb; padding: 14px 16px; border-radius: 10px; }
  .meta b { display: inline-block; min-width: 90px; color: #444; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #e2e4e8; padding: 9px 12px; text-align: right; font-size: 13px; }
  th { background: #12151C; color: #fff; font-weight: 700; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  .footer-sign { display: flex; justify-content: space-between; font-size: 13px; }
  .footer-sign div { border-top: 1px solid #999; padding-top: 6px; width: 170px; text-align: center; color: #555; }
  .footer-bottom { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; }
  .company-details { font-size: 10.5px; color: #999; line-height: 1.7; text-align: right; }
  .doc-footer-note { font-size: 10.5px; color: #aaa; }
`;

/**
 * بيقيس ارتفاع المحتوى (من غير الإمضاء) فعلياً في المتصفح، وبيحسب مسافة
 * فاضية (spacer) تدفع الإمضاء تنزل بالظبط على حافة آخر صفحة فعلية —
 * بدل ما تظهر فجأة في نص الصفحة لو الجدول قصير.
 */
function measureSpacerHeight(headerAndBodyHtml, footerHtml) {
  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.top = '-99999px';
  probe.style.left = '-99999px';
  probe.innerHTML = `<style>${DOCUMENT_STYLES}</style><div class="sheet">${headerAndBodyHtml}</div>`;
  document.body.appendChild(probe);

  const footerProbe = document.createElement('div');
  footerProbe.style.position = 'fixed';
  footerProbe.style.top = '-99999px';
  footerProbe.style.left = '-99999px';
  footerProbe.style.width = `${SHEET_WIDTH_PX}px`;
  footerProbe.innerHTML = `<style>${DOCUMENT_STYLES}</style>${footerHtml}`;
  document.body.appendChild(footerProbe);

  const contentHeight = probe.querySelector('.sheet').scrollHeight;
  const footerHeight = footerProbe.scrollHeight;

  document.body.removeChild(probe);
  document.body.removeChild(footerProbe);

  const spaceLeftOnCurrentPage = PAGE_HEIGHT_PX - (contentHeight % PAGE_HEIGHT_PX);
  let spacer = spaceLeftOnCurrentPage - footerHeight;
  if (spacer < 0) spacer += PAGE_HEIGHT_PX; // الإمضاء مش هتخش في المساحة الفاضلة، ادفعها لآخر الصفحة اللي بعدها
  return Math.max(spacer, 0);
}

/**
 * تحميل المستند كملف PDF فعلي مباشرة (بدون نافذة طباعة) — بيحافظ على شكل
 * العربي 100% لأنه بيصوّر المحتوى المعروض فعلياً في المتصفح. بيانات الشركة
 * بتتحط تلقائياً، والإمضاء بيتثبّت أسفل آخر صفحة فعلياً.
 */
export async function downloadPdf(title, bodyHtml, opts = {}) {
  const filename = opts.filename || `${title}.pdf`;
  const company = await getCompanySettings();

  const headerAndBody = buildHeaderAndBodyHtml(title, bodyHtml, { ...opts, company });
  const footerOnly = buildFooterHtml(company);
  const spacerHeight = measureSpacerHeight(headerAndBody, footerOnly);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.innerHTML = `<style>${DOCUMENT_STYLES}</style><div class="sheet">${headerAndBody}<div style="height:${spacerHeight}px"></div>${footerOnly}</div>`;
  document.body.appendChild(container);

  try {
    const sheetEl = container.querySelector('.sheet');
    const canvas = await html2canvas(sheetEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

/** فتح نافذة طباعة تقليدية (اختياري، لمن يفضل الطباعة الورقية المباشرة) */
export async function printDocument(title, bodyHtml, opts = {}) {
  const company = await getCompanySettings();
  const win = window.open('', '_blank', 'width=850,height=950');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head><meta charset="UTF-8"><title>${title}</title><style>${DOCUMENT_STYLES}
      @media print { body { padding: 0; } .sheet { padding: 8mm 12mm; } }
    </style></head>
    <body><div class="sheet">${buildHeaderAndBodyHtml(title, bodyHtml, { ...opts, company })}<div style="margin-top:70px">${buildFooterHtml(company)}</div></div></body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
