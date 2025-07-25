/**
 * API configuration and utilities
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  entries: `${API_BASE_URL}/api/entries`,
  auth: {
    google: `${API_BASE_URL}/auth/google`,
    profile: `${API_BASE_URL}/auth/profile`,
    logout: `${API_BASE_URL}/auth/logout`,
  },
} as const;

/**
 * Get the full URL for an entries endpoint
 */
export function getEntriesUrl(path?: string): string {
  if (!path) return API_ENDPOINTS.entries;
  return `${API_ENDPOINTS.entries}/${path}`;
}

/**
 * Get headers with authentication token
 */
export function getAuthHeaders(includeContentType = false): Record<string, string> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  // Add ngrok bypass header for development
  headers['ngrok-skip-browser-warning'] = 'true';

  return headers;
}
