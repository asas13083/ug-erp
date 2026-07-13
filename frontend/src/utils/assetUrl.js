const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
// لو رابط الـAPI نسبي (زي "/api" في الإنتاج، عشان Nginx بيوجّهه لنفس الدومين)،
// إجمالي رابط الصورة كان بيطلع فاضي — فبنستخدم دومين الصفحة الحالية نفسه
// (window.location.origin) كـ"أصل" احتياطي، عشان الرابط يفضل صحيح دايماً
// حتى في نوافذ الطباعة/تصدير PDF المنفصلة اللي محتاجة رابط كامل مش نسبي
const API_ORIGIN = API_URL.startsWith('http') ? API_URL.replace(/\/api\/?$/, '') : window.location.origin;

// المسار المخزّن في قاعدة البيانات نسبي (مثال: /uploads/xxxx.jpg)
// الدالة دي بتحوّله لرابط كامل يفتح من أي مكان (يشمل نافذة الطباعة المنفصلة)
export function getAssetUrl(relativePath) {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath; // رابط كامل بالفعل
  return `${API_ORIGIN}${relativePath}`;
}
