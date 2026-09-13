// Giữ access_token còn hạn trước khi request chạm tới trang.
//
// Next 16 gọi quy ước file này là `proxy.ts` (trước 16 tên là `middleware.ts`).
//
// Luật kit áp sẵn: KHÔNG refresh trên request prefetch (rê chuột qua menu là
// hàng loạt request — refresh ở đó làm IdP thu hồi cả phiên), và refresh hỏng
// thì xoá cookie rồi mới đá về login (không xoá là vòng lặp redirect vô tận).
import { createSessionProxy } from 'fe-kit/server';
import { refreshWith, sessionCookies } from '@/lib/session';

const PUBLIC = [/^\/$/, /^\/login/, /^\/api\/auth\//];

export const proxy = createSessionProxy({
  cookies: sessionCookies,
  refresh: (refreshToken, req) => refreshWith(refreshToken, req.nextUrl.origin),
  isPublic: (req) => PUBLIC.some((re) => re.test(req.nextUrl.pathname)),
  loginPath: '/login',
});

export default proxy;

export const config = {
  // Bỏ qua asset tĩnh: chúng không có phiên và không cần phiên.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
