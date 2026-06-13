import { Router } from 'express';
import { requireWebhookHmac } from '../security/shopifyWebhook.js';
import { archiveDesignProductsForOrder } from '../services/orderArchiveService.js';
import { deductOrderBeadInventory } from '../services/orderInventoryService.js';

export const webhooksRouter = Router();

webhooksRouter.post('/orders-create', requireWebhookHmac, async (req, res) => {
  try {
    const result = await deductOrderBeadInventory(req.body);
    console.log('[orders/create]', {
      id: req.body?.id,
      name: req.body?.name,
      lineItems: req.body?.line_items?.length,
      designLines: result.designLines,
      adjusted: result.adjusted,
      warnings: result.warnings,
    });
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[orders/create] inventory deduction failed', message);
    res.status(500).json({ ok: false, error: message });
  }
});

webhooksRouter.post('/orders-fulfilled', requireWebhookHmac, async (req, res) => {
  try {
    const result = await archiveDesignProductsForOrder(req.body);
    console.log('[orders/fulfilled]', {
      id: req.body?.id,
      name: req.body?.name,
      lineItems: req.body?.line_items?.length,
      designLines: result.designLines,
      archived: result.archived,
      warnings: result.warnings,
    });
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[orders/fulfilled] design product archival failed', message);
    res.status(500).json({ ok: false, error: message });
  }
});
