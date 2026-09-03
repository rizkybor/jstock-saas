/**
 * Simple controlled tab bar: tabs = [{ key, label }], active tab content is
 * left entirely to the caller (Tabs only renders the strip + click wiring).
 */
export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="mb-6 flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`cursor-pointer border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            active === tab.key
              ? "border-primary text-primary"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
