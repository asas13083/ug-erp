import { useLanguage } from '../context/LanguageContext';

/**
 * مكوّن إدخال بنود سيارات النقل — كل سطر نوع سيارة + عدده (مش سطر لكل عربية
 * لوحدها زي الأول). يعني "5 عربية كبيرة" بقى سطر واحد بعدد 5، مش 5 أسطر مكررة.
 * value: array of { type, count }, onChange: (newArray) => void
 */
export default function VehiclesInput({ value = [], onChange }) {
  const { t } = useLanguage();

  function updateLine(idx, field, val) {
    const next = [...value];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  }
  function addLine() {
    onChange([...value, { type: '', count: 1 }]);
  }
  function removeLine(idx) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <label className="block text-xs font-bold mb-1.5 text-gray-600">{t('سيارات النقل (اختياري)')}</label>
      <div className="space-y-2">
        {value.map((v, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <input
              value={v.type || ''}
              onChange={(e) => updateLine(idx, 'type', e.target.value)}
              placeholder={t('مثلاً: عربية كبيرة')}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-gray-500">{t('العدد')}</span>
              <input
                type="number"
                min={1}
                value={v.count ?? 1}
                onChange={(e) => updateLine(idx, 'count', Math.max(1, Number(e.target.value) || 1))}
                className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center"
              />
            </div>
            <button type="button" onClick={() => removeLine(idx)} className="text-rose-500 text-sm px-1.5">{t('حذف')}</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addLine} className="text-blue-600 text-xs font-bold mt-2">+ {t('إضافة نوع سيارة')}</button>
    </div>
  );
}
