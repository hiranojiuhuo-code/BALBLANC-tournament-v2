// PASS_HASH は「運営パスコード」のSHA-256。平文はここには入れない。（参照実装と同一）
export const PASS_HASH = '3386172f9f5f3a8b5a79c6e0a2892d26845d91ed0d4d006bc5f66fe78bbcc752';

export async function sha256hex(s: string): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
