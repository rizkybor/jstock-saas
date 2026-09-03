import RequiredMark from "./RequiredMark";

export default function Textarea({ label, error, hint, className = "", id, rows = 3, ...props }) {
  const textareaId = id ?? props.name;

  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={textareaId}>
      {label && (
        <span className="text-sm font-semibold text-ink">
          {label}
          {props.required && <RequiredMark />}
        </span>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`resize-y rounded-lg border bg-surface px-2.5 py-2 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-[3px] focus:ring-[rgba(0,117,222,0.12)] ${
          error ? "border-danger" : "border-border focus:border-primary"
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
      {!error && hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}
