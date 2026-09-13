import { contextBridge } from 'electron';

// Bề mặt hẹp có chủ đích. Mỗi thứ thêm vào đây là một quyền renderer có thật.
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  version: process.versions.electron,
});
