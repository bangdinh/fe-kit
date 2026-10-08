import { describe, expect, it } from 'vitest';
import { entryFromCommits, promote, unreleasedBody } from './release-notes.js';

const changelog = (unreleased) => `# Changelog

Định dạng theo Keep a Changelog.

## [Unreleased]
${unreleased}
## [0.1.0] — 2026-09-13

Bản đầu.
`;

describe('unreleasedBody', () => {
  it('lấy phần giữa [Unreleased] và mục version kế tiếp', () => {
    expect(unreleasedBody(changelog('\n### Sửa\n\n- a\n\n'))).toBe('### Sửa\n\n- a');
  });

  it('mục [Unreleased] rỗng thì trả chuỗi rỗng', () => {
    expect(unreleasedBody(changelog('\n'))).toBe('');
  });

  it('không có [Unreleased] thì trả null', () => {
    expect(unreleasedBody('# Changelog\n\n## [0.1.0] — x\n')).toBeNull();
  });
});

describe('promote', () => {
  it('đưa nội dung [Unreleased] thành mục version, để lại [Unreleased] rỗng ở trên', () => {
    const entry = '## [0.2.0] — 2026-10-09\n\n### Sửa\n\n- a';
    const out = promote(changelog('\n### Sửa\n\n- a\n\n'), entry);
    expect(out).toContain('## [Unreleased]\n\n## [0.2.0] — 2026-10-09\n\n### Sửa\n\n- a\n\n## [0.1.0]');
    expect(out.match(/- a/g)).toHaveLength(1);
  });
});

describe('entryFromCommits', () => {
  it('gom conventional commit theo nhóm, bỏ commit release', () => {
    const entry = entryFromCommits('v0.2.1', '2026-10-09', [
      'fix(http): sửa A',
      'feat(config): thêm B',
      'refactor(auth)!: đổi C',
      'docs: viết D',
      'chore(release): v0.2.0',
      'không theo quy ước',
    ]);
    expect(entry).toBe([
      '## [0.2.1] — 2026-10-09',
      '',
      '### Phá vỡ',
      '',
      '- đổi C',
      '',
      '### Thêm',
      '',
      '- thêm B',
      '',
      '### Sửa',
      '',
      '- sửa A',
      '',
      '### Khác',
      '',
      '- viết D',
      '- không theo quy ước',
    ].join('\n'));
  });

  it('không có commit nào thì trả null — không có gì để release', () => {
    expect(entryFromCommits('v0.2.1', '2026-10-09', ['chore(release): v0.2.0'])).toBeNull();
  });
});
