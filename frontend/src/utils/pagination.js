// يقرأ page و pageSize من الطلب ويحسب skip/take لـ Prisma
function getPagination(req, defaultPageSize = 20, maxPageSize = 100) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || defaultPageSize, 1), maxPageSize);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

// يبني كائن meta موحّد يُرجع مع كل استجابة مقسّمة لصفحات
function buildMeta(page, pageSize, total) {
  return { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) };
}

module.exports = { getPagination, buildMeta };
