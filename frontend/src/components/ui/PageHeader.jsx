export default function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.25px] text-ink">{title}</h1>
        {description && <p className="mt-0.5 text-[15px] text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
