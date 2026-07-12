import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="text-3xl font-extrabold" style={{ color }}>{value}</div>
      <div className="text-sm text-gray-500 font-medium mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-2">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard/stats')
      .then(({ data }) => setStats(data.data))
      .catch((err) => setError(err.response?.data?.message || 'تعذر تحميل الإحصائيات'));
  }, []);

  return (
    <>
      <PageHeader title="لوحة التحكم" subtitle="نظرة عامة على المخزون والعمليات" />
      <div className="p-7">
        {error && <div className="text-rose-600 bg-rose-50 rounded-lg p-4 mb-4">{error}</div>}
        {!stats && !error && <div className="text-gray-400">جاري التحميل...</div>}

        {stats && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard label="إجمالي الأصناف" value={stats.itemsCount} color="#2D6CDF" />
              <StatCard label="المخازن النشطة" value={stats.warehousesCount} color="#C77700" />
              <StatCard label="حفلات مفتوحة" value={stats.openEventsCount} color="#0E9F6E" />
              <StatCard
                label="تنبيهات نقص مخزون"
                value={stats.lowStockAlertsCount}
                color="#D6374B"
                sub={stats.lowStockAlertsCount > 0 ? 'تحتاج مراجعة' : 'كل الأصناف متوفرة'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm">تنبيهات نقص المخزون</div>
                <div className="p-2">
                  {stats.lowStockItems.length === 0 && <div className="p-4 text-sm text-gray-400">لا توجد تنبيهات حالياً</div>}
                  {stats.lowStockItems.map((i) => (
                    <div key={i.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 last:border-0">
                      <div className="flex-1">
                        <div className="text-sm font-bold">{i.name}</div>
                        <div className="text-xs text-gray-400">{i.code} · الحد الأدنى {i.minQuantity}</div>
                      </div>
                      <div className="text-rose-600 font-extrabold">{i.totalQuantity}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 font-extrabold text-sm">آخر العمليات</div>
                <div className="p-2">
                  {stats.recentActivity.map((log) => (
                    <div key={log.id} className="px-3 py-2.5 border-b border-gray-50 last:border-0">
                      <div className="text-sm">{log.description}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{log.user?.fullName} · {new Date(log.createdAt).toLocaleString('ar-EG')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
