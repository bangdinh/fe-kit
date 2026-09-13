// Trang cần phiên. Middleware đã chặn trước khi tới đây, nên chỗ này chỉ việc
// đọc cookie — nhưng phán quyết cuối vẫn là của backend, không phải của trang.
import { cookies } from 'next/headers';
import { sessionCookies } from '@/lib/session';

export default async function AppHome() {
  const session = sessionCookies.read(await cookies());
  return (
    <main style={{ padding: 'var(--fk-space-xl)' }}>
      <h1>Khu vực đã đăng nhập</h1>
      <p>tenant: {session.tenantId ?? '(chưa chọn)'}</p>
      <p>realm: {session.realm ?? '(mặc định)'}</p>
      <a href="/api/auth/logout">Đăng xuất</a>
    </main>
  );
}
