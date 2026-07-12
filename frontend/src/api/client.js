import axios from 'axios';

// رابط السيرفر: في التطوير المحلي بيبقى localhost، وبعد الرفع هيتغير لرابط الاستضافة الحقيقي
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// withCredentials بيخلي المتصفح يبعت الكوكيز (جلسة الدخول) تلقائياً مع كل طلب —
// مفيش توكن بنخزنه أو نرفقه يدوياً خالص، الكوكيز httpOnly والمتصفح بيتصرف فيها لوحده،
// وده بالظبط اللي بيمنع أي كود ضار (لو حصلت ثغرة XSS) من قراءة أو سرقة جلسة الدخول
const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

// لو الجلسة انتهت أو مش موجودة (401)، يرجع المستخدم لصفحة الدخول تلقائياً
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
