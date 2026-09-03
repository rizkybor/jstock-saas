const STATUS_STYLES = {
  pending: "bg-warning-soft text-warning border-warning-border",
  approved: "bg-success-soft text-success border-success-border",
  active: "bg-success-soft text-success border-success-border",
  rejected: "bg-danger-soft text-danger border-danger-border",
  suspended: "bg-danger-soft text-danger border-danger-border",
  cancelled: "bg-surface-2 text-ink-muted border-border",
  inactive: "bg-surface-2 text-ink-muted border-border",
  trial: "bg-info-soft text-info border-primary-soft",
  lime: "bg-lime-soft text-lime-ink border-success-border",
  draft: "bg-surface-2 text-ink-muted border-border",
  ordered: "bg-info-soft text-info border-primary-soft",
  partially_received: "bg-warning-soft text-warning border-warning-border",
  received: "bg-success-soft text-success border-success-border",
};

export default function Badge({ status = "cancelled", children }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.cancelled;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
