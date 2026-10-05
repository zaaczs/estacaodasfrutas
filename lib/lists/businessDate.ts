/** Fortaleza não tem horário de verão. O dia da loja começa e termina às 00:00 nesse fuso. */
export const BUSINESS_TIME_ZONE = "America/Fortaleza";
const BUSINESS_OFFSET = "-03:00";

export function formatBusinessDateInput(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function businessTodayInput(): string {
  return formatBusinessDateInput(new Date());
}

export function isBusinessDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day
  );
}

export function businessDayBounds(dateInput: string): { start: Date; end: Date } {
  if (!isBusinessDateInput(dateInput)) {
    throw new Error("Data inválida");
  }
  return {
    start: new Date(`${dateInput}T00:00:00.000${BUSINESS_OFFSET}`),
    end: new Date(`${dateInput}T23:59:59.999${BUSINESS_OFFSET}`),
  };
}

export function formatBusinessDateLabel(dateInput: string): string {
  const [year, month, day] = dateInput.split("-");
  return `${day}/${month}/${year}`;
}

export function formatBusinessTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
