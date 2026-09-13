// Trang công khai — chạy được ngay sau khi scaffold, chưa cần IdP nào.
import Link from 'next/link';
import { env } from '@example/shared';

export default function Home() {
  return (
    <main style={{ padding: 'var(--fk-space-xl)', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 'var(--fk-font-size-xxl)' }}>Example</h1>
      <p style={{ color: 'var(--fk-color-text-muted)' }}>
        Dựng trên <code>fe-kit</code> v0.1.0. Môi trường: <strong>{env.current()}</strong>
      </p>
      <ul style={{ lineHeight: 'var(--fk-line-height-relaxed)' }}>
        <li>Bảng môi trường: <code>shared/src/env.ts</code></li>
        <li>Token giao diện: <code>shared/src/tokens.ts</code></li>
        <li>Client gọi API: <code>shared/src/api.ts</code></li>
      </ul>
      <p>
        <Link href="/app">Vào khu vực cần đăng nhập →</Link>{' '}
        <span style={{ color: 'var(--fk-color-text-muted)' }}>(cần cấu hình OIDC trước)</span>
      </p>
    </main>
  );
}
