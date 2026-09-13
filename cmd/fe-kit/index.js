#!/usr/bin/env node
// CLI của kit. Chỉ làm phần dính đĩa; luật nằm ở `plan.js`.
import { createRequire } from 'node:module';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_KIT_SPEC, PLATFORMS, PlanError, plan } from './plan.js';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = join(here, 'templates');

const USAGE = `
fe-kit — dựng dự án frontend trên nền fe-kit

  fe-kit new <ten-du-an> [tuỳ chọn]

Tuỳ chọn
  --platforms <ds>   Nền tảng, ngăn bằng dấu phẩy. Mặc định: web
                     Có: ${PLATFORMS.join(', ')}
  --out <thư-mục>    Nơi ghi. Mặc định: ./<ten-du-an>
  --kit-spec <spec>  Dependency trỏ về kit. Mặc định tag hiện tại của kit.
                     Dùng "workspace:*" khi sinh vào chính repo kit.
  --force            Ghi đè thư mục đã có file.
  --dry-run          In danh sách file sẽ ghi rồi dừng.

Ví dụ
  fe-kit new kho-hang --platforms web,mobile
  fe-kit new kho-hang --dry-run
`;

function parseArgs(argv) {
  const [command, name, ...rest] = argv;
  const opts = { command, name, platforms: 'web', force: false, dryRun: false };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    const next = () => {
      const v = rest[++i];
      if (v === undefined) throw new PlanError(`Thiếu giá trị cho ${arg}.`);
      return v;
    };
    switch (arg) {
      case '--platforms': opts.platforms = next(); break;
      case '--out': opts.out = next(); break;
      case '--kit-spec': opts.kitSpec = next(); break;
      case '--force': opts.force = true; break;
      case '--dry-run': opts.dryRun = true; break;
      case '-h': case '--help': opts.help = true; break;
      default: throw new PlanError(`Tuỳ chọn lạ: ${arg}`);
    }
  }
  return opts;
}

async function readTemplates(root) {
  const out = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.push({ path: relative(root, full).split('\\').join('/'), content: await readFile(full, 'utf8') });
    }
  }
  await walk(root);
  return out.toSorted((a, b) => a.path.localeCompare(b.path));
}

async function isNonEmptyDir(path) {
  try {
    const s = await stat(path);
    if (!s.isDirectory()) return true;
    return (await readdir(path)).length > 0;
  } catch {
    return false;
  }
}

function kitVersion() {
  try {
    const require = createRequire(import.meta.url);
    return require('../../package.json').version;
  } catch {
    return '0.1.0';
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.command || opts.command === 'help') {
    process.stdout.write(USAGE);
    return 0;
  }
  if (opts.command !== 'new') throw new PlanError(`Lệnh lạ: ${opts.command}. Chỉ có "new".`);

  const version = kitVersion();
  const templates = await readTemplates(TEMPLATE_ROOT);
  const { vars, files } = plan(templates, {
    name: opts.name,
    platforms: opts.platforms,
    kitSpec: opts.kitSpec ?? DEFAULT_KIT_SPEC.replace(/#v[\d.]+$/, `#v${version}`),
    kitVersion: version,
  });

  const outDir = resolve(opts.out ?? vars.name);

  if (opts.dryRun) {
    process.stdout.write(`${files.length} file sẽ ghi vào ${outDir}:\n`);
    for (const f of files) process.stdout.write(`  ${f.path}\n`);
    return 0;
  }

  if (!opts.force && (await isNonEmptyDir(outDir))) {
    throw new PlanError(`${outDir} đã có file. Chọn --out khác, hoặc thêm --force để ghi đè.`);
  }

  for (const f of files) {
    const dest = join(outDir, f.path);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, f.content, 'utf8');
  }

  process.stdout.write(
    [
      ``,
      `✓ Đã dựng "${vars.name}" (${vars.platformList}) — ${files.length} file ở ${outDir}`,
      ``,
      `  cd ${relative(process.cwd(), outDir) || '.'}`,
      `  pnpm install`,
      `  cp .env.example .env.local        # điền OIDC_CLIENT_SECRET`,
      `  pnpm dev`,
      ``,
      `Bảng môi trường của DỰ ÁN nằm ở shared/src/env.ts — kit không biết URL nào.`,
      ``,
    ].join('\n'),
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    process.stderr.write(`${e instanceof PlanError ? e.message : (e?.stack ?? String(e))}\n`);
    process.exit(1);
  });
