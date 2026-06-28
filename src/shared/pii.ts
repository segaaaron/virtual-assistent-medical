// Enmascara telefono para logs/audit (confidencialidad). Deja prefijo+ultimos 2.
export function maskPhone(phone: string): string {
  if (phone.length <= 5) return "***";
  return phone.slice(0, 3) + "***" + phone.slice(-2);
}
