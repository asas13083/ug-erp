import { useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl } from '../utils/assetUrl';
import { useLanguage } from '../context/LanguageContext';

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user, updateAvatar } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/auth/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateAvatar(data.data.avatarUrl);
    } catch (err) {
      alert(err.response?.data?.message || t('تعذر رفع الصورة'));
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError(t('كلمة المرور الجديدة وتأكيدها مش متطابقين'));
      return;
    }
    setSubmitting(true);
    try {
      await api.put('/auth/me/password', { currentPassword, newPassword });
      setSuccess(t('تم تغيير كلمة المرور بنجاح'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || t('تعذر تغيير كلمة المرور'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title={t('الملف الشخصي')} subtitle={t('بياناتك وصورتك وتغيير كلمة المرور')} />
      <div className="p-7 max-w-lg">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {user?.avatarUrl ? (
                <img src={getAssetUrl(user.avatarUrl)} alt={t('صورة الحساب')} className="w-16 h-16 rounded-full object-cover border border-gray-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-lg font-bold text-white">
                  {user?.fullName?.[0]}
                </div>
              )}
              <label className="absolute -bottom-1 -left-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer shadow-md transition" title={t('تغيير الصورة')}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} disabled={uploadingAvatar} className="hidden" />
              </label>
            </div>
            <div>
              <div className="font-extrabold">{user?.fullName}</div>
              <div className="text-xs text-gray-600">{user?.username} · {user?.roleName}</div>
              {uploadingAvatar && <div className="text-xs text-blue-600 mt-1">{t('جاري رفع الصورة...')}</div>}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm mb-1">{t('تغيير كلمة المرور')}</h3>
          {error && <div className="text-rose-600 bg-rose-50 rounded-lg px-3 py-2 text-sm">{error}</div>}
          {success && <div className="text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 text-sm">{success}</div>}

          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">{t('كلمة المرور الحالية')}</label>
            <input required type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">{t('كلمة المرور الجديدة')}</label>
            <input required type="password" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder={t('6 أحرف على الأقل')} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-600">{t('تأكيد كلمة المرور الجديدة')}</label>
            <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm w-full transition">
            {submitting ? t('جاري الحفظ...') : t('حفظ كلمة المرور الجديدة')}
          </button>
        </form>
      </div>
    </>
  );
}
