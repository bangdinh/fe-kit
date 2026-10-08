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
  /** Path không cần phiên (`/login`, `/health`, asset công khai…). Vẫn đi qua `next`. */
  isPublic?(req: NextRequest): boolean;
  /** Trang đăng nhập. Hàm khi path phụ thuộc request (vd tiền tố locale `/vi/login`). */
  loginPath?: string | ((req: NextRequest) => string);
  /**
   * Tên query param mang đường quay lại sau khi đăng nhập. Đặt `null` để không
   * gắn — tránh open-redirect nếu trang login không tự kiểm tra giá trị (dùng
   * `safeInternalPath` để kiểm).
   */
  returnToParam?: string | null;
  /** Còn dưới ngần này giây thì refresh sớm, khỏi hết hạn giữa chừng. */
  skewSeconds?: number;
  /**
   * Origin công khai để dựng URL redirect. Mặc định lấy từ `req.url`.
   *
   * ⚠ Next `output: 'standalone'` (cách đóng image cho K8S) dựng `req.url` từ
   * hostname mà server bind — `http://0.0.0.0:8080` — bất kể header `Host`, và
   * Location tương đối thì adapter của Next ném `Invalid URL`. Sau ingress, khai
   * hàm này: đọc `x-forwarded-host`/`x-forwarded-proto`, hoặc một biến env cố định.
   * Tin header nào là quyết định của sản phẩm theo hạ tầng của nó, nên kit không
   * tự đọc header.
   */
  origin?(req: NextRequest): string;
  /**
   * Response cho request được đi tiếp — đã có phiên, path public, prefetch, Server
   * Action. Mặc định `NextResponse.next()` có chuyển tiếp header request. Dùng để nối
   * middleware khác (next-intl) hoặc chặn thêm theo nghiệp vụ (bắt chọn công ty).
   *
   * `req` đưa vào đã mang token mới nếu vừa refresh; token mới cũng được ghi lên
   * response hàm này trả về.
   */
  next?(req: NextRequest): NextResponse | Promise<NextResponse>;
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

/**
 * Server Action là một lời gọi RPC, không phải một lần chuyển trang: client POST về
 * chính URL đang đứng và chờ payload RSC của riêng action đó. Trả redirect thì trình
 * duyệt bám theo sang trang khác, React nhận về thứ không phải payload và ném
 * "An unexpected response was received from the server". Action tự gác phiên ở
 * server (requireSession) và tự `redirect()` đúng giao thức.
 */
function isServerAction(req: NextRequest): boolean {
  return req.method === 'POST' && req.headers.has('next-action');
}

/**
 * Chỉ cho phép đường quay lại NỘI BỘ. Giá trị `returnTo` đến từ query string, người
 * dùng sửa được — chặn `//evil.com`, `https://evil.com`, và `\` ở mọi vị trí: WHATWG
 * URL coi `\` như `/` với http(s), nên `/\evil.com` thành `https://evil.com`.
 */
export function safeInternalPath(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}

export function createSessionProxy(options: SessionProxyOptions) {
  const { cookies } = options;
  const loginPathOf = (req: NextRequest): string =>
    typeof options.loginPath === 'function' ? options.loginPath(req) : (options.loginPath ?? '/login');
  const originOf = (req: NextRequest): string => options.origin?.(req) ?? req.url;
  const returnToParam = options.returnToParam === undefined ? 'returnTo' : options.returnToParam;
  const skew = options.skewSeconds ?? 30;
  const passThrough = async (req: NextRequest): Promise<NextResponse> =>
    options.next ? options.next(req) : NextResponse.next({ request: { headers: req.headers } });

  // "Còn sót" xét CẢ BỘ, không riêng token: hai cookie token chết theo maxAge nên trình
  // duyệt tự xoá, còn tenant/realm sống lâu hơn. Chỉ xét token thì sau một quãng nghỉ sẽ
  // không dọn, và lượt đăng nhập sau (realm khác) thừa hưởng tenant của phiên cũ.
  const hasAnySessionCookie = (req: NextRequest): boolean =>
    cookies.all.some((name) => Boolean(req.cookies.get(name)?.value));

  const toLogin = (req: NextRequest): NextResponse => {
    const url = new URL(loginPathOf(req), originOf(req));
    if (returnToParam) url.searchParams.set(returnToParam, req.nextUrl.pathname + req.nextUrl.search);
    const res = NextResponse.redirect(url);
    if (hasAnySessionCookie(req)) cookies.clear(res.cookies);
    return res;
  };

  // Ghi vào REQUEST trước khi đi tiếp: Server Component cùng lượt đọc cookie từ request,
  // không từ response — thiếu bước này thì trang vừa refresh xong vẫn thấy token hết hạn.
  const forwardToRequest = (req: NextRequest, tokens: TokenSet): void => {
    for (const c of cookies.entriesFor(tokens)) req.cookies.set(c.name, c.value);
  };

  return async function sessionProxy(req: NextRequest): Promise<NextResponse> {
    if (options.isPublic?.(req)) return passThrough(req);

    const { accessToken, refreshToken } = cookies.read(req.cookies);
    const action = isServerAction(req);

    if (accessToken && !isJwtExpired(accessToken, skew)) return passThrough(req);
    if (!refreshToken) return action ? passThrough(req) : toLogin(req);

    // Token hết hạn trên một request prefetch: để nguyên, KHÔNG refresh và
    // KHÔNG đá về login — trang thật mà người dùng bấm vào sẽ tự xử lý.
    if (isPrefetch(req)) return passThrough(req);

    let tokens: TokenSet;
    try {
      tokens = await options.refresh(refreshToken, req);
    } catch {
      return action ? passThrough(req) : toLogin(req);
    }
    forwardToRequest(req, tokens);
    const res = await passThrough(req);
    // IdP xoay vòng refresh_token: PHẢI ghi đè, nếu không lượt sau gửi lại
    // token đã chết và phiên đứt ở một request ngẫu nhiên nào đó.
    cookies.write(res.cookies, tokens);
    return res;
  };
}
