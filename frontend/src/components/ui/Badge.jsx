const STATUS_STYLES = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  active: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
  suspended: "bg-danger-soft text-danger",
  cancelled: "bg-surface-2 text-ink-muted",
  inactive: "bg-surface-2 text-ink-muted",
  trial: "bg-info-soft text-info",
  lime: "bg-lime-soft text-lime-ink",
};

export default function Badge({ status = "cancelled", children }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.cancelled;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
