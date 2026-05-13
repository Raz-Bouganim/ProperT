/**
 * Pull a human-readable string from NestJS / axios error `response.data`
 * (handles string body, `{ message: string }`, nested `{ message: { message } }`, and validation arrays).
 */
export function extractApiErrorMessage(data: unknown): string {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof data !== 'object') return '';

  const record = data as Record<string, unknown>;
  const msg = record.message ?? record.msg ?? record.error;

  if (Array.isArray(msg)) {
    const parts = msg
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          return extractApiErrorMessage(item);
        }
        return item != null ? String(item) : '';
      })
      .filter(Boolean);
    return parts.join(', ');
  }
  if (typeof msg === 'string') return msg;
  if (typeof msg === 'object' && msg !== null) {
    return extractApiErrorMessage(msg);
  }
  return '';
}
