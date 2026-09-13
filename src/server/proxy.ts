// Lớp chặn phiên cho Next.js: giữ access_token còn hạn, đá về login khi hết.
//
// Next 16 đổi tên quy ước file từ `middleware.ts` sang `proxy.ts` (cùng một
// thứ, chạy trước khi request tới route). Tên hàm ở đây đi theo tên mới để
// khỏi phải nhớ hai từ vựng cho một khái niệm.
//
// Đặt ở kit vì đây là chỗ dễ viết sai nhất và sai thì im lặng:
//   • refresh trên request PREFETCH ⇒ rotation quay vòng, phiên bị thu hồi;
//   • refresh xong quên ghi cookie mới ⇒ lượt sau dùng refresh_token đã chết;
//   • refresh hỏng mà không xoá cookie ⇒ vòng lặp redirect login → app → login.
import { NextResponse, type NextRequest } from 'next/server';
import { isJwtExpired } from '../auth/jwt';
import type { TokenSet } from '../auth/token';
import type { SessionCookies } from './cookies';

export interface SessionProxyOptions {
  cookies: SessionCookies;
  /**
   * Đổi refresh_token → token mới. Sản phẩm cung cấp vì chỉ nó biết realm/
   * client nào áp cho phiên này (đọc được từ `cookies.read(req).realm`).
   *
   * Ném lỗi = phiên chết: proxy xoá cookie và đá về `loginPath`.
   */
  refresh(refreshToken: string, req: NextRequest): Promise<TokenSet>;
  /** Path không cần phiên (`/login`, `/health`, asset công khai…). */
  isPublic?(req: NextRequest): boolean;
  loginPath?: string;
  /**
   * Tên query param mang đường quay lại sau khi đăng nhập. Đặt `null` để không
   * gắn — tránh open-redirect nếu trang login không tự kiểm tra giá trị.
   */
  returnToParam?: string | null;
  /** Còn dưới ngần này giây thì refresh sớm, khỏi hết hạn giữa chừng. */
  skewSeconds?: number;
}

/**
 * Request prefetch của Next Router KHÔNG được refresh.
 *
 * Router prefetch link khi hover: mỗi link là một request đi qua middleware.
 * Refresh ở đó nghĩa là hàng loạt lời gọi refresh song song trên CÙNG một
 * refresh_token, và IdP bật reuse-detection sẽ coi đó là token bị đánh cắp rồi
 * thu hồi cả phiên. Người dùng bị đăng xuất vì đã… rê chuột qua menu.
 */
function isPrefetch(req: NextRequest): boolean {
  const h = req.headers;
  return (
    h.get('next-router-prefetch') === '1' ||
    h.get('purpose') === 'prefetch' ||
    h.get('x-purpose') === 'prefetch' ||
    h.get('sec-purpose')?.includes('prefetch') === true
  );
}

export function createSessionProxy(options: SessionProxyOptions) {
  const { cookies } = options;
  const loginPath = options.loginPath ?? '/login';
  const returnToParam = options.returnToParam === undefined ? 'returnTo' : options.returnToParam;
  const skew = options.skewSeconds ?? 30;

  const toLogin = (req: NextRequest, clearSession: boolean): NextResponse => {
    const url = new URL(loginPath, req.url);
    if (returnToParam) url.searchParams.set(returnToParam, req.nextUrl.pathname + req.nextUrl.search);
    const res = NextResponse.redirect(url);
    if (clearSession) cookies.clear(res.cookies);
    return res;
  };

  return async function sessionProxy(req: NextRequest): Promise<NextResponse> {
    if (options.isPublic?.(req)) return NextResponse.next();

    const { accessToken, refreshToken } = cookies.read(req.cookies);

    if (accessToken && !isJwtExpired(accessToken, skew)) return NextResponse.next();
    if (!refreshToken) return toLogin(req, Boolean(accessToken));

    // Token hết hạn trên một request prefetch: để nguyên, KHÔNG refresh và
    // KHÔNG đá về login — trang thật mà người dùng bấm vào sẽ tự xử lý.
    if (isPrefetch(req)) return NextResponse.next();

    try {
      const tokens = await options.refresh(refreshToken, req);
      const res = NextResponse.next();
      // IdP xoay vòng refresh_token: PHẢI ghi đè, nếu không lượt sau gửi lại
      // token đã chết và phiên đứt ở một request ngẫu nhiên nào đó.
      cookies.write(res.cookies, tokens);
      return res;
    } catch {
      return toLogin(req, true);
    }
  };
}
