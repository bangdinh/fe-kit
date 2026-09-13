import type { Metadata } from 'next';
import { cssVariablesBlock } from 'fe-kit/ui';
import { tokensFor } from '@example/shared';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Example',
  description: 'Dựng trên fe-kit v0.1.0',
};

// Token ra CSS variable một lần ở đây, để CSS thuần đọc được cùng bảng mà antd
// đang dùng — không có bảng màu thứ hai.
const vars = cssVariablesBlock(tokensFor('light'));

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <style dangerouslySetInnerHTML={{ __html: vars }} />
      </head>
      <body style={{ margin: 0, fontFamily: 'var(--fk-font-family)', background: 'var(--fk-color-background)', color: 'var(--fk-color-text)' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
