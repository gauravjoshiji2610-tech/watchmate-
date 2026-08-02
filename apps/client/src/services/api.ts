/**
 * REST API client module.
 *
 * Reads base URL dynamically from `import.meta.env.VITE_API_URL`.
 * Defaults to empty string (relative URL for Vite proxy) if omitted.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function fetchHealth() {
  const url = API_BASE_URL ? `${API_BASE_URL}/api/health` : '/api/health';
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  return response.json();
}
