// Phép màu duy nhất kit giữ: hoà một lớp có alpha xuống thành MỘT màu đục.
//
// Vì sao cần: design tool diễn đạt hover/disabled bằng cách CHỒNG LỚP — một lớp
// trắng 6% đè lên nền. Trong DOM, chồng lớp cần thêm một element phủ; nhưng
// token của antd (và của hầu hết thư viện) chỉ nhận MỘT giá trị màu cho
// `defaultHoverBg`. Nên hoà sẵn ở đây thay vì dựng thêm lớp DOM.
//
// Không dùng `color-mix()` của CSS: giá trị này còn phải so sánh/kế thừa ở JS
// (cssinjs sinh rule tĩnh), nơi không có trình duyệt nào để tính hộ.

function parseHex(hex: string): [number, number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return [r, g, b, a];
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

/** Hoà `layer` (có alpha) lên `base` (đục) thành một màu đục. */
export function blendOverlay(base: string, layer: string): string {
  const [br, bg, bb] = parseHex(base);
  const [lr, lg, lb, la] = parseHex(layer);
  const mix = (b: number, l: number) => b * (1 - la) + l * la;
  return `#${toHex(mix(br, lr))}${toHex(mix(bg, lg))}${toHex(mix(bb, lb))}`;
}

/** `#RRGGBB` + alpha [0,1] → `rgba(...)`. Dùng cho bóng, vòng focus. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}
