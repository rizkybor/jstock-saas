export default function StatTile({ label, value, delta }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="text-xs font-semibold tracking-wide text-ink-faint uppercase">{label}</div>
      <div className="mt-2 text-[32px] leading-none font-bold tracking-[-0.5px] text-ink">{value}</div>
      {delta && <div className="mt-1 text-[13px] text-ink-muted">{delta}</div>}
    </div>
  );
}
