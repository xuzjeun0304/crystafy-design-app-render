import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { hmacSha256Base64, timingSafeEqual } from './hmac.js';

export function requireWebhookHmac(req: Request, res: Response, next: NextFunction): void {
  const hmac = String(req.header('x-shopify-hmac-sha256') || '');
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  const secret = config.apiSecret || config.shopifyClientSecret;

  if (!secret || !hmac || !raw) {
    res.status(401).json({ error: 'Missing Shopify webhook signature' });
    return;
  }

  const digest = hmacSha256Base64(secret, raw);
  if (!timingSafeEqual(digest, hmac)) {
    res.status(401).json({ error: 'Invalid Shopify webhook signature' });
    return;
  }

  next();
}
