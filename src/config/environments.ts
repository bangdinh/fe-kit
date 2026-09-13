// Bảng môi trường — CƠ CHẾ nằm ở kit, DỮ LIỆU nằm ở sản phẩm.
//
// Kit không biết một URL nào. Sản phẩm khai bảng của mình một lần rồi chọn
// bằng ĐÚNG MỘT biến (mặc định `APP_ENV`). Cách này chặn lỗi "lệch môi trường":
// không thể có chuyện gateway trỏ beta còn SSO trỏ prod, vì chọn một khoá là
// mọi endpoint đi theo.
import { envVar } from './env';

export interface DefineEnvironmentsOptions<N extends string, K extends string> {
  /** Môi trường dùng khi biến không được đặt. Mặc định: khoá ĐẦU TIÊN của bảng. */
  default?: N;
  /** Tên biến chọn môi trường. Mặc định `APP_ENV`. */
  envVarName?: string;
  /**
   * Cho phép đè TỪNG endpoint bằng biến môi trường — dùng cho devtunnel, khi
   * một service chạy local còn phần còn lại ở beta.
   *
   * Khai tường minh, không suy ra theo quy ước: một quy ước đặt tên ngầm nghĩa
   * là mọi biến gõ sai đều im lặng không có tác dụng.
   */
  overrides?: Partial<Record<K, string>>;
}

export interface Environments<N extends string, K extends string> {
  /** Danh sách môi trường đã khai, đúng thứ tự khai. */
  readonly names: readonly N[];
  /** Môi trường đang chọn — đọc lại env mỗi lần gọi, không cache. */
  current(): N;
  /** Endpoint của môi trường đang chọn (hoặc của `name` nếu truyền vào). */
  resolve(name?: N): Readonly<Record<K, string>>;
  /** Một endpoint. Ném lỗi nói rõ phải sửa ở đâu nếu khoá không có trong bảng. */
  endpoint(key: K, name?: N): string;
}

/**
 * Khai bảng môi trường của sản phẩm.
 *
 * ```ts
 * export const env = defineEnvironments({
 *   uat:  { gateway: 'https://uat-gw.example.com',  sso: 'https://uat-sso.example.com' },
 *   beta: { gateway: 'https://beta-gw.example.com', sso: 'https://beta-sso.example.com' },
 *   prod: { gateway: 'https://gw.example.com',      sso: 'https://sso.example.com' },
 * }, {
 *   default: 'uat',                                  // KHÔNG bao giờ vô tình chạy prod
 *   overrides: { gateway: 'API_GATEWAY_URI' },
 * });
 * ```
 *
 * Mọi môi trường phải khai ĐỦ cùng một bộ khoá — TypeScript ép việc đó, vì một
 * endpoint thiếu ở đúng một môi trường là lỗi chỉ nổ trên môi trường đó.
 */
export function defineEnvironments<
  T extends Record<string, Record<string, string>>,
  N extends Extract<keyof T, string> = Extract<keyof T, string>,
  K extends Extract<keyof T[N], string> = Extract<keyof T[N], string>,
  // `NoInfer` là bắt buộc, không phải trang trí: thiếu nó thì TypeScript suy
  // N và K từ CHÍNH `options` — khai `overrides: { gateway: … }` sẽ thu hẹp tập
  // khoá xuống còn `'gateway'`, và `endpoint('webOrigin')` thành lỗi biên dịch
  // dù khoá đó có thật trong bảng. Lỗi này chỉ lộ ra ở dự án tiêu thụ.
>(
  table: T,
  options: DefineEnvironmentsOptions<NoInfer<N>, NoInfer<K>> = {},
): Environments<N, K> {
  const names = Object.keys(table) as N[];
  if (names.length === 0) {
    throw new Error('defineEnvironments: bảng rỗng — khai ít nhất một môi trường.');
  }
  const first = names[0] as N;
  const fallback = options.default ?? first;
  if (!(fallback in table)) {
    throw new Error(
      `defineEnvironments: default "${fallback}" không có trong bảng (${names.join(', ')}).`,
    );
  }
  const varName = options.envVarName ?? 'APP_ENV';
  const overrides = (options.overrides ?? {}) as Partial<Record<K, string>>;

  const current = (): N => {
    const raw = envVar(varName);
    return raw !== undefined && raw in table ? (raw as N) : fallback;
  };

  const resolve = (name?: N): Readonly<Record<K, string>> => {
    const env = name ?? current();
    const base = table[env];
    if (!base) {
      throw new Error(
        `Môi trường "${env}" không có trong bảng (${names.join(', ')}). ` +
          `Sửa bảng ở chỗ gọi defineEnvironments, hoặc đặt ${varName} về một trong các giá trị đó.`,
      );
    }
    const out = { ...base } as Record<K, string>;
    for (const key of Object.keys(overrides) as K[]) {
      const varKey = overrides[key];
      const value = varKey ? envVar(varKey) : undefined;
      if (value !== undefined) out[key] = value;
    }
    return Object.freeze(out);
  };

  const endpoint = (key: K, name?: N): string => {
    const value = resolve(name)[key];
    if (!value) {
      throw new Error(
        `Không có endpoint "${String(key)}" cho môi trường "${name ?? current()}". ` +
          'Thêm khoá đó vào bảng môi trường của dự án.',
      );
    }
    return value;
  };

  return { names, current, resolve, endpoint };
}
