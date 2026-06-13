import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { hmacSha256Hex, timingSafeEqual } from './hmac.js';

function appProxyMessage(query: Request['query']): string {
  return Object.entries(query)
    .filter(([key]) => key !== 'signature')
    .flatMap(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return values.map((item) => `${key}=${String(item ?? '')}`);
    })
    .sort()
    .join('');
}

export function verifyAppProxyRequest(req: Request): boolean {
  const signature = String(req.query.signature || '');
  const secret = config.apiSecret || config.shopifyClientSecret;
  if (!signature || !secret) return false;
  const digest = hmacSha256Hex(secret, appProxyMessage(req.query));
  return timingSafeEqual(digest, signature);
}

export function requireAppProxy(req: Request, res: Response, next: NextFunction): void {
  if (config.allowUnverifiedLocalRequests && config.nodeEnv !== 'production') {
    next();
    return;
  }

  if (!verifyAppProxyRequest(req)) {
    res.status(401).json({ error: 'Invalid Shopify App Proxy signature' });
    return;
  }

  next();
}
