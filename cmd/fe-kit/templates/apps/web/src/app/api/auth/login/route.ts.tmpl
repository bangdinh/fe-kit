import { startLogin } from 'fe-kit/auth';
import { NextResponse, type NextRequest } from 'next/server';
import { oidcConfig } from '@/lib/session';
import { writeTx } from '../tx';

export async function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? '/app';
  // `realm` chỉ có nghĩa ở hệ một-công-ty-một-realm. Bỏ qua nếu IdP của bạn
  // dùng một realm chung — khi đó xoá luôn tham số này cho khỏi hiểu nhầm.
  const realm = req.nextUrl.searchParams.get('realm') ?? undefined;

  // redirect_uri suy từ origin của CHÍNH request → luôn khớp domain thật, kể
  // cả khi chạy sau proxy hay ở preview deployment.
  const cfg = await oidcConfig(req.nextUrl.origin);
  const { authorizeUrl, tx } = await startLogin(cfg, safeReturnTo(returnTo), realm);

  const res = NextResponse.redirect(authorizeUrl);
  writeTx(res, tx);
  return res;
}

/** Chỉ nhận đường dẫn nội bộ — chặn open-redirect qua `?returnTo=//evil.com`. */
function safeReturnTo(value: string): string {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/app';
}
