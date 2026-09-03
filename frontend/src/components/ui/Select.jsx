import RequiredMark from "./RequiredMark";

export default function Select({ label, error, hint, className = "", id, children, ...props }) {
  const selectId = id ?? props.name;

  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={selectId}>
      {label && (
        <span className="text-sm font-semibold text-ink">
          {label}
          {props.required && <RequiredMark />}
        </span>
      )}
      <select
        id={selectId}
        className={`h-10 cursor-pointer rounded border bg-surface px-2.5 text-[15px] text-ink focus:outline-none focus:ring-[3px] focus:ring-[rgba(0,117,222,0.12)] ${
          error ? "border-danger" : "border-border focus:border-primary"
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
