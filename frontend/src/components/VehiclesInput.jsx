import { useLanguage } from '../context/LanguageContext';

/**
 * مكوّن إدخال بنود سيارات النقل — كل عربية سطر لوحدها بوصفها الخاص
 * (مش نفس النوع بالضرورة، ممكن "عربية كبيرة" و"ربع نقل" مع بعض في نفس الإذن).
 * value: array of strings, onChange: (newArray) => void
 */
export default function VehiclesInput({ value = [], onChange }) {
  const { t } = useLanguage();

  function updateLine(idx, text) {
    const next = [...value];
    next[idx] = text;
    onChange(next);
  }
  function addLine() {
    onChange([...value, '']);
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
            <span className="text-xs text-gray-500 w-14 flex-shrink-0">{t('عربية')} {idx + 1}</span>
            <input
              value={v}
              onChange={(e) => updateLine(idx, e.target.value)}
              placeholder={t('مثلاً: عربية كبيرة')}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <button type="button" onClick={() => removeLine(idx)} className="text-rose-500 text-sm px-1.5">{t('حذف')}</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addLine} className="text-blue-600 text-xs font-bold mt-2">+ {t('إضافة عربية')}</button>
    </div>
  );
}
