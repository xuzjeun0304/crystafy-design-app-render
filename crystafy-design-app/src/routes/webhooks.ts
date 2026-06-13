import { Router } from 'express';
import { requireWebhookHmac } from '../security/shopifyWebhook.js';

export const webhooksRouter = Router();

webhooksRouter.post('/orders-create', requireWebhookHmac, async (req, res) => {
  // Next phase:
  // 1. Read created order.
  // 2. Find Design Product line items.
  // 3. Decrement source bead inventory.
  // 4. Mark Design Product for later archival.
  console.log('[orders/create]', {
    id: req.body?.id,
    name: req.body?.name,
    lineItems: req.body?.line_items?.length,
  });

  res.status(200).json({ ok: true });
});
