import crypto from 'node:crypto';

export function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function hmacSha256Hex(secret: string, message: string): string {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

export function hmacSha256Base64(secret: string, message: Buffer | string): string {
  return crypto.createHmac('sha256', secret).update(message).digest('base64');
}
