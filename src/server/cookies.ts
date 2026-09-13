// BỘ COOKIE PHIÊN — định nghĩa một chỗ, ghi/xoá theo bộ.
//
// Vì sao theo bộ: mỗi route tự set/xoá vài cái là sớm muộn có route xoá thiếu
// một cái, và phiên kẹt ở trạng thái nửa vời (còn `tenant` mà mất token) —
// trạng thái đó không có màn hình nào xử lý nên nó biểu hiện thành vòng lặp
// redirect không lời giải thích.
//
// ⚠ KHÔNG để quyền vào cookie. Vài trăm action sau URL-encode vượt trần 4096
// byte của cookie; trình duyệt drop IM LẶNG và người dùng mất sạch quyền mà
// không có lỗi nào. Quyền đọc ở server mỗi request.
//
// File này KHÔNG import `next/*`: mọi hàm nhận thẳng một COOKIE STORE, thứ mà
// `res.cookies` (NextResponse), `await cookies()` (next/headers) và
// `req.cookies` (NextRequest) đều khớp theo hình dạng — nhờ vậy cùng một bộ
// luật dùng được ở route handler, middleware và Server Action.
import { nodeEnv } from '../config/env';
import type { TokenSet } from '../auth/token';

export interface CookieWriter {
  set(name: string, value: string, options: CookieOptions): unknown;
}

export interface CookieReader {
  get(name: string): { value: string } | undefined;
}

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
}

export interface SessionCookieNames {
  access: string;
  refresh: string;
  idToken: string;
  /** Tenant/công ty đang làm việc. */
  tenant: string;
  /** Realm xác thực của phiên — KHÁC tenant khi một công ty là một realm. */
  realm: string;
}

export const DEFAULT_SESSION_COOKIE_NAMES: SessionCookieNames = {
  access: 'session_token',
  refresh: 'refresh_token',
  idToken: 'id_token',
  tenant: 'tenant_id',
  realm: 'auth_realm',
};

export interface SessionSnapshot {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  tenantId?: string;
  realm?: string;
}

export interface SessionCookiesOptions {
  names?: Partial<SessionCookieNames>;
  /** Mặc định bật khi `NODE_ENV === 'production'`. */
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  /** Dùng khi IdP không trả `refresh_expires_in`, hoặc trả 0 (offline token). */
  refreshMaxAge?: number;
}

export interface SessionCookies {
  readonly names: SessionCookieNames;
  /** Mọi cookie thuộc phiên — thứ bị xoá khi đăng xuất. */
  readonly all: readonly string[];
  entriesFor(tokens: TokenSet): { name: string; value: string; options: CookieOptions }[];
  write(res: CookieWriter, tokens: TokenSet): void;
  writeTenant(res: CookieWriter, tenantId: string): void;
  clearTenant(res: CookieWriter): void;
  writeRealm(res: CookieWriter, realm: string | undefined): void;
  clear(res: CookieWriter): void;
  read(store: CookieReader): SessionSnapshot;
}

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function createSessionCookies(options: SessionCookiesOptions = {}): SessionCookies {
  const names: SessionCookieNames = { ...DEFAULT_SESSION_COOKIE_NAMES, ...options.names };
  const refreshMaxAge = options.refreshMaxAge ?? THIRTY_DAYS;
  const base = {
    httpOnly: true as const,
    secure: options.secure ?? nodeEnv() === 'production',
    sameSite: options.sameSite ?? ('lax' as const),
    path: options.path ?? '/',
  };
  const all = [names.access, names.refresh, names.idToken, names.tenant, names.realm];

  const entriesFor: SessionCookies['entriesFor'] = (tokens) => {
    // `refresh_expires_in: 0` (offline token) đưa thẳng vào `maxAge` là XOÁ
    // cookie — đúng cái cần giữ nhất.
    const refreshAge =
      tokens.refresh_expires_in && tokens.refresh_expires_in > 0
        ? tokens.refresh_expires_in
        : refreshMaxAge;

    const out = [
      { name: names.access, value: tokens.access_token, options: { ...base, maxAge: tokens.expires_in } },
    ];
    if (tokens.refresh_token) {
      out.push({ name: names.refresh, value: tokens.refresh_token, options: { ...base, maxAge: refreshAge } });
    }
    // `id_token` phải sống ít nhất bằng phiên, nếu không logout mất `id_token_hint`.
    if (tokens.id_token) {
      out.push({ name: names.idToken, value: tokens.id_token, options: { ...base, maxAge: refreshAge } });
    }
    return out;
  };

  const del = (res: CookieWriter, name: string) => res.set(name, '', { ...base, maxAge: 0 });

  return {
    names,
    all,
    entriesFor,
    write(res, tokens) {
      for (const c of entriesFor(tokens)) res.set(c.name, c.value, c.options);
    },
    /**
     * Tenant sống ĐÚNG BẰNG refresh_token.
     *
     * Để nó thành cookie phiên trình duyệt (không maxAge) là bug đã trả giá:
     * đóng/mở lại trình duyệt thì mất tenant trong khi refresh_token còn tốt ⇒
     * vẫn đăng nhập được nhưng không có tenant ⇒ bị hỏi lại chọn công ty, kể cả
     * người chỉ thuộc đúng một công ty.
     */
    writeTenant(res, tenantId) {
      res.set(names.tenant, tenantId, { ...base, maxAge: refreshMaxAge });
    },
    /**
     * Xoá tenant. Gọi ở callback: mỗi lần đổi code→token thành công là MỘT
     * phiên mới — có thể của realm khác, người khác — nên tenant của phiên
     * trước không được đi theo.
     */
    clearTenant(res) {
      del(res, names.tenant);
    },
    /**
     * `realm` rỗng ⇒ XOÁ, KHÔNG để nguyên giá trị cũ. Cookie còn trỏ realm của
     * phiên trước thì verify chạy bằng issuer/JWKS của realm SAI ⇒ token nào
     * cũng fail ⇒ đá về login → lặp vô tận mà trang login không nói được vì sao.
     */
    writeRealm(res, realm) {
      if (!realm) {
        del(res, names.realm);
        return;
      }
      res.set(names.realm, realm, { ...base, maxAge: refreshMaxAge });
    },
    clear(res) {
      for (const name of all) del(res, name);
    },
    read(store) {
      const get = (n: string) => store.get(n)?.value || undefined;
      return {
        accessToken: get(names.access),
        refreshToken: get(names.refresh),
        idToken: get(names.idToken),
        tenantId: get(names.tenant),
        realm: get(names.realm),
      };
    },
  };
}
