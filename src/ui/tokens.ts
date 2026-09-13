// HỢP ĐỒNG design token. Kit khai CÁC VAI TRÒ; sản phẩm khai GIÁ TRỊ.
//
// Vì sao tách: màu thương hiệu là của sản phẩm, còn "nút primary lấy màu ở vai
// trò nào" là của khung. Kit mà ship bảng màu của một sản phẩm thì mọi sản
// phẩm cài về đều thừa kế thương hiệu của người khác — và sẽ sửa bằng cách ghi
// đè rải rác, tức là quay lại hardcode.
//
// Luật đi kèm (bắt buộc, đã trả giá ở app khác): trong code sản phẩm KHÔNG có
// mã màu, không có px cứng cho spacing/radius/font. Có token thì dùng token;
// thiếu token thì THÊM VÀO BẢNG, không viết thẳng giá trị.

export type ThemeMode = 'light' | 'dark';

/** Vai trò màu — đủ để dựng một dashboard, không nhiều hơn. */
export interface ColorTokens {
  /** Màu hành động chính (nút primary, link, trạng thái chọn). */
  primary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;

  /** Nền trang. */
  background: string;
  /** Nền bề mặt nổi trên trang: card, modal, dropdown. */
  surface: string;
  /** Nền phụ: hàng zebra, vùng chìm. */
  surfaceMuted: string;

  /** Chữ chính. */
  text: string;
  /** Chữ phụ, nhãn. */
  textMuted: string;
  /** Chữ trên nền `primary`. */
  textOnPrimary: string;

  border: string;
  borderStrong: string;

  /**
   * Lớp phủ hover/disabled — màu CÓ ALPHA, chồng lên nền bên dưới.
   * Xem `blendOverlay` để hiểu vì sao cần hoà sẵn thay vì dựng thêm lớp DOM.
   */
  overlayHover: string;
  overlayActive: string;
}

export interface SpacingTokens {
  xs: number; sm: number; md: number; lg: number; xl: number; xxl: number;
}

export interface RadiusTokens {
  none: number; sm: number; md: number; lg: number; pill: number;
}

export interface TypographyTokens {
  fontFamily: string;
  fontFamilyMono: string;
  size: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
  lineHeight: { tight: number; normal: number; relaxed: number };
  weight: { regular: number; medium: number; semibold: number; bold: number };
}

export interface MotionTokens {
  /** ms */
  fast: number;
  normal: number;
  slow: number;
  easeStandard: string;
  easeEnter: string;
  easeExit: string;
}

export interface DesignTokens {
  mode: ThemeMode;
  color: ColorTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  typography: TypographyTokens;
  motion: MotionTokens;
  shadow: { sm: string; md: string; lg: string };
}

/** Thang cách đều — dùng chung cho mọi theme, đổi thì đổi ở sản phẩm. */
const SPACING: SpacingTokens = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
const RADIUS: RadiusTokens = { none: 0, sm: 4, md: 8, lg: 12, pill: 999 };

const TYPOGRAPHY: TypographyTokens = {
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  fontFamilyMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  size: { xs: 12, sm: 13, md: 14, lg: 16, xl: 20, xxl: 24 },
  lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
};

/**
 * Thời lượng chuyển động. Ngắn có chủ đích: hoạt ảnh trên bảng điều khiển là
 * để mắt bám kịp thay đổi, không phải để trình diễn.
 */
const MOTION: MotionTokens = {
  fast: 120,
  normal: 200,
  slow: 320,
  easeStandard: 'cubic-bezier(0.2, 0, 0, 1)',
  easeEnter: 'cubic-bezier(0, 0, 0.2, 1)',
  easeExit: 'cubic-bezier(0.4, 0, 1, 1)',
};

const LIGHT: ColorTokens = {
  primary: '#2563eb',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0891b2',
  background: '#f5f6f8',
  surface: '#ffffff',
  surfaceMuted: '#f0f1f4',
  text: '#1f2329',
  textMuted: '#5c6470',
  textOnPrimary: '#ffffff',
  border: '#e3e5e9',
  borderStrong: '#c8ccd4',
  overlayHover: '#0000000a',
  overlayActive: '#00000014',
};

const DARK: ColorTokens = {
  primary: '#60a5fa',
  success: '#4ade80',
  warning: '#fbbf24',
  danger: '#f87171',
  info: '#22d3ee',
  background: '#15171a',
  surface: '#1d2024',
  surfaceMuted: '#24282e',
  text: '#e8eaed',
  textMuted: '#9aa3ae',
  textOnPrimary: '#0b0d10',
  border: '#2e333a',
  borderStrong: '#414954',
  overlayHover: '#ffffff0f',
  overlayActive: '#ffffff1a',
};

/**
 * Bộ token TRUNG TÍNH của kit — xám + một xanh, cố ý nhạt nhoà.
 *
 * Đây là chỗ đứng để app mới chạy được ngay, KHÔNG phải bộ nhận diện. Sản phẩm
 * gọi `defineTokens` để đắp thương hiệu lên.
 */
export function defaultTokens(mode: ThemeMode = 'light'): DesignTokens {
  return {
    mode,
    color: mode === 'dark' ? DARK : LIGHT,
    spacing: SPACING,
    radius: RADIUS,
    typography: TYPOGRAPHY,
    motion: MOTION,
    shadow:
      mode === 'dark'
        ? {
            sm: '0 1px 2px rgba(0,0,0,0.4)',
            md: '0 4px 12px rgba(0,0,0,0.45)',
            lg: '0 12px 32px rgba(0,0,0,0.5)',
          }
        : {
            sm: '0 1px 2px rgba(16,24,40,0.06)',
            md: '0 4px 12px rgba(16,24,40,0.08)',
            lg: '0 12px 32px rgba(16,24,40,0.12)',
          },
  };
}

export type TokenOverrides = {
  [K in keyof Omit<DesignTokens, 'mode'>]?: Partial<DesignTokens[K]>;
};

/** Bộ token của sản phẩm = mặc định của kit + phần ghi đè, trộn theo NHÓM. */
export function defineTokens(mode: ThemeMode, overrides: TokenOverrides = {}): DesignTokens {
  const base = defaultTokens(mode);
  return {
    mode,
    color: { ...base.color, ...overrides.color },
    spacing: { ...base.spacing, ...overrides.spacing },
    radius: { ...base.radius, ...overrides.radius },
    typography: { ...base.typography, ...overrides.typography } as TypographyTokens,
    motion: { ...base.motion, ...overrides.motion },
    shadow: { ...base.shadow, ...overrides.shadow },
  };
}
