// Kế hoạch sinh dự án — THUẦN: không đọc/ghi đĩa, không gọi mạng.
//
// Tách khỏi `index.js` để test được cái đáng test (chọn file nào, thay giá trị
// gì) mà không phải dựng thư mục thật rồi dọn.

/** Nền tảng kit hỗ trợ. Thứ tự này là thứ tự hiển thị ở mọi chỗ. */
export const PLATFORMS = ['web', 'mobile', 'desktop'];

/** Dependency trỏ về kit khi sinh dự án thật (không phải example trong repo kit). */
export const DEFAULT_KIT_SPEC = 'git+ssh://git@git.fpt.net/fli-backend/b2b-v2/fe-kit.git#v0.1.0';

export class PlanError extends Error {}

function assert(condition, message) {
  if (!condition) throw new PlanError(message);
}

/** `kho-hang` → `KhoHang`. Dùng cho tên class/component trong template. */
export function pascalCase(name) {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join('');
}

/** `kho-hang` → `Kho hang`. Tiêu đề đọc được. */
export function titleCase(name) {
  const words = name.split(/[-_\s]+/).filter(Boolean);
  return words.map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}

export function validateName(name) {
  assert(typeof name === 'string' && name.length > 0, 'Thiếu tên dự án.');
  assert(
    /^[a-z][a-z0-9-]*$/.test(name),
    `Tên "${name}" không hợp lệ. Dùng chữ thường, số và dấu gạch ngang, bắt đầu bằng chữ (vd: kho-hang).`,
  );
  return name;
}

export function normalizePlatforms(input) {
  const raw = Array.isArray(input) ? input : String(input ?? 'web').split(',');
  const picked = raw.map((p) => p.trim()).filter(Boolean);
  assert(picked.length > 0, 'Phải chọn ít nhất một nền tảng.');
  for (const p of picked) {
    assert(PLATFORMS.includes(p), `Nền tảng "${p}" không có. Chọn trong: ${PLATFORMS.join(', ')}.`);
  }
  // Trả về theo thứ tự chuẩn, bỏ trùng.
  return PLATFORMS.filter((p) => picked.includes(p));
}

/**
 * File template nào đi vào dự án này.
 *
 * Luật DUY NHẤT: thư mục `apps/<platform>/` chỉ vào khi nền tảng đó được chọn.
 * Mọi file khác luôn vào. Không có điều kiện nào nằm TRONG nội dung file —
 * template phải là file hợp lệ, mở ra đọc được, chạy lint được.
 */
export function includes(relPath, platforms) {
  const m = /^apps\/([^/]+)\//.exec(relPath);
  if (!m) return true;
  return platforms.includes(m[1]);
}

/** Tên file đích: bỏ đuôi `.tmpl`, `gitignore` → `.gitignore`. */
export function targetPath(relPath) {
  let out = relPath.endsWith('.tmpl') ? relPath.slice(0, -'.tmpl'.length) : relPath;
  out = out.replace(/(^|\/)gitignore$/, '$1.gitignore');
  out = out.replace(/(^|\/)npmrc$/, '$1.npmrc');
  out = out.replace(/(^|\/)env\.example$/, '$1.env.example');
  out = out.replace(/(^|\/)claude\//, '$1.claude/');
  return out;
}

/** Bảng giá trị thay vào template. */
export function variables(options) {
  const name = validateName(options.name);
  const platforms = normalizePlatforms(options.platforms);
  const kitSpec = options.kitSpec ?? DEFAULT_KIT_SPEC;
  return {
    name,
    Name: pascalCase(name),
    title: titleCase(name),
    kitSpec,
    kitVersion: options.kitVersion ?? '0.1.0',
    platforms,
    platformList: platforms.join(', '),
    year: String(options.year ?? new Date().getFullYear()),
  };
}

/** `{{key}}` → giá trị. Khoá lạ để NGUYÊN, không im lặng xoá. */
export function render(content, vars) {
  return content.replace(/\{\{(\w+)\}\}/g, (whole, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : whole,
  );
}

/**
 * Kế hoạch đầy đủ: từ danh sách file template → danh sách file sẽ ghi.
 * `templates` là mảng `{ path, content }` do chỗ gọi đọc từ đĩa.
 */
export function plan(templates, options) {
  const vars = variables(options);
  const files = templates
    .filter((t) => includes(t.path, vars.platforms))
    .map((t) => ({ path: render(targetPath(t.path), vars), content: render(t.content, vars) }))
    .toSorted((a, b) => a.path.localeCompare(b.path));
  return { vars, files };
}
