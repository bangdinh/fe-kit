import { describe, expect, it } from 'vitest';
import { includes, normalizePlatforms, pascalCase, plan, render, targetPath, validateName } from './plan.js';

describe('validateName', () => {
  it('nhận kebab-case', () => expect(validateName('kho-hang')).toBe('kho-hang'));
  it('từ chối tên có hoa, khoảng trắng, ký tự lạ', () => {
    for (const bad of ['KhoHang', 'kho hang', '1kho', 'kho_hang', '']) {
      expect(() => validateName(bad)).toThrow();
    }
  });
});

describe('normalizePlatforms', () => {
  it('trả theo thứ tự chuẩn, bỏ trùng', () => {
    expect(normalizePlatforms('desktop,web,web')).toEqual(['web', 'desktop']);
  });
  it('nền tảng lạ thì nói rõ có những gì', () => {
    expect(() => normalizePlatforms('watch')).toThrow(/web, mobile, desktop/);
  });
});

describe('includes', () => {
  it('apps/<platform> chỉ vào khi được chọn', () => {
    expect(includes('apps/web/package.json.tmpl', ['web'])).toBe(true);
    expect(includes('apps/mobile/package.json.tmpl', ['web'])).toBe(false);
  });
  it('file ngoài apps/ luôn vào', () => {
    expect(includes('shared/src/env.ts.tmpl', ['mobile'])).toBe(true);
  });
});

describe('targetPath', () => {
  it('bỏ .tmpl và trả lại tên file ẩn', () => {
    expect(targetPath('package.json.tmpl')).toBe('package.json');
    expect(targetPath('gitignore')).toBe('.gitignore');
    expect(targetPath('apps/web/gitignore')).toBe('apps/web/.gitignore');
    expect(targetPath('env.example.tmpl')).toBe('.env.example');
    expect(targetPath('claude/skills/git-flow/SKILL.md')).toBe('.claude/skills/git-flow/SKILL.md');
  });
});

describe('render', () => {
  it('thay khoá đã biết', () => {
    expect(render('xin chào {{name}} ({{Name}})', { name: 'kho-hang', Name: 'KhoHang' })).toBe(
      'xin chào kho-hang (KhoHang)',
    );
  });
  it('khoá lạ để NGUYÊN — im lặng xoá là cách hỏng khó tìm nhất', () => {
    expect(render('{{khongCo}}', { name: 'x' })).toBe('{{khongCo}}');
  });
});

describe('pascalCase', () => {
  it('kebab → Pascal', () => expect(pascalCase('kho-hang-v2')).toBe('KhoHangV2'));
});

describe('plan', () => {
  const templates = [
    { path: 'package.json.tmpl', content: '{"name":"{{name}}","kit":"{{kitSpec}}"}' },
    { path: 'apps/web/x.ts.tmpl', content: '// {{title}}' },
    { path: 'apps/mobile/x.ts.tmpl', content: '// mobile' },
  ];

  it('lọc theo nền tảng và thay biến', () => {
    const out = plan(templates, { name: 'kho-hang', platforms: 'web', kitSpec: 'workspace:*' });
    expect(out.files.map((f) => f.path)).toEqual(['apps/web/x.ts', 'package.json']);
    expect(out.files[1].content).toContain('"kit":"workspace:*"');
  });

  it('chọn nhiều nền tảng thì lấy đủ', () => {
    const out = plan(templates, { name: 'a', platforms: ['web', 'mobile'] });
    expect(out.files).toHaveLength(3);
  });
});
