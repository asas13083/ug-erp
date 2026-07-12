import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';

const ACTION_LABELS = {
  CREATE: ['إضافة', 'bg-gray-100 text-gray-600'],
  UPDATE: ['تعديل', 'bg-gray-100 text-gray-600'],
  DELETE: ['حذف', 'bg-rose-50 text-rose-600'],
  ISSUE: ['صرف', 'bg-blue-50 text-blue-600'],
  RETURN: ['مرتجع', 'bg-emerald-50 text-emerald-600'],
  LOSS: ['فاقد', 'bg-rose-50 text-rose-600'],
  TRANSFER: ['نقل', 'bg-amber-50 text-amber-600'],
  STOCK_COUNT: ['جرد', 'bg-purple-50 text-purple-600'],
  LOGIN: ['دخول', 'bg-gray-100 text-gray-500'],
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/activity-log').then(({ data }) => setLogs(data.data));
  }, []);

  return (
    <>
      <PageHeader title="سجل الحركة" subtitle="كل العمليات التي تمت في النظام" />
      <div className="p-7">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right px-4 py-3 font-bold">العملية</th>
                <th className="text-right px-4 py-3 font-bold">الوصف</th>
                <th className="text-right px-4 py-3 font-bold">المستخدم</th>
                <th className="text-right px-4 py-3 font-bold">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const [label, cls] = ACTION_LABELS[log.action] || [log.action, ''];
                return (
                  <tr key={log.id} className="border-t border-gray-100">
                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{label}</span></td>
                    <td className="px-4 py-3">{log.description}</td>
                    <td className="px-4 py-3">{log.user?.fullName}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('ar-EG')}</td>
                  </tr>
                );
              })}
              {logs.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-gray-400">لا يوجد سجل حركة بعد</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
