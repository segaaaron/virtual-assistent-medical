import crypto from "node:crypto";

// Verifica X-Hub-Signature-256 (HMAC-SHA256 con App Secret) sobre el body CRUDO.
// Comparacion en tiempo constante (nunca ==).
export function verifySignature(rawBody: Buffer, signatureHeader: string | undefined, appSecret: string): boolean {
  if (!signatureHeader) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return safeEqual(signatureHeader, expected);
}

// Comparacion de strings en tiempo constante (para secretos: firma, verify_token).
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
