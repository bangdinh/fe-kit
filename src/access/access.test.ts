import { describe, expect, it, vi } from 'vitest';
import { can, canOn, emptyAccessProfile, inScope } from './engine';
import { buildAccessProfile } from './profile';
import { indexFromTree } from './tree';
import type { WireAccessData } from './types';

const silent = { onWarn: () => {} };

const data: WireAccessData = {
  membership: { status: 'active' },
  contract: { status: 'active' },
  assignments: [
    {
      role: { id: 'viewer', rank: 10 },
      scope_all_resources: false,
      permissions: [{ action: 'device.read', status: 'granted' }],
      resources: [{ resource_id: 'group-1' }],
    },
    {
      role: { id: 'admin', rank: 50 },
      scope_all_resources: false,
      permissions: [
        { action: 'device.write', status: 'granted' },
        { action: 'ai.analytics', status: 'requires_upgrade' },
      ],
      resources: [{ resource_id: 'group-2' }],
    },
  ],
};

const tree = [
  {
    id: 'company',
    children: [
      { id: 'group-1', children: [{ id: 'device-a', children: [] }] },
      { id: 'group-2', children: [{ id: 'device-b', children: [] }] },
    ],
  },
];
const idx = indexFromTree(tree, { idOf: (n) => n.id, childrenOf: (n) => n.children });

describe('buildAccessProfile', () => {
  it('tách quyền theo từng vai trò, không gộp', () => {
    const p = buildAccessProfile(data, 'tenant-1', silent);
    expect(p.bindings).toHaveLength(2);
    expect([...p.bindings[0]!.actions]).toEqual(['device.read']);
    expect([...p.bindings[1]!.actions]).toEqual(['device.write']);
  });

  it('maxRank tính từ binding đang active, không lấy membership.max_rank', () => {
    const p = buildAccessProfile(
      { ...data, membership: { status: 'suspended', max_rank: 100 } },
      'tenant-1',
      silent,
    );
    expect(p.maxRank).toBe(0);
  });

  it('status khác granted vào licenseBlocked', () => {
    const p = buildAccessProfile(data, 'tenant-1', silent);
    expect(p.licenseBlocked.has('ai.analytics')).toBe(true);
  });

  it('action mà vai trò khác cấp được thì KHÔNG hiện nhắc nâng gói', () => {
    const both: WireAccessData = {
      membership: { status: 'active' },
      contract: { status: 'active' },
      assignments: [
        { role: { id: 'a', rank: 1 }, scope_all_resources: true, permissions: [{ action: 'x', status: 'granted' }] },
        { role: { id: 'b', rank: 1 }, scope_all_resources: true, permissions: [{ action: 'x', status: 'requires_upgrade' }] },
      ],
    };
    expect(buildAccessProfile(both, 't', silent).licenseBlocked.size).toBe(0);
  });

  it('permissions null (Owner) không làm nổ — cảnh báo rồi coi là rỗng', () => {
    const warn = vi.fn();
    const p = buildAccessProfile(
      {
        membership: { status: 'active' },
        contract: { status: 'active' },
        assignments: [{ role: { id: 'owner', rank: 100 }, scope_all_resources: true, permissions: null, resources: null }],
      },
      't',
      { onWarn: warn },
    );
    expect(p.bindings[0]!.scopeAll).toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  it('thiếu contract thì coi là còn hiệu lực, và nói rõ', () => {
    const warn = vi.fn();
    const p = buildAccessProfile({ membership: { status: 'active' }, assignments: [] }, 't', { onWarn: warn });
    expect(p.contractActive).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('contract'));
  });

  it('action lạ vẫn nhận nhưng có cảnh báo', () => {
    const warn = vi.fn();
    buildAccessProfile(data, 't', { knownActions: ['device.read'], onWarn: warn });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('device.write'));
  });
});

describe('chấm quyền', () => {
  const p = buildAccessProfile(data, 'tenant-1', silent);

  it('can() không phụ thuộc resource', () => {
    expect(can(p, 'device.write')).toBe(true);
    expect(can(p, 'device.delete')).toBe(false);
  });

  it('∧ nằm TRONG ∃ — không leo thang quyền giữa hai vai trò', () => {
    // viewer: read trên group-1. admin: write trên group-2.
    // Gộp sai sẽ cho write trên group-1.
    expect(canOn(p, 'device.write', 'group-2', idx)).toBe(true);
    expect(canOn(p, 'device.write', 'group-1', idx)).toBe(false);
    expect(canOn(p, 'device.read', 'group-1', idx)).toBe(true);
    expect(canOn(p, 'device.read', 'group-2', idx)).toBe(false);
  });

  it('grant ở node cha kế thừa xuống con', () => {
    expect(canOn(p, 'device.read', 'device-a', idx)).toBe(true);
    expect(canOn(p, 'device.read', 'device-b', idx)).toBe(false);
  });

  it('hợp đồng hết hiệu lực thì chặn tất, kể cả quyền đã cấp', () => {
    const dead = buildAccessProfile({ ...data, contract: { status: 'expired' } }, 't', silent);
    expect(can(dead, 'device.read')).toBe(false);
    expect(canOn(dead, 'device.read', 'group-1', idx)).toBe(false);
  });

  it('membership bị đình chỉ thì mọi vai trò tắt cùng lúc', () => {
    const susp = buildAccessProfile({ ...data, membership: { status: 'suspended' } }, 't', silent);
    expect(can(susp, 'device.read')).toBe(false);
  });

  it('hồ sơ rỗng từ chối mọi thứ', () => {
    expect(can(emptyAccessProfile(), 'bất kỳ')).toBe(false);
  });

  it('scopeAll bỏ qua cây', () => {
    const owner = buildAccessProfile(
      {
        membership: { status: 'active' },
        contract: { status: 'active' },
        assignments: [{ role: { id: 'o', rank: 100 }, scope_all_resources: true, permissions: [{ action: 'x', status: 'granted' }] }],
      },
      't',
      silent,
    );
    expect(canOn(owner, 'x', 'id-chưa-từng-thấy', idx)).toBe(true);
    expect(inScope(owner.bindings[0]!, idx, 'gì cũng được')).toBe(true);
  });
});

describe('indexFromTree', () => {
  it('cây có cạnh vòng KHÔNG làm tràn stack', () => {
    type N = { id: string; children: N[] };
    const a: N = { id: 'a', children: [] };
    const b: N = { id: 'b', children: [a] };
    a.children.push(b);
    const i = indexFromTree([a], { idOf: (n) => n.id, childrenOf: (n) => n.children });
    expect(i.parentOf.get('a')).toBe(null);
    expect(i.parentOf.get('b')).toBe('a');
  });
});
