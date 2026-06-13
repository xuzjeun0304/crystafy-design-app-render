import { Router } from 'express';
import { config } from '../config.js';
import { installCoreWebhooks } from '../shopify/webhookSubscriptions.js';
import { designsToCsv, listDesignAnalytics } from '../services/designAnalyticsService.js';

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

    const result = await installCoreWebhooks(config.appBaseUrl);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ ok: false, error: message });
  }
});

adminRouter.get('/designs', async (req, res) => {
  try {
    requireSetupToken(String(req.query.token || req.header('x-crystafy-setup-token') || ''));
    const limit = Number(req.query.limit || 100);
    const records = await listDesignAnalytics(limit);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      count: records.length,
      records,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ ok: false, error: message });
  }
});

adminRouter.get('/designs/export.csv', async (req, res) => {
  try {
    requireSetupToken(String(req.query.token || req.header('x-crystafy-setup-token') || ''));
    const limit = Number(req.query.limit || 250);
    const records = await listDesignAnalytics(limit);
    const csv = designsToCsv(records);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="crystafy-designs.csv"');
    res.send('\uFEFF' + csv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(400).json({ ok: false, error: message });
  }
});
