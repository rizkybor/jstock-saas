/** Small mono pill for codes: LOT/Batch numbers, transaction IDs, slugs. */
export default function CodeChip({ children }) {
  return (
    <span className="rounded border border-border bg-surface-2 px-2 py-0.5 font-mono text-[13px] font-semibold tracking-[0.5px] text-ink">
      {children}
    </span>
  );
}
