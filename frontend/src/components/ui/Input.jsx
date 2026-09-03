import RequiredMark from "./RequiredMark";

export default function Input({ label, error, hint, className = "", id, ...props }) {
  const inputId = id ?? props.name;

  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={inputId}>
      {label && (
        <span className="text-sm font-semibold text-ink">
          {label}
          {props.required && <RequiredMark />}
        </span>
      )}
      <input
        id={inputId}
        className={`h-10 rounded border bg-surface px-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-[3px] focus:ring-[rgba(0,117,222,0.12)] ${
          error ? "border-danger" : "border-border focus:border-primary"
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
      {!error && hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}
