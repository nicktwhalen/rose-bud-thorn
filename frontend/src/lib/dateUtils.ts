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

/**
 * Format a date string (YYYY-MM-DD) for display
 * This fixes timezone issues where new Date(dateString) interprets the date as UTC
 * which can shift the displayed date by one day in local timezones
 */
export function formatDateForDisplay(dateString: string): string {
  // Parse the date string manually to avoid timezone conversion issues
  const [year, month, day] = dateString.split('-').map(Number);
  // Create a Date object in local timezone (month is 0-indexed)
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a UTC timestamp string for display in local timezone
 * Converts API timestamps to user's local time for display
 */
export function formatTimestampForDisplay(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}
