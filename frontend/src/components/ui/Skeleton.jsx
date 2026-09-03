/** Shimmering placeholder bar — building block for skeleton loading states. */
export default function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded bg-surface-2 ${className}`} />;
}
