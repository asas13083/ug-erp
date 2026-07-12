import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await login(username, password);
    if (ok) navigate('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-400 flex items-center justify-center text-xl font-extrabold text-ink shadow-lg mb-3">
            UG
          </div>
          <h1 className="text-lg font-extrabold text-ink">UG Production House</h1>
          <span className="text-xs text-gray-500 font-medium">Inventory ERP</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1.5 text-gray-700">اسم المستخدم</label>
            <input
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5 text-gray-700">كلمة المرور</label>
            <input
              type="password"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition"
          >
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
