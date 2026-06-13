import { Router } from 'express';
import { ZodError } from 'zod';
import { requireAppProxy } from '../security/shopifyProxy.js';
import { designPayloadSchema } from '../validation.js';
import { verifyDesignTotal } from '../utils/money.js';
import { createAndStoreDesignProduct } from '../services/designProductService.js';
import { listDesignRecords } from '../services/designStore.js';

export const designsRouter = Router();

designsRouter.post('/create-product', requireAppProxy, async (req, res) => {
  try {
    const payload = designPayloadSchema.parse(req.body);

    if (!verifyDesignTotal(payload.totalPrice, payload.beads)) {
      res.status(400).json({
        error: 'Design total does not match bead prices',
      });
      return;
    }

    const product = await createAndStoreDesignProduct(payload);
    res.json({
      ok: true,
      product,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid design payload', details: error.flatten() });
      return;
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

designsRouter.get('/local-records', async (_req, res) => {
  const records = await listDesignRecords();
  res.json({ ok: true, count: records.length, records });
});
