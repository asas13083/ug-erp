import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { downloadFile } from '../utils/downloadFile';
import { useLanguage } from '../context/LanguageContext';

function formatSize(bytes, t) {
  if (bytes < 1024) return `${bytes} ${t('بايت')}`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t('كيلوبايت')}`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ${t('ميجابايت')}`;
}

export default function BackupPage() {
  const { t } = useLanguage();
  const [backups, setBackups] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [driveConfigured, setDriveConfigured] = useState(null); // null = لسه بيتحمّل
  const [uploadingFile, setUploadingFile] = useState(null);

  const [restoreTarget, setRestoreTarget] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const fileInputRef = useRef(null);

  function load() {
    api.get('/backups').then(({ data }) => setBackups(data.data));
    api.get('/backups/drive-status').then(({ data }) => setDriveConfigured(data.data.configured));
  }
  useEffect(load, []);

  async function handleUploadToDrive(filename) {
    setUploadingFile(filename);
    setError('');
    setSuccess('');
    try {
      await api.post(`/backups/${filename}/upload-to-drive`);
      setSuccess(t('تم الرفع على جوجل درايف بنجاح'));
    } catch (err) {
      setError(err.response?.data?.message || t('تعذر الرفع على جوجل درايف'));
    } finally {
      setUploadingFile(null);
    }
  }

  async function handleRunNow() {
    setRunning(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/backups/run');
      setSuccess(t('تم إنشاء نسخة احتياطية جديدة بنجاح'));
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('تعذر إنشاء النسخة الاحتياطية — تأكد إن pg_dump متاح على الجهاز'));
    } finally {
      setRunning(false);
    }
  }

  function openRestoreExisting(filename) {
    setRestoreTarget({ type: 'existing', filename });
    setConfirmText('');
    setRestoreError('');
  }

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreTarget({ type: 'upload', file });
    setConfirmText('');
    setRestoreError('');
    e.target.value = '';
  }

  async function handleConfirmRestore() {
    if (confirmText !== 'استرجاع') return;
    setRestoring(true);
    setRestoreError('');
    try {
      let res;
      if (restoreTarget.type === 'existing') {
        res = await api.post(`/backups/${restoreTarget.filename}/restore`, { confirmText });
      } else {
        const formData = new FormData();
        formData.append('file', restoreTarget.file);
        formData.append('confirmText', confirmText);
        res = await api.post('/backups/restore-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setSuccess(res.data.message);
      setRestoreTarget(null);
      load();
    } catch (err) {
      setRestoreError(err.response?.data?.message || t('تعذر الاسترجاع'));
    } finally {
      setRestoring(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t('النسخ الاحتياطي')}
        subtitle={t('نسخة كاملة من قاعدة البيانات تلقائياً كل 24 ساعة، بالإضافة لإمكانية التشغيل اليدوي')}
        action={
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept=".sql" onChange={handleFileSelected} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="border border-gray-200 hover:border-gray-300 text-sm font-bold px-4 py-2 rounded-lg transition">
              {t('استرجاع من ملف مرفوع')}
            </button>
            <button onClick={handleRunNow} disabled={running} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-lg transition">
              {running ? t('جاري إنشاء النسخة...') : t('تشغيل نسخة احتياطية الآن')}
            </button>
          </div>
        }
      />
      <div className="p-7">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-4 mb-3">
          {t('الاحتفاظ بآخر 14 نسخة بس تلقائياً — القديم بيتشال أوتوماتيك عشان مايمتلئش المساحة.')}
        </div>
        {driveConfigured === false && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-xl p-4 mb-5">
            {t('الرفع التلقائي على جوجل درايف مش متظبط لسه. راجع دليل الإعداد (scripts/googleDriveSetup.js) عشان النسخ تترفع تلقائياً كل يوم على مكان تاني غير السيرفر.')}
          </div>
        )}
        {driveConfigured === true && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl p-4 mb-5 flex items-center gap-2">
            <span>✓</span> {t('الرفع التلقائي على جوجل درايف شغّال — كل نسخة جديدة بترفع هناك تلقائياً')}
          </div>
        )}
        {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}
        {success && <div className="text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 text-sm mb-4">{success}</div>}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs">
                <th className="text-right px-4 py-3 font-bold">{t('اسم الملف')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('النوع')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('الحجم')}</th>
                <th className="text-right px-4 py-3 font-bold">{t('التاريخ')}</th>
                <th className="text-right px-4 py-3 font-bold w-64">{t('إجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.filename} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.filename}</td>
                  <td className="px-4 py-3">
                    {b.type === 'uploads' ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{t('صور مرفوعة')}</span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{t('قاعدة بيانات')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatSize(b.size, t)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(b.createdAt).toLocaleString('ar-EG')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => downloadFile(`/backups/${b.filename}/download`, b.filename)} className="text-blue-600 text-xs font-bold hover:underline">{t('تحميل')}</button>
                      {driveConfigured && (
                        <button onClick={() => handleUploadToDrive(b.filename)} disabled={uploadingFile === b.filename} className="text-emerald-600 text-xs font-bold hover:underline disabled:opacity-50">
                          {uploadingFile === b.filename ? t('جاري الرفع...') : t('ارفع على درايف')}
                        </button>
                      )}
                      {b.type !== 'uploads' && (
                        <button onClick={() => openRestoreExisting(b.filename)} className="text-rose-600 text-xs font-bold hover:underline">{t('استرجاع')}</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {backups.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-600">{t('لا توجد نسخ احتياطية بعد — دوس "تشغيل نسخة احتياطية الآن"')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {restoreTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => !restoring && setRestoreTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl border-2 border-rose-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-extrabold text-lg text-rose-700">{t('تحذير — عملية لا يمكن التراجع عنها')}</h3>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-800 space-y-2 mb-4">
              <p>{t('العملية دي هتمسح كل البيانات الحالية في قاعدة البيانات، وتستبدلها بالكامل بمحتوى الملف ده:')}</p>
              <p className="font-mono text-xs bg-white/60 rounded px-2 py-1">
                {restoreTarget.type === 'existing' ? restoreTarget.filename : restoreTarget.file.name}
              </p>
              <p>{t('هناخد نسخة أمان تلقائية من الحالة الحالية قبل ما نبدأ — بس برضو، فكّر كويس قبل ما تكمل.')}</p>
            </div>

            {restoreError && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm mb-3">{restoreError}</div>}

            <label className="block text-xs font-bold mb-1.5 text-gray-700">
              {t('اكتب كلمة "استرجاع" بالظبط عشان تأكد إنك عايز تكمل')}
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="استرجاع"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={handleConfirmRestore}
                disabled={confirmText !== 'استرجاع' || restoring}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-sm transition"
              >
                {restoring ? t('جاري الاسترجاع... متقفلش الصفحة') : t('أيوه، امسح كل حاجة واسترجع')}
              </button>
              <button onClick={() => setRestoreTarget(null)} disabled={restoring} className="flex-1 border border-gray-200 font-bold py-2.5 rounded-xl text-sm">
                {t('إلغاء')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
