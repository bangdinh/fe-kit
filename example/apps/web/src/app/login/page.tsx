export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const { returnTo, error } = await searchParams;
  const href = `/api/auth/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`;
  return (
    <main style={{ padding: 'var(--fk-space-xl)', maxWidth: 420, margin: '0 auto' }}>
      <h1>Đăng nhập</h1>
      {error ? <p style={{ color: 'var(--fk-color-danger)' }}>Đăng nhập không thành: {error}</p> : null}
      <a href={href}>Tiếp tục với SSO →</a>
    </main>
  );
}
