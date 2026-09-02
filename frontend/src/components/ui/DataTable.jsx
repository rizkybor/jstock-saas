/**
 * Generic data table: columns = [{ key, header, render?(row) }].
 * Scrolls horizontally in its own container so the page body never does.
 * A "No." index column is prepended automatically (disable with showIndex={false}).
 * Pass startIndex (0-based) when paginating so numbering continues across pages.
 */
export default function DataTable({
  columns,
  rows,
  rowKey,
  emptyMessage = "Tidak ada data.",
  showIndex = true,
  startIndex = 0,
}) {
  const allColumns = showIndex
    ? [{ key: "__index", header: "No.", render: (_row, index) => startIndex + index + 1 }, ...columns]
    : columns;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="bg-surface-2">
            {allColumns.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={allColumns.length} className="px-3 py-8 text-center text-ink-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map((row, index) => (
            <tr key={rowKey(row)} className="border-b border-border transition-colors last:border-0 hover:bg-surface-2">
              {allColumns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-ink">
                  {col.render ? col.render(row, index) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
