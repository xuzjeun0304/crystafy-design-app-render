import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { designsRouter } from './routes/designs.js';
import { localDashboardRouter } from './routes/localDashboard.js';
import { webhooksRouter } from './routes/webhooks.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(
  express.json({
    limit: '20mb',
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    },
  }),
);

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'crystafy-design-app',
    mode: config.nodeEnv,
    dryRunCreateProduct: config.dryRunCreateProduct,
  });
});

app.use('/api/designs', designsRouter);
app.use('/local', localDashboardRouter);
app.use('/webhooks', webhooksRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(config.port, () => {
  console.log(`Crystafy Design App listening on http://127.0.0.1:${config.port}`);
});
