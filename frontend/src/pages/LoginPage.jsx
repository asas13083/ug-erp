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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-ink" dir="rtl">
      <div className="pointer-events-none absolute -top-24 -right-20 w-80 h-80 rounded-full bg-blue-500/25 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute bottom-0 -left-20 w-72 h-72 rounded-full bg-slate-400/15 blur-3xl animate-blob" style={{ animationDelay: '2.5s' }} />
      <div className="pointer-events-none absolute top-1/3 left-1/2 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl animate-blob" style={{ animationDelay: '5s' }} />

      <div className="relative w-full max-w-sm glass rounded-3xl p-8 animate-fadein" style={{ background: 'rgba(255,255,255,0.9)' }}>
        <div className="flex flex-col items-center mb-8">
          <img src="/ug-logo.jpg" alt="UG" className="w-16 h-16 rounded-2xl object-cover shadow-lg mb-3 animate-glow" />
          <h1 className="text-lg font-extrabold text-ink">UG Production House</h1>
          <span className="text-xs text-gray-600 font-medium">Inventory ERP</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1.5 text-gray-700">اسم المستخدم</label>
            <input
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition bg-white/80"
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
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition bg-white/80"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
