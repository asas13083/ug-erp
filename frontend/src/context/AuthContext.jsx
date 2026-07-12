import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  // عند تحميل التطبيق، مفيش أي توكن نقدر نقراه من الفرونت إند خالص (الكوكيز
  // httpOnly ومحمية من الجافاسكريبت عمداً)، فبنسأل السيرفر مباشرة "أنا مسجل
  // دخول ولا لأ؟" — لو عنده كوكيز صالحة هيردّ ببياناتنا، غير كده هيرجع 401
  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser({ id: data.data.id, username: data.data.username, fullName: data.data.fullName, roleId: data.data.roleId, roleName: data.data.roleName, avatarUrl: data.data.avatarUrl });
        setPermissions(data.data.permissions);
      })
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  // بعد رفع صورة شخصية جديدة، نحدّث بيانات المستخدم فوراً من غير ما يحتاج يدخل تاني
  function updateAvatar(avatarUrl) {
    setUser((prev) => ({ ...prev, avatarUrl }));
  }

  async function login(username, password) {
    setLoading(true);
    setError('');
    try {
      // السيرفر بيحط كوكيز الجلسة تلقائياً في الرد (httpOnly) — مفيش أي
      // توكن بنستقبله أو نخزّنه إحنا هنا خالص
      const { data } = await api.post('/auth/login', { username, password });
      setUser(data.data.user);
      setPermissions(data.data.permissions);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء تسجيل الدخول');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // حتى لو فشل الطلب، نمسح الحالة محلياً برضو
    }
    setUser(null);
    setPermissions({});
  }

  // usage: can('items', 'view') / can('items', 'delete')
  function can(module, action = 'view') {
    const field = { view: 'canView', create: 'canCreate', edit: 'canEdit', delete: 'canDelete' }[action];
    return !!permissions?.[module]?.[field];
  }

  return (
    <AuthContext.Provider value={{ user, permissions, can, login, logout, loading, error, ready, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
