export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="bg-white border-b border-gray-200 px-7 py-3.5 flex items-center gap-4 sticky top-0 z-10">
      <div>
        <h2 className="text-lg font-extrabold text-gray-900">{title}</h2>
        {subtitle && <div className="text-xs text-gray-500 font-medium">{subtitle}</div>}
      </div>
      <div className="mr-auto">{action}</div>
    </div>
  );
}
