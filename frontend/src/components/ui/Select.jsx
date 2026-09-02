export default function Select({ label, error, hint, className = "", id, children, ...props }) {
  const selectId = id ?? props.name;

  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={selectId}>
      {label && <span className="font-semibold text-ink">{label}</span>}
      <select
        id={selectId}
        className={`cursor-pointer rounded-md border bg-surface-fixed px-3 py-2 text-sm text-surface-fixed-ink focus:outline-none focus:ring-2 focus:ring-primary-soft ${
          error ? "border-danger" : "border-surface-fixed-border focus:border-primary"
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
      {!error && hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}
