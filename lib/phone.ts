export function normalizePhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  digits = digits.replace(/^0+/, "");
  return digits.slice(0, 11);
}

export function isValidPhoneDigits(value: string): boolean {
  const digits = normalizePhoneDigits(value);
  return digits.length === 10 || digits.length === 11;
}

export function formatPhoneDisplay(value: string): string {
  const d = normalizePhoneDigits(value);
  if (d.length <= 2) return d;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

export function toWhatsAppPhone(value: string): string {
  const digits = normalizePhoneDigits(value);
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function buildWhatsAppUrl(value: string): string {
  return `https://wa.me/${toWhatsAppPhone(value)}`;
}
