import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';

const REASON_LABELS = { DAMAGED: 'تلف', LOST: 'مفقود', THEFT: 'سرقة', OTHER: 'أخرى' };

export default function LossPage() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    api.get('/loss-records').then(({ data }) => setRecords(data.data));
  }, []);

  return (
    <>
      <PageHeader title="سجل الفاقد" subtitle={`${records.length} سجل`} />
      <div className="p-7">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right px-4 py-3 font-bold">الصنف</th>
                <th className="text-right px-4 py-3 font-bold">السبب</th>
                <th className="text-right px-4 py-3 font-bold">الكمية</th>
                <th className="text-right px-4 py-3 font-bold">الحفلة</th>
                <th className="text-right px-4 py-3 font-bold">المسؤول</th>
                <th className="text-right px-4 py-3 font-bold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-bold">{r.item?.name}</td>
                  <td className="px-4 py-3"><span className="bg-rose-50 text-rose-600 text-xs font-bold px-2.5 py-1 rounded-full">{REASON_LABELS[r.reason]}</span></td>
                  <td className="px-4 py-3 font-extrabold">{r.quantity}</td>
                  <td className="px-4 py-3">{r.event?.name || '—'}</td>
                  <td className="px-4 py-3">{r.user?.fullName}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString('ar-EG')}</td>
                </tr>
              ))}
              {records.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">لا يوجد فاقد مسجّل</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
