import axios from 'axios';

// رابط السيرفر: في التطوير المحلي بيبقى localhost، وبعد الرفع هيتغير لرابط الاستضافة الحقيقي
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({ baseURL: BASE_URL });

// يرفق توكن الدخول تلقائياً مع كل طلب لو المستخدم مسجل دخول
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ug_erp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// لو الجلسة انتهت (401)، يرجع المستخدم لصفحة الدخول تلقائياً
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ug_erp_token');
      localStorage.removeItem('ug_erp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
