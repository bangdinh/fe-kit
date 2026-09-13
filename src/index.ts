// Barrel gốc — CHỈ những thứ chạy được trên MỌI nền tảng (Next server và
// client, React Native, Electron).
//
// Hai subpath cố ý KHÔNG có ở đây:
//   fe-kit/server  cần `next/server` — chỉ chạy phía server của Next;
//   fe-kit/ui      cần React DOM + antd — không chạy trên React Native.
//
// Nhập chúng bằng đường riêng. Ranh giới này được kiểm bằng `make check-layers`.
export * from './types/index';
export * from './config/index';
export * from './logger/index';
export * from './http/index';
export * from './access/index';
export * from './auth/index';
