const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Accepts Indonesian mobile/landline numbers in common notations:
// 08123456789, +62 812-3456-789, (021) 7654321, 021-7654321, etc.
// Spaces/dashes/parentheses are stripped before matching digit count.
const PHONE_RE = /^(\+?62|0)\d{8,13}$/;

export const isValidEmail = (value) => EMAIL_RE.test(String(value).trim());

export const isValidPhone = (value) => PHONE_RE.test(String(value).replace(/[\s\-()]/g, ""));

/**
 * Validate a plain form-values object against a list of field rules.
 * Returns an { [fieldName]: message } map — empty when everything passes.
 *
 * rules: [{ name, label, required?, type?: "email" | "phone" | "number", min? }]
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

    if (rule.type === "email" && !isValidEmail(raw)) {
      errors[rule.name] = `${rule.label} harus berupa email yang valid.`;
    } else if (rule.type === "phone" && !isValidPhone(raw)) {
      errors[rule.name] = `${rule.label} harus berupa nomor telepon yang valid (mis. 08123456789).`;
    } else if (rule.type === "number" && Number.isNaN(Number(raw))) {
      errors[rule.name] = `${rule.label} harus berupa angka.`;
    } else if (rule.min !== undefined && Number(raw) < rule.min) {
      errors[rule.name] = `${rule.label} minimal ${rule.min}.`;
    }
  }

  return errors;
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;
