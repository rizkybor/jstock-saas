export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-6 py-12 text-center">
      <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-border" />
      <p className="mb-1.5 text-base font-semibold text-ink">{title}</p>
      {description && <p className="mb-5 text-[15px] text-ink-muted">{description}</p>}
      {action}
    </div>
  );
}
