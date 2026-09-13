// Đọc biến môi trường an toàn trên MỌI runtime kit chạy: Node, Edge, trình
// duyệt, Hermes/React Native. Ba nơi sau có thể không có `process` — chạm
// thẳng `process.env` là ném ReferenceError ngay lúc nạp module, và lỗi đó
// xuất hiện dưới dạng "màn hình trắng", không phải dưới dạng stack trace đọc được.
//
// Lấy qua `globalThis` chứ không viết thẳng chữ `process`: kit ship SOURCE nên
// nó được type-check bằng tsconfig CỦA DỰ ÁN TIÊU THỤ, và app React Native
// hay package dùng chung thường không khai `types: ["node"]`. Viết thẳng
// `process` ở đó là lỗi biên dịch trong node_modules — thứ người dùng kit
// không sửa được.

interface ProcessLike {
  env?: Record<string, string | undefined>;
}

/** `process` nếu runtime có, `undefined` nếu không. Không ném ở đâu cả. */
export function processEnv(): Record<string, string | undefined> | undefined {
  return (globalThis as { process?: ProcessLike }).process?.env;
}

/** Đọc thô một biến, không có luật "rỗng = mặc định" của `envVar`. */
export function rawEnv(key: string): string | undefined {
  return processEnv()?.[key];
}

/** `NODE_ENV`, hoặc `undefined` khi runtime không có `process`. */
export function nodeEnv(): string | undefined {
  return rawEnv('NODE_ENV');
}

/**
 * Đọc một biến, thử lần lượt `KEY`, `NEXT_PUBLIC_KEY`, `EXPO_PUBLIC_KEY`.
 *
 * Giá trị RỖNG nghĩa là "dùng mặc định", không phải "dùng chuỗi rỗng". Nhờ vậy
 * một placeholder trống trong `.env.example` không bao giờ đè lên một mặc định thật.
 */
export function envVar(key: string): string | undefined {
  const e = processEnv();
  if (!e) return undefined;
  const raw = e[key] ?? e[`NEXT_PUBLIC_${key}`] ?? e[`EXPO_PUBLIC_${key}`];
  return raw && raw.length > 0 ? raw : undefined;
}

/** Cờ bật/tắt. Chỉ `1` / `true` / `yes` là bật — mọi giá trị khác là tắt. */
export function envFlag(key: string, fallback = false): boolean {
  const raw = envVar(key);
  if (raw === undefined) return fallback;
  return raw === '1' || raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
}

/** Số dương. Không phải số, hoặc ≤ 0, thì rơi về mặc định. */
export function envNumber(key: string, fallback: number): number {
  const raw = envVar(key);
  const n = raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function isProduction(): boolean {
  return nodeEnv() === 'production';
}
