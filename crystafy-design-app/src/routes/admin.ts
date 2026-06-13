import { Router } from 'express';
import { config } from '../config.js';
import { installCoreWebhooks } from '../shopify/webhookSubscriptions.js';
import {
  designsToCsv,
  listDesignAnalytics,
  type DesignAnalyticsRecord,
} from '../services/designAnalyticsService.js';

export const adminRouter = Router();

function requireSetupToken(token?: string): void {
  if (!config.setupToken) {
    throw new Error('CRYSTAFY_SETUP_TOKEN is not configured.');
  }
  if (!token || token !== config.setupToken) {
    throw new Error('Invalid setup token.');
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function reportHtml(records: DesignAnalyticsRecord[], token: string, limit: number): string {
  const active = records.filter((record) => record.productStatus === 'ACTIVE').length;
  const archived = records.filter((record) => record.productStatus === 'ARCHIVED').length;
  const totalRevenue = records.reduce((sum, record) => {
    return sum + (typeof record.totalPrice === 'number' ? record.totalPrice : 0);
  }, 0);
  const csvUrl = `/api/admin/designs/export.csv?token=${encodeURIComponent(token)}&limit=${limit}`;

  const cards = records
    .map((record) => {
      const statusClass = record.productStatus.toLowerCase();
      return `
        <article class="design-card">
          <a class="preview" href="${escapeHtml(record.productUrl)}" target="_blank" rel="noreferrer">
            ${
              record.previewImageUrl
                ? `<img src="${escapeHtml(record.previewImageUrl)}" alt="${escapeHtml(record.designName)}">`
                : '<div class="placeholder">No Image</div>'
            }
          </a>
          <div class="content">
            <div class="topline">
              <h2>${escapeHtml(record.designName)}</h2>
              <span class="status ${statusClass}">${escapeHtml(record.productStatus)}</span>
            </div>
            <p class="meta"><strong>Design ID:</strong> ${escapeHtml(record.designId)}</p>
            <p class="meta"><strong>Created:</strong> ${escapeHtml(formatDate(record.createdAt))}</p>
            <p class="meta"><strong>Wrist:</strong> ${escapeHtml(record.wristSizeCm)} cm · <strong>Items:</strong> ${record.beadCount} · <strong>Total:</strong> ${escapeHtml(record.currency)} ${escapeHtml(record.totalPrice)}</p>
            <p class="meta"><strong>Product:</strong> <a href="${escapeHtml(record.productUrl)}" target="_blank" rel="noreferrer">${escapeHtml(record.productHandle)}</a></p>
            <div class="block">
              <h3>SKU Summary</h3>
              <p>${escapeHtml(record.skuSummary || '-')}</p>
            </div>
            <div class="block">
              <h3>Bead Summary</h3>
              <p>${escapeHtml(record.beadSummary || '-')}</p>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Crystafy Design Dashboard</title>
  <style>
    :root { color-scheme: light; --ink:#2d2930; --muted:#756f78; --line:#ebe4e6; --bg:#faf7f4; --card:#fff; --brand:#8b607c; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Arial, sans-serif; background:var(--bg); color:var(--ink); }
    .wrap { width:min(1120px, calc(100% - 32px)); margin:32px auto; }
    header { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; margin-bottom:20px; }
    h1 { margin:0; font-size:28px; }
    .subtitle { color:var(--muted); margin:8px 0 0; }
    .actions { display:flex; gap:10px; flex-wrap:wrap; }
    .button { display:inline-flex; align-items:center; justify-content:center; min-height:40px; padding:0 16px; border-radius:999px; background:#2d2930; color:#fff; text-decoration:none; font-weight:700; }
    .stats { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:12px; margin-bottom:18px; }
    .stat { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:14px 16px; }
    .stat b { display:block; font-size:22px; margin-bottom:4px; }
    .stat span { color:var(--muted); font-size:13px; }
    .design-card { display:grid; grid-template-columns:220px 1fr; gap:22px; background:var(--card); border:1px solid var(--line); border-radius:16px; padding:16px; margin:14px 0; box-shadow:0 8px 24px rgba(45,41,48,.05); }
    .preview { display:flex; align-items:center; justify-content:center; min-height:220px; background:#fff; border-radius:12px; overflow:hidden; text-decoration:none; }
    .preview img { width:100%; height:100%; max-height:240px; object-fit:contain; }
    .placeholder { color:var(--muted); }
    .topline { display:flex; gap:12px; align-items:center; justify-content:space-between; }
    h2 { margin:0; font-size:20px; }
    .status { border-radius:999px; padding:5px 10px; font-size:12px; font-weight:700; background:#eee; color:#555; }
    .status.active { background:#e2f6e9; color:#267242; }
    .status.archived { background:#f1edf0; color:#6f6370; }
    .meta { margin:7px 0; color:var(--muted); line-height:1.45; }
    a { color:var(--brand); }
    .block { border-top:1px solid var(--line); margin-top:10px; padding-top:10px; }
    .block h3 { margin:0 0 6px; font-size:13px; text-transform:uppercase; letter-spacing:.08em; color:var(--brand); }
    .block p { margin:0; line-height:1.45; }
    @media (max-width: 760px) {
      header { display:block; }
      .actions { margin-top:14px; }
      .stats { grid-template-columns: repeat(2, minmax(0,1fr)); }
      .design-card { grid-template-columns:1fr; }
      .preview { min-height:180px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <header>
      <div>
        <h1>Crystafy Design Dashboard</h1>
        <p class="subtitle">${records.length} recent designs. Shopify Product based records.</p>
      </div>
      <div class="actions">
        <a class="button" href="${escapeHtml(csvUrl)}">Download CSV</a>
      </div>
    </header>
    <section class="stats">
      <div class="stat"><b>${records.length}</b><span>Total Designs</span></div>
      <div class="stat"><b>${active}</b><span>Active Products</span></div>
      <div class="stat"><b>${archived}</b><span>Archived Products</span></div>
      <div class="stat"><b>USD ${totalRevenue.toFixed(2)}</b><span>Listed Design Value</span></div>
    </section>
    ${cards || '<p>No Design Product records found.</p>'}
  </main>
</body>
</html>`;
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

adminRouter.get('/designs/report', async (req, res) => {
  try {
    const token = String(req.query.token || req.header('x-crystafy-setup-token') || '');
    requireSetupToken(token);
    const limit = Number(req.query.limit || 100);
    const records = await listDesignAnalytics(limit);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(reportHtml(records, token, limit));
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
