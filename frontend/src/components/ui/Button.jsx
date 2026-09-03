const VARIANTS = {
  primary: "bg-primary text-white hover:bg-primary-ink",
  secondary: "bg-surface text-ink border border-border hover:bg-surface-2",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
  success: "bg-success-solid text-white hover:opacity-90",
  danger: "bg-danger-solid text-white hover:opacity-90",
  "outline-danger": "bg-surface text-danger-solid border border-danger-solid hover:bg-danger-soft",
};

const SIZES = {
  sm: "text-xs px-3 py-1.5",
  md: "text-[15px] px-[18px] py-2.5",
};

export default function Button({ variant = "primary", size = "md", className = "", ...props }) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
