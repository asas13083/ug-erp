/**
 * بياخد قايمة أوصاف سيارات (["عربية كبيرة", "ربع نقل"]) ويحسب منها:
 * - vehicleCount: العدد
 * - transportInfo: ملخص نصي (للتوافق مع أي مكان لسه بيقرا النص القديم)
 * - vehicles: القايمة نفسها منضّفة (من غير قيم فاضية)
 *
 * لو القايمة فاضية أو مش متبعتة، بيرجّع كل حاجة null بدل ما يكتب "0" أو نص فاضي.
 */
function deriveVehicleFields(vehicles) {
  const clean = Array.isArray(vehicles) ? vehicles.map((v) => (v || '').trim()).filter(Boolean) : [];
  if (clean.length === 0) {
    return { vehicleCount: null, transportInfo: null, vehicles: null };
  }
  return {
    vehicleCount: clean.length,
    transportInfo: clean.join('، '),
    vehicles: clean,
  };
}

module.exports = { deriveVehicleFields };
