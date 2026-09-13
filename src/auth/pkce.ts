// PKCE + random — thuần, không I/O. Dùng Web Crypto (Node ≥20 / Edge / RN).
//
// Lấy `crypto` qua `globalThis` với kiểu khai theo hình dạng, không dùng kiểu
// `Crypto` của lib DOM: kit chạy cả trên React Native, nơi tsconfig thường
// không nạp `lib: ["DOM"]`.

interface CryptoLike {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
  subtle: { digest(algorithm: string, data: ArrayBufferView): Promise<ArrayBuffer> };
}

function webCrypto(): CryptoLike {
  const c = (globalThis as { crypto?: CryptoLike }).crypto;
  if (!c?.subtle) {
    // Hay gặp nhất: React Native chưa cài polyfill Web Crypto. Nói thẳng ra
    // thay vì để nó nổ thành "undefined is not an object".
    throw new Error(
      'Runtime không có Web Crypto (crypto.subtle). PKCE cần nó — trên React Native hãy cài polyfill (vd expo-crypto / react-native-get-random-values).',
    );
  }
  return c;
}

function base64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Chuỗi ngẫu nhiên base64url — dùng cho `state` / `nonce`. */
export function randomString(bytes = 32): string {
  return base64url(webCrypto().getRandomValues(new Uint8Array(bytes)));
}

export interface Pkce {
  verifier: string;
  challenge: string;
  method: 'S256';
}

/** Cặp PKCE `code_verifier` / `code_challenge` (S256). */
export async function generatePkce(): Promise<Pkce> {
  const verifier = randomString(32);
  const digest = await webCrypto().subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64url(new Uint8Array(digest)), method: 'S256' };
}
