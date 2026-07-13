const ExcelJS = require('exceljs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '../assets/ug-logo.jpg');

/**
 * يبني ملف Excel احترافي فيه:
 * - لوجو UG Production House في الرأس
 * - عنوان التقرير
 * - جدول البيانات بتنسيق واضح
 *
 * @param {string} title - عنوان التقرير (يظهر أعلى الملف)
 * @param {string[]} headers - رؤوس الأعمدة
 * @param {Array<Array>} rows - صفوف البيانات
 * @param {{ highlightRows?: number[] }} [options] - أرقام صفوف (0-based من rows)
 *   تتلوّن وتتخطّط بالعريض — مفيد لصفوف الإجمالي، مش لازم تتحدد وقتها كل
 *   التقارير القديمة بتفضل شغالة زي ما هي بالظبط من غير أي تغيير
 * @returns {Promise<Buffer>} ملف Excel جاهز للإرسال
 */
async function buildExcelReport(title, headers, rows, options = {}) {
  const highlightRows = new Set(options.highlightRows || []);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'UG Production House ERP';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('التقرير', {
    views: [{ rightToLeft: true }], // اتجاه الورقة من اليمين لليسار للعربي
  });

  // إضافة اللوجو أعلى يمين الصفحة (عمود A يظهر أقصى اليمين في ورقة RTL)
  try {
    const imageId = workbook.addImage({ filename: LOGO_PATH, extension: 'jpeg' });
    sheet.addImage(imageId, { tl: { col: 0.15, row: 0.15 }, ext: { width: 54, height: 54 } });
  } catch (err) {
    console.warn('تعذر تضمين اللوجو في ملف Excel:', err.message);
  }

  // لوجو الحفلة (لو موجود) — بيتحط في وسط الرأس، جنب لوجو الشركة
  if (options.eventLogoPath) {
    try {
      const ext = path.extname(options.eventLogoPath).replace('.', '').toLowerCase();
      const eventImageId = workbook.addImage({
        filename: options.eventLogoPath,
        extension: ext === 'jpg' ? 'jpeg' : ext,
      });
      const middleCol = Math.max(Math.floor(headers.length / 2), 1);
      sheet.addImage(eventImageId, { tl: { col: middleCol, row: 0.15 }, ext: { width: 54, height: 54 } });
    } catch (err) {
      console.warn('تعذر تضمين لوجو الحفلة في ملف Excel:', err.message);
    }
  }

  sheet.getRow(1).height = 28;
  sheet.mergeCells(1, 2, 1, Math.max(headers.length, 3));
  const titleCell = sheet.getCell(1, 2);
  titleCell.value = `UG Production House — ${title}`;
  titleCell.font = { size: 14, bold: true, color: { argb: 'FF12151C' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'right' };

  sheet.getRow(2).height = 18;
  sheet.mergeCells(2, 2, 2, Math.max(headers.length, 3));
  const dateCell = sheet.getCell(2, 2);
  dateCell.value = `تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}`;
  dateCell.font = { size: 10, italic: true, color: { argb: 'FF888888' } };
  dateCell.alignment = { vertical: 'middle', horizontal: 'right' };

  sheet.addRow([]); // سطر فاصل فاضي
  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF12151C' } };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.border = { top: { style: 'thin', color: { argb: 'FF12151C' } }, bottom: { style: 'thin', color: { argb: 'FF12151C' } } };
  });
  headerRow.height = 22;

  rows.forEach((r, idx) => {
    const row = sheet.addRow(r);
    const isHighlighted = highlightRows.has(idx);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFE2E4E8' } },
        bottom: { style: 'hair', color: { argb: 'FFE2E4E8' } },
        left: { style: 'hair', color: { argb: 'FFE2E4E8' } },
        right: { style: 'hair', color: { argb: 'FFE2E4E8' } },
      };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      if (isHighlighted) {
        cell.font = { bold: true, color: { argb: 'FF12151C' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE8FF' } };
      } else if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F8FA' } };
      }
    });
  });

  // فلترة تلقائية على صف العناوين فقط (بدون تجميد الصفوف)
  const headerRowNumber = 4;
  sheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: headers.length },
  };

  // عرض الأعمدة يتناسب مع أطول قيمة فيه (بحد أقصى وأدنى معقولين)
  headers.forEach((h, colIdx) => {
    const colValues = rows.map((r) => String(r[colIdx] ?? ''));
    const maxLen = Math.max(h.length, ...colValues.map((v) => v.length), 10);
    sheet.getColumn(colIdx + 1).width = Math.min(Math.max(maxLen + 4, 14), 45);
  });

  sheet.properties.defaultRowHeight = 20;

  return workbook.xlsx.writeBuffer();
}

module.exports = { buildExcelReport };
