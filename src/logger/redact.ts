// Chuẩn hoá dữ liệu TRƯỚC khi ghi log: che bí mật, cắt chuỗi dài, mở Error.
// Mục đích: chỗ gọi chỉ việc truyền nguyên object, không phải tự nhớ
// JSON.stringify(...).slice(0, 300) hay tự redact token như trước.

const SENSITIVE_KEY =
  /(token|authorization|cookie|password|passwd|secret|credential|api[-_]?key)/i;

const MAX_STRING = 300;  // ký tự cho mỗi chuỗi
const MAX_ITEMS = 100;   // phần tử cho mỗi mảng (đủ cho danh sách role/feature/scope)
const MAX_DEPTH = 8;     // độ sâu object (role.features[].{urn,scopes[]} in đủ, không cắt "sâu quá … tầng")

export interface SanitizeOptions {
  /** true (mặc định): che key nhạy cảm. false: giữ nguyên (HTTP debug). */
  redact?: boolean;
  maxString?: number;
  maxDepth?: number;
  maxItems?: number;
}

interface Limits {
  redact: boolean;
  maxString: number;
  maxDepth: number;
  maxItems: number;
}

/** Cắt chuỗi dài, luôn cho biết đã cắt mất bao nhiêu. */
export function truncate(value: unknown, max = MAX_STRING): string {
  const s = typeof value === 'string' ? value : stringify(value);
  return s.length > max ? `${s.slice(0, max)}… (+${s.length - max})` : s;
}

/**
 * Che giá trị nhạy cảm nhưng vẫn đủ để đối chiếu 2 lần chạy: giữ 6 ký tự đầu +
 * 4 ký tự cuối. Với header Authorization thì bỏ tiền tố 'Bearer ' để 6 ký tự
 * đầu rơi vào phần JWT thật.
 */
export function mask(value: unknown): string {
  if (typeof value !== 'string') return '[REDACTED]';
  const raw = value.replace(/^Bearer\s+/i, '');
  if (raw.length <= 12) return '[REDACTED]';
  return `${raw.slice(0, 6)}…${raw.slice(-4)} (len ${raw.length})`;
}

/** Lấy thông điệp lỗi từ giá trị bất kỳ — thay cho fmtErr viết lại ở mỗi file. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message || e.name;
  if (typeof e === 'string') return e;
  return stringify(e);
}

/** Đệ quy làm sạch một giá trị bất kỳ để an toàn khi đưa vào sink. */
export function sanitize(value: unknown, options?: SanitizeOptions): unknown {
  const limits: Limits = {
    redact: options?.redact ?? true,
    maxString: options?.maxString ?? MAX_STRING,
    maxDepth: options?.maxDepth ?? MAX_DEPTH,
    maxItems: options?.maxItems ?? MAX_ITEMS,
  };
  return walk(value, 0, new WeakSet<object>(), limits);
}

function walk(value: unknown, depth: number, seen: WeakSet<object>, limits: Limits): unknown {
  if (value === null || value === undefined) return value;

  const t = typeof value;
  if (t === 'number' || t === 'boolean') return value;
  if (t === 'string') {
    return Number.isFinite(limits.maxString)
      ? truncate(value as string, limits.maxString)
      : (value as string);
  }
  if (t === 'bigint' || t === 'symbol' || t === 'function') return String(value);

  const obj = value as object;
  if (seen.has(obj)) return '[Circular]';
  seen.add(obj);

  if (value instanceof Error) return sanitizeError(value, depth, seen, limits);
  if (value instanceof Date) return value.toISOString();

  // Chạm trần độ sâu: KHÔNG in nội dung nữa, nhưng vẫn nói rõ cắt mất cái gì và
  // to bao nhiêu. Nhãn trần trước đây là '[Array]' trần trụi, đọc log không phân
  // biệt được "mảng rỗng" với "mảng 300 phần tử bị cắt".
  if (depth >= limits.maxDepth) {
    return Array.isArray(value)
      ? `[Array(${value.length}) — sâu quá ${limits.maxDepth} tầng]`
      : `[Object(${Object.keys(value as object).length} key) — sâu quá ${limits.maxDepth} tầng]`;
  }

  if (Array.isArray(value)) {
    const items = value.slice(0, limits.maxItems).map((v) => walk(v, depth + 1, seen, limits));
    return value.length > limits.maxItems
      ? [...items, `… (+${value.length - limits.maxItems})`]
      : items;
  }

  return sanitizeEntries(value as Record<string, unknown>, depth, seen, limits);
}

function sanitizeError(e: Error, depth: number, seen: WeakSet<object>, limits: Limits) {
  const out: Record<string, unknown> = { name: e.name, message: e.message };
  for (const key of Object.keys(e)) {
    if (key === 'name' || key === 'message' || key === 'stack') continue;
    const val = (e as unknown as Record<string, unknown>)[key];
    out[key] = limits.redact && SENSITIVE_KEY.test(key) ? mask(val) : walk(val, depth + 1, seen, limits);
  }
  if (e.stack) out.stack = e.stack;
  if (e.cause !== undefined) out.cause = errorMessage(e.cause);
  return out;
}

function sanitizeEntries(
  input: Record<string, unknown>,
  depth: number,
  seen: WeakSet<object>,
  limits: Limits,
) {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input)) {
    out[key] = limits.redact && SENSITIVE_KEY.test(key)
      ? mask(val)
      : walk(val, depth + 1, seen, limits);
  }
  return out;
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
