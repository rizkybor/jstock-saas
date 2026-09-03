import Button from "./Button";
import Modal from "./Modal";

/**
 * Reusable confirmation dialog — replaces the native window.confirm() so
 * destructive/impactful actions get a styled, on-brand prompt instead of
 * the browser's own dialog. Fully controlled: the parent owns open/close
 * state (render it only while a confirmation is pending) and the loading
 * flag while the confirmed action is in flight.
 */
export default function ConfirmDialog({
  title = "Konfirmasi",
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} onClose={onCancel} width="420px">
      <div className="flex flex-col gap-4">
        {description && <p className="text-sm text-ink-muted">{description}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={variant} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
