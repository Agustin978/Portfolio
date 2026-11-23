// Links from the API are rendered only when they are absolute http(s) URLs: anything else
// (javascript:, data:, relative paths) is dropped and its element hidden.
export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

// Plain address only: characters such as "?" or "&" would let the value add a subject, body or
// extra recipients to the mailto link.
const PLAIN_EMAIL = /^[^\s@?&#/:,;<>"]+@[^\s@?&#/:,;<>"]+\.[^\s@?&#/:,;<>"]+$/;

export function mailtoHref(email: string | null | undefined): string | null {
  const trimmed = email?.trim();
  return trimmed && PLAIN_EMAIL.test(trimmed) ? `mailto:${trimmed}` : null;
}
