export default function Input({ label, error, hint, className = "", id, ...props }) {
  const inputId = id ?? props.name;

  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={inputId}>
      {label && <span className="font-semibold text-ink">{label}</span>}
      <input
        id={inputId}
        className={`rounded-md border bg-surface-fixed px-3 py-2 text-sm text-surface-fixed-ink placeholder:text-surface-fixed-ink-muted focus:outline-none focus:ring-2 focus:ring-primary-soft ${
          error ? "border-danger" : "border-surface-fixed-border focus:border-primary"
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
      {!error && hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}
