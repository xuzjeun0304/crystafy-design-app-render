import { Router } from 'express';
import { config } from '../config.js';
import { installOrdersCreateWebhook } from '../shopify/webhookSubscriptions.js';

export const adminRouter = Router();

function requireSetupToken(token?: string): void {
  if (!config.setupToken) {
    throw new Error('CRYSTAFY_SETUP_TOKEN is not configured.');
  }
  if (!token || token !== config.setupToken) {
    throw new Error('Invalid setup token.');
  }
}

adminRouter.all('/install-webhooks', async (req, res) => {
  try {
    requireSetupToken(String(req.query.token || req.header('x-crystafy-setup-token') || ''));
    if (!config.appBaseUrl) throw new Error('APP_BASE_URL is not configured.');

    const baseUrl = config.appBaseUrl.replace(/\/+$/, '');
    const result = await installOrdersCreateWebhook(`${baseUrl}/webhooks/orders-create`);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ ok: false, error: message });
  }
});
