import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-10 text-center text-gray-500">
        ليس لديك صلاحية للوصول لهذه الصفحة
      </div>
    );
  }
  return children;
}
