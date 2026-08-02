/**
 * REST API client placeholder.
 * Communicates with backend endpoints (/api/health, etc.).
 */

export async function fetchHealth() {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  return response.json();
}
