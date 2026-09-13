// Token của kit → `ThemeConfig` của antd.
//
// Kit KHÔNG xuất component nào. Lý do: một bộ component dùng chung chỉ đứng
// vững khi hai sản phẩm thật sự cần y hệt nhau, mà điều đó gần như không xảy ra
// với màn hình nghiệp vụ. Thứ dùng chung được là BẢNG TOKEN và cách nối nó vào
// thư viện — đúng phần này.
import type { ThemeConfig } from 'antd';
import { blendOverlay } from './color';
import type { DesignTokens } from './tokens';

export interface AntdThemeOptions {
  /** Ghi đè cuối cùng, sau khi kit đã map xong. Dùng cho ngoại lệ có bằng chứng. */
  overrides?: ThemeConfig;
}

/**
 * Map bảng token sang `theme.token` + `theme.components` của antd.
 *
 * Chỉ map những khoá antd thực sự đọc. Rải thêm khoá "cho đủ" là cách nhanh
 * nhất để có một theme mà không ai dám sửa vì không biết khoá nào còn tác dụng.
 */
export function createAntdTheme(tokens: DesignTokens, options: AntdThemeOptions = {}): ThemeConfig {
  const c = tokens.color;
  const hoverSurface = blendOverlay(c.surface, c.overlayHover);
  const activeSurface = blendOverlay(c.surface, c.overlayActive);

  const config: ThemeConfig = {
    token: {
      colorPrimary: c.primary,
      colorSuccess: c.success,
      colorWarning: c.warning,
      colorError: c.danger,
      colorInfo: c.info,

      colorBgLayout: c.background,
      colorBgContainer: c.surface,
      colorBgElevated: c.surface,
      colorFillSecondary: c.surfaceMuted,

      colorText: c.text,
      colorTextSecondary: c.textMuted,
      colorTextDescription: c.textMuted,

      colorBorder: c.borderStrong,
      colorBorderSecondary: c.border,

      borderRadius: tokens.radius.md,
      borderRadiusSM: tokens.radius.sm,
      borderRadiusLG: tokens.radius.lg,

      fontFamily: tokens.typography.fontFamily,
      fontFamilyCode: tokens.typography.fontFamilyMono,
      fontSize: tokens.typography.size.md,
      fontSizeSM: tokens.typography.size.sm,
      fontSizeLG: tokens.typography.size.lg,
      fontSizeHeading1: tokens.typography.size.xxl,
      fontSizeHeading2: tokens.typography.size.xl,
      fontSizeHeading3: tokens.typography.size.lg,
      lineHeight: tokens.typography.lineHeight.normal,

      padding: tokens.spacing.md,
      paddingXS: tokens.spacing.xs,
      paddingSM: tokens.spacing.sm,
      paddingLG: tokens.spacing.lg,
      margin: tokens.spacing.md,

      boxShadow: tokens.shadow.md,
      boxShadowSecondary: tokens.shadow.lg,

      motionDurationFast: `${tokens.motion.fast}ms`,
      motionDurationMid: `${tokens.motion.normal}ms`,
      motionDurationSlow: `${tokens.motion.slow}ms`,
      motionEaseInOut: tokens.motion.easeStandard,
    },
    components: {
      Button: {
        defaultHoverBg: hoverSurface,
        defaultActiveBg: activeSurface,
        primaryColor: c.textOnPrimary,
      },
      Table: {
        headerBg: c.surfaceMuted,
        rowHoverBg: hoverSurface,
        borderColor: c.border,
      },
      Menu: {
        itemSelectedBg: blendOverlay(c.surface, c.overlayActive),
        itemHoverBg: hoverSurface,
      },
      Layout: {
        bodyBg: c.background,
        headerBg: c.surface,
        siderBg: c.surface,
      },
      Card: { colorBorderSecondary: c.border },
      Input: { colorBgContainer: c.surface },
    },
  };

  if (!options.overrides) return config;
  return {
    ...config,
    ...options.overrides,
    token: { ...config.token, ...options.overrides.token },
    components: { ...config.components, ...options.overrides.components },
  };
}
