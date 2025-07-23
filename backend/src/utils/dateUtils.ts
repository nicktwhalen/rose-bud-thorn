/**
 * Get the current local date in YYYY-MM-DD format
 * This fixes timezone issues with new Date().toISOString().split('T')[0]
 * which returns UTC date instead of local date
 */
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
