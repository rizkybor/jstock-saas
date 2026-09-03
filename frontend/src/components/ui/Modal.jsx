/** Centered overlay dialog — matches the reference's approve/reject and add-item modals. */
export default function Modal({ title, description, onClose, children, width = "460px" }) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/35 p-4">
      <div
        className="max-h-[88vh] w-full overflow-y-auto rounded-2xl bg-surface p-7"
        style={{ maxWidth: width }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-xl font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
          <button
            aria-label="Tutup"
            onClick={onClose}
            className="cursor-pointer text-lg text-ink-faint hover:text-ink"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
