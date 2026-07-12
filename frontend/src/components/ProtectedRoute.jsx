import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// module/action (اختياريين): لو موجودين، لازم المستخدم يكون عنده الصلاحية دي على القسم ده
export default function ProtectedRoute({ children, module, action = 'view' }) {
  const { user, can, ready } = useAuth();

  if (!ready) return null; // بانتظار التحقق من الجلسة (تجنب وميض غير مرغوب)
  if (!user) return <Navigate to="/login" replace />;

  if (module && !can(module, action)) {
    return (
      <div className="p-10 text-center text-gray-600">
        ليس لديك صلاحية للوصول لهذا القسم
      </div>
    );
  }
  return children;
}
