export { can, canOn, emptyAccessProfile, inScope, isLicenseBlocked, MAX_RESOURCE_DEPTH } from './engine';
export type { ResourceIndex } from './engine';
export { buildAccessProfile } from './profile';
export type { BuildAccessProfileOptions } from './profile';
export { EMPTY_RESOURCE_INDEX, indexFromTree } from './tree';
export type { TreeReader } from './tree';
export type {
  AccessProfile,
  RoleBinding,
  RoleRef,
  WireAccessData,
  WireAssignment,
  WireContract,
  WireMembership,
  WirePermission,
  WireResourceRef,
  WireRole,
} from './types';
