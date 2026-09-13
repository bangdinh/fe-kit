// Bộ token của Example. Kit khai VAI TRÒ, file này khai GIÁ TRỊ.
//
// Luật: trong code màn hình KHÔNG có mã màu, không có px cứng cho
// spacing/radius/font. Thiếu token thì thêm vào đây, đừng viết thẳng giá trị —
// một lần hardcode là một chỗ không đổi theo theme được nữa.
import { defineTokens, type ThemeMode } from 'fe-kit/ui';

export function tokensFor(mode: ThemeMode) {
  return defineTokens(mode, {
    color:
      mode === 'dark'
        ? { primary: '#60a5fa' }
        : { primary: '#2563eb' },
  });
}
