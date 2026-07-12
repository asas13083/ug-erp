// يبني شرط تاريخ من dateFrom/dateTo الموجودين في query الطلب (لو موجودين)
// استخدام: where: { ...buildDateRangeFilter(req, 'createdAt') }
function buildDateRangeFilter(req, field = 'createdAt') {
  const { dateFrom, dateTo } = req.query;
  if (!dateFrom && !dateTo) return {};

  const range = {};
  if (dateFrom) range.gte = new Date(dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999); // آخر لحظة في اليوم المحدد عشان يشمل اليوم كامل
    range.lte = end;
  }
  return { [field]: range };
}

module.exports = { buildDateRangeFilter };
