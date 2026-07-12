import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';

export default function ReportsPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/items').then(({ data }) => setItems(data.data));
  }, []);

  function exportCsv() {
    const header = ['الكود', 'الصنف', 'التصنيف', 'الكمية الكلية', 'المتاح', 'الحد الأدنى'];
    const rows = items.map((i) => [i.code, i.name, i.category?.name, i.totalQuantity, i.availableQuantity, i.minQuantity]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'تقرير-رصيد-المخزون.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="التقارير"
        subtitle="تقرير رصيد المخزون الحالي"
        action={<button onClick={exportCsv} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg">تصدير Excel/CSV</button>}
      />
      <div className="p-7">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right px-4 py-3 font-bold">الكود</th>
                <th className="text-right px-4 py-3 font-bold">الصنف</th>
                <th className="text-right px-4 py-3 font-bold">التصنيف</th>
                <th className="text-right px-4 py-3 font-bold">الكمية الكلية</th>
                <th className="text-right px-4 py-3 font-bold">المتاح</th>
                <th className="text-right px-4 py-3 font-bold">الحد الأدنى</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{i.code}</td>
                  <td className="px-4 py-3 font-bold">{i.name}</td>
                  <td className="px-4 py-3">{i.category?.name}</td>
                  <td className="px-4 py-3 font-extrabold">{i.totalQuantity}</td>
                  <td className="px-4 py-3">{i.availableQuantity}</td>
                  <td className="px-4 py-3">{i.minQuantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-400 mt-3">
          تقارير حركة الصنف، حركة المخزن، الصرف والمرتجع بالتفصيل هتتضاف تباعاً — البيانات الأساسية كلها موجودة في سجل الحركة دلوقتي.
        </div>
      </div>
    </>
  );
}
