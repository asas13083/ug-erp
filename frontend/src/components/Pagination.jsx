export default function Pagination({ page, totalPages, total, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 text-xs text-gray-600">
      <span>{total} نتيجة إجمالاً</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page === 1}
          className="w-8 h-8 rounded-lg border border-gray-200 disabled:opacity-40 hover:border-gray-300 transition"
        >
          ‹
        </button>
        {start > 1 && <span className="px-1">...</span>}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition ${p === page ? 'bg-blue-600 text-white' : 'border border-gray-200 hover:border-gray-300'}`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && <span className="px-1">...</span>}
        <button
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page === totalPages}
          className="w-8 h-8 rounded-lg border border-gray-200 disabled:opacity-40 hover:border-gray-300 transition"
        >
          ›
        </button>
      </div>
    </div>
  );
}
