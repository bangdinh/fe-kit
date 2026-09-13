// Token → CSS custom properties, để CSS thuần và thư viện không-phải-antd cũng
// đọc được cùng một bảng. Tên biến phẳng: `--fk-color-primary`, `--fk-space-md`.
import type { DesignTokens } from './tokens';

export interface CssVariablesOptions {
  /** Tiền tố biến. Mặc định `fk`. */
  prefix?: string;
}

export function cssVariables(tokens: DesignTokens, options: CssVariablesOptions = {}): Record<string, string> {
  const p = options.prefix ?? 'fk';
  const out: Record<string, string> = {};

  for (const [k, v] of Object.entries(tokens.color)) out[`--${p}-color-${kebab(k)}`] = v;
  for (const [k, v] of Object.entries(tokens.spacing)) out[`--${p}-space-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(tokens.radius)) out[`--${p}-radius-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(tokens.typography.size)) out[`--${p}-font-size-${k}`] = `${v}px`;
  for (const [k, v] of Object.entries(tokens.typography.weight)) out[`--${p}-font-weight-${k}`] = String(v);
  for (const [k, v] of Object.entries(tokens.typography.lineHeight)) out[`--${p}-line-height-${k}`] = String(v);
  for (const [k, v] of Object.entries(tokens.shadow)) out[`--${p}-shadow-${k}`] = v;
  out[`--${p}-font-family`] = tokens.typography.fontFamily;
  out[`--${p}-font-family-mono`] = tokens.typography.fontFamilyMono;
  out[`--${p}-motion-fast`] = `${tokens.motion.fast}ms`;
  out[`--${p}-motion-normal`] = `${tokens.motion.normal}ms`;
  out[`--${p}-motion-slow`] = `${tokens.motion.slow}ms`;
  out[`--${p}-ease-standard`] = tokens.motion.easeStandard;
  out[`--${p}-ease-enter`] = tokens.motion.easeEnter;
  out[`--${p}-ease-exit`] = tokens.motion.easeExit;
  return out;
}

/** Chuỗi `:root{...}` để nhúng thẳng vào `<style>`. */
export function cssVariablesBlock(
  tokens: DesignTokens,
  options: CssVariablesOptions & { selector?: string } = {},
): string {
  const vars = cssVariables(tokens, options);
  const body = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `${options.selector ?? ':root'} {\n${body}\n}`;
}

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
