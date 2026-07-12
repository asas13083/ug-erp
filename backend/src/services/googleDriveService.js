const fs = require('fs');
const { google } = require('googleapis');

/**
 * بتستخدم "Refresh Token" مأخوذ مرة واحدة بس (من سكريبت الإعداد الأولي
 * scripts/googleDriveSetup.js) عشان ترفع ملفات على جوجل درايف بتاع نفس
 * الإيميل اللي معمول بيه الإعداد، من غير ما تحتاج تسجّل دخول تاني أبداً.
 */
function isConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
}

function getDriveClient() {
  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * بترفع ملف نسخة احتياطية على جوجل درايف. لو GOOGLE_DRIVE_FOLDER_ID متحدد
 * في الإعدادات، بيترفع جوه الفولدر ده تحديداً؛ غير كده بيترفع في الجذر
 * الرئيسي لدرايف الإيميل بتاعك.
 */
async function uploadBackupToDrive(filepath, filename) {
  if (!isConfigured()) {
    throw new Error('الرفع على جوجل درايف مش متظبط لسه — راجع دليل الإعداد (scripts/googleDriveSetup.js)');
  }

  const drive = getDriveClient();
  const fileMetadata = {
    name: filename,
    ...(process.env.GOOGLE_DRIVE_FOLDER_ID && { parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] }),
  };
  const media = { mimeType: 'application/sql', body: fs.createReadStream(filepath) };

  const res = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id, webViewLink',
  });

  return { fileId: res.data.id, link: res.data.webViewLink };
}

/** بيمسح النسخ الأقدم من كذا يوم من جوجل درايف عشان مايمتلئش (زي التنظيف المحلي بالظبط) */
async function pruneOldDriveBackups(keepCount = 30) {
  if (!isConfigured()) return;
  const drive = getDriveClient();
  const q = process.env.GOOGLE_DRIVE_FOLDER_ID
    ? `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and name contains 'backup-'`
    : `name contains 'backup-'`;

  const res = await drive.files.list({ q, orderBy: 'createdTime desc', fields: 'files(id, name, createdTime)', pageSize: 100 });
  const files = res.data.files || [];
  const toDelete = files.slice(keepCount);
  for (const f of toDelete) {
    await drive.files.delete({ fileId: f.id });
  }
}

module.exports = { isConfigured, uploadBackupToDrive, pruneOldDriveBackups };
