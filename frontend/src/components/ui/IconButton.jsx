import Button from "./Button";

const SIZE_BOX = { sm: "w-8", md: "w-10" };

/**
 * Icon-only row action (View/Edit/Delete/Report, etc.) — same Button
 * variants/colors as everywhere else, just square and icon-only instead of
 * a text label. `label` is required: it becomes the tooltip (title) and the
 * accessible name (aria-label), since the icon alone conveys nothing to a
 * screen reader.
 */
export default function IconButton({ icon, label, size = "sm", variant = "secondary", className = "", ...props }) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      className={`!px-0 ${SIZE_BOX[size]} ${className}`}
      {...props}
    >
      {icon}
    </Button>
  );
}
