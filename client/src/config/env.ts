// VITE_API_URL is only the API origin (e.g. https://api.example.com); the code adds /api/v1.
// Empty means same origin, which in development goes through the Vite proxy.
export function parseApiOrigin(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (trimmed === '') return '';

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`VITE_API_URL must be an http(s) origin, got "${trimmed}"`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`VITE_API_URL must be an http(s) origin, got "${trimmed}"`);
  }
  // A trailing slash or path would otherwise produce "//api/v1" or a wrong prefix.
  return url.origin;
}

export const env = {
  apiBaseUrl: `${parseApiOrigin(import.meta.env.VITE_API_URL)}/api/v1`,
};
