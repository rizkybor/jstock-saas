const VARIANTS = {
  primary: "bg-primary text-white hover:bg-primary-ink",
  secondary: "bg-surface text-ink border border-border hover:bg-surface-2",
  ghost: "bg-transparent text-primary hover:bg-primary-soft",
  success: "bg-success-solid text-white hover:opacity-90",
  danger: "bg-danger-solid text-white hover:opacity-90",
  "outline-danger": "bg-surface text-danger-solid border border-danger-solid hover:bg-danger-soft",
};

const SIZES = {
  sm: "h-8 text-xs px-3",
  md: "h-10 text-[15px] px-[18px]",
};

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function Button({ variant = "primary", size = "md", loading = false, disabled, className = "", children, ...props }) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
