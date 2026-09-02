const TONES = {
  danger: "border-danger/30 bg-danger-soft text-danger",
  success: "border-success/30 bg-success-soft text-success",
  info: "border-info/30 bg-info-soft text-info",
};

export default function Alert({ tone = "danger", children }) {
  if (!children) return null;

  return <div className={`rounded-md border px-3 py-2 text-sm ${TONES[tone]}`}>{children}</div>;
}
