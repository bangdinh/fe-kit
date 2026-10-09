#!/usr/bin/env node
// Mục CHANGELOG cho một release — cùng vai với phần python trong scripts/release.sh của gokit.
//
//   node scripts/release-notes.js v0.2.0          in mục sẽ ghi (DRY)
//   node scripts/release-notes.js v0.2.0 --write  ghi vào CHANGELOG.md, in mục ra stdout
//
// KHÁC gokit ở một điểm, có chủ ý: CHANGELOG của kit viết TAY trong [Unreleased], vì mục
// "Phá vỡ" phải ghi CÁCH SỬA cho dự án tiêu thụ (docs/versioning.md) — thứ commit message
// không chứa. Nên:
//   • [Unreleased] có nội dung → dùng nguyên văn, đổi tiêu đề thành [X.Y.Z] — ngày;
//   • [Unreleased] rỗng        → sinh từ conventional commit kể từ tag trước, như gokit.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const UNRELEASED = /^## \[Unreleased\][^\n]*\n/m;
const NEXT_SECTION = /^## \[/m;

/** Nội dung mục [Unreleased] (đã trim), `''` nếu rỗng, `null` nếu không có mục. */
export function unreleasedBody(changelog) {
  const m = UNRELEASED.exec(changelog);
  if (!m) return null;
  const rest = changelog.slice(m.index + m[0].length);
  const next = NEXT_SECTION.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

/** CHANGELOG mới: [Unreleased] rỗng, ngay dưới là `entry`. */
export function promote(changelog, entry) {
  const m = UNRELEASED.exec(changelog);
  if (!m) throw new Error('CHANGELOG.md không có mục "## [Unreleased]"');
  const head = changelog.slice(0, m.index + m[0].length);
  const rest = changelog.slice(m.index + m[0].length);
  const next = NEXT_SECTION.exec(rest);
  const tail = next ? rest.slice(next.index) : '';
  return `${head}\n${entry.trimEnd()}\n\n${tail}`.trimEnd() + '\n';
}

const GROUPS = ['Phá vỡ', 'Thêm', 'Sửa', 'Khác'];

/** Mục sinh từ conventional commit; `null` nếu không có commit nào ngoài release. */
export function entryFromCommits(version, date, subjects) {
  const groups = Object.fromEntries(GROUPS.map((g) => [g, []]));
  for (const raw of subjects) {
    const s = raw.trim().replace(/^\[[A-Z][A-Z0-9]+-\d+\]\s*/, '');
    if (!s || s.startsWith('chore(release)')) continue;
    const m = /^(\w+)(\([^)]*\))?(!)?:\s*(.*)$/.exec(s);
    if (!m) {
      groups['Khác'].push(`- ${s}`);
      continue;
    }
    const [, type, , bang, desc] = m;
    const line = `- ${desc}`;
    if (bang) groups['Phá vỡ'].push(line);
    else if (type === 'fix') groups['Sửa'].push(line);
    else if (['docs', 'chore', 'test', 'ci', 'style', 'build'].includes(type)) groups['Khác'].push(line);
    else groups['Thêm'].push(line); // feat, refactor, perf
  }
  if (GROUPS.every((g) => groups[g].length === 0)) return null;
  const out = [`## [${version.replace(/^v/, '')}] — ${date}`];
  for (const g of GROUPS) {
    if (groups[g].length) out.push('', `### ${g}`, '', ...groups[g]);
  }
  return out.join('\n');
}

function localDate() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function commitsSincePreviousTag(root) {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  let range = 'HEAD';
  try {
    range = `${git('describe', '--tags', '--abbrev=0')}..HEAD`;
  } catch {
    // chưa có tag nào: lấy toàn bộ lịch sử
  }
  return git('log', '--no-merges', '--pretty=%s', range).split('\n').filter(Boolean);
}

function main() {
  const [version, flag] = process.argv.slice(2);
  if (!/^v\d+\.\d+\.\d+$/.test(version ?? '')) {
    console.error('Dùng: node scripts/release-notes.js vX.Y.Z [--write]');
    process.exit(1);
  }
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const file = join(root, 'CHANGELOG.md');
  const changelog = readFileSync(file, 'utf8');
  const body = unreleasedBody(changelog);
  if (body === null) {
    console.error('✗ CHANGELOG.md không có mục "## [Unreleased]".');
    process.exit(1);
  }
  const date = localDate();
  const entry = body
    ? `## [${version.replace(/^v/, '')}] — ${date}\n\n${body}`
    : entryFromCommits(version, date, commitsSincePreviousTag(root));
  if (!entry) {
    console.error('✗ [Unreleased] rỗng và không có commit nào kể từ tag trước — không có gì để release.');
    process.exit(1);
  }
  if (flag === '--write') writeFileSync(file, promote(changelog, entry));
  process.stdout.write(`${entry}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
