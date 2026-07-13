/**
 * بياخد قايمة سيارات — الصيغة الجديدة: [{ type: "عربية كبيرة", count: 5 }, ...]
 * (بردو بتدعم الصيغة القديمة [نص، نص] بتاعت أي بيانات قديمة، وتحوّلها تلقائي
 * لنفس الصيغة الجديدة بعدد 1 لكل سطر) ويحسب منها:
 * - vehicleCount: إجمالي عدد كل السيارات مجمّعة (مش عدد السطور)
 * - transportInfo: ملخص نصي "عربية كبيرة ×5، ربع نقل ×1" (للعرض السريع)
 * - vehicles: القايمة نفسها منضّفة بصيغة { type, count }
 *
 * لو القايمة فاضية أو مش متبعتة، بيرجّع كل حاجة null بدل ما يكتب "0" أو نص فاضي.
 */
function deriveVehicleFields(vehicles) {
  if (!Array.isArray(vehicles)) return { vehicleCount: null, transportInfo: null, vehicles: null };

  const clean = vehicles
    .map((v) => {
      if (typeof v === 'string') return { type: v.trim(), count: 1 }; // توافق مع بيانات قديمة
      const type = (v?.type || '').trim();
      const count = Number(v?.count) > 0 ? Number(v.count) : 1;
      return { type, count };
    })
    .filter((v) => v.type);

  if (clean.length === 0) {
    return { vehicleCount: null, transportInfo: null, vehicles: null };
  }

  const totalCount = clean.reduce((sum, v) => sum + v.count, 0);
  const transportInfo = clean.map((v) => `${v.type} ×${v.count}`).join('، ');

  return { vehicleCount: totalCount, transportInfo, vehicles: clean };
}

module.exports = { deriveVehicleFields };
