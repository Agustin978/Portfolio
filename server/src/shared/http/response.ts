export const ok = <T>(data: T, meta: Record<string, unknown> = {}) => ({
  success: true as const,
  data,
  meta,
});
