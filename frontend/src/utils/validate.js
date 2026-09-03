const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate a plain form-values object against a list of field rules.
 * Returns an { [fieldName]: message } map — empty when everything passes.
 *
 * rules: [{ name, label, required?, type?: "email" | "number", min? }]
 */
export function validate(values, rules) {
  const errors = {};

  for (const rule of rules) {
    const raw = values[rule.name];
    const isEmpty = raw === undefined || raw === null || String(raw).trim() === "";

    if (rule.required && isEmpty) {
      errors[rule.name] = `${rule.label} wajib diisi.`;
      continue;
    }
    if (isEmpty) continue;

    if (rule.type === "email" && !EMAIL_RE.test(String(raw))) {
      errors[rule.name] = `${rule.label} harus berupa email yang valid.`;
    } else if (rule.type === "number" && Number.isNaN(Number(raw))) {
      errors[rule.name] = `${rule.label} harus berupa angka.`;
    } else if (rule.min !== undefined && Number(raw) < rule.min) {
      errors[rule.name] = `${rule.label} minimal ${rule.min}.`;
    }
  }

  return errors;
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;
