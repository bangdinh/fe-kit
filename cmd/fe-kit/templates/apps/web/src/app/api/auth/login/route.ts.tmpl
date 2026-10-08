import { startLogin } from 'fe-kit/auth';
import { safeInternalPath } from 'fe-kit/server';
import { NextResponse, type NextRequest } from 'next/server';
import { oidcConfig } from '@/lib/session';
import { writeTx } from '../tx';

export async function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? '/app';
  // `realm` chỉ có nghĩa ở hệ một-công-ty-một-realm. Bỏ qua nếu IdP của bạn
  // dùng một realm chung — khi đó xoá luôn tham số này cho khỏi hiểu nhầm.
  const realm = req.nextUrl.searchParams.get('realm') ?? undefined;

  // redirect_uri suy từ origin của CHÍNH request. ⚠ Build `output: 'standalone'` sau
  // ingress thì origin này là http://0.0.0.0:8080 — khi đó lấy origin công khai từ
  // x-forwarded-host/proto hoặc một biến env, và dùng cùng hàm đó cho `origin` của
  // createSessionProxy.
  const cfg = await oidcConfig(req.nextUrl.origin);
  const { authorizeUrl, tx } = await startLogin(cfg, safeInternalPath(returnTo, '/app'), realm);

  const res = NextResponse.redirect(authorizeUrl);
  writeTx(res, tx);
  return res;
}
