import { Router } from 'express';
import type { StoredDesign } from '../services/designStore.js';
import { listDesignRecords } from '../services/designStore.js';

export const localDashboardRouter = Router();

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(value: unknown, currency = 'USD'): string {
  const amount = Number(value || 0);
  return `${currency} ${amount.toFixed(2)}`;
}

function previewSrc(record: StoredDesign): string {
  return (
    record.payload.previewImageDataUrl ||
    record.payload.previewImageUrl ||
    record.product.previewImageUrl ||
    ''
  );
}

function beadRows(record: StoredDesign): string {
  return record.payload.beads
    .map((bead, index) => {
      const subtotal = Number(bead.quantity || 0) * Number(bead.unitPrice || 0);
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(bead.titleCn || '-')}</td>
          <td>${escapeHtml(bead.title)}</td>
          <td>${escapeHtml(bead.sku)}</td>
          <td>${escapeHtml(bead.sizeMm ? `${bead.sizeMm} mm` : '-')}</td>
          <td>${escapeHtml(bead.quantity)}</td>
          <td>${money(bead.unitPrice, record.payload.currency)}</td>
          <td>${money(subtotal, record.payload.currency)}</td>
        </tr>
      `;
    })
    .join('');
}

function recordCard(record: StoredDesign): string {
  const src = previewSrc(record);
  const beadCount = record.payload.beads.reduce((sum, bead) => sum + bead.quantity, 0);
  return `
    <article class="card">
      <div class="preview-wrap">
        ${
          src
            ? `<img class="preview" src="${escapeHtml(src)}" alt="${escapeHtml(record.payload.designName)}">`
            : '<div class="missing">No Preview Image</div>'
        }
      </div>
      <div class="summary">
        <h2>${escapeHtml(record.payload.designName)}</h2>
        <p><strong>Design ID:</strong> ${escapeHtml(record.product.designId)}</p>
        <p><strong>Mock Product:</strong> ${escapeHtml(record.product.productId)}</p>
        <p><strong>Created:</strong> ${escapeHtml(record.createdAt)}</p>
        <p><strong>Wrist:</strong> ${escapeHtml(record.payload.wristSizeCm)} cm</p>
        <p><strong>Items:</strong> ${beadCount}</p>
        <p><strong>Total:</strong> ${money(record.payload.totalPrice, record.payload.currency)}</p>
      </div>
      <section class="fulfillment">
        <h3>Mock Order / Internal Fulfillment View</h3>
        <p class="hint">This is the local preview of what the team should be able to read after Shopify integration.</p>
        <p><strong>Sequence:</strong> <span class="mono">${escapeHtml(record.payload.sequenceCode)}</span></p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Chinese Name</th>
              <th>English Name</th>
              <th>SKU</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>${beadRows(record)}</tbody>
        </table>
      </section>
    </article>
  `;
}

function page(records: StoredDesign[]): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Crystafy Local Design Products</title>
  <style>
    :root {
      color: #2f2b31;
      background: #f7f3f1;
      font-family: Arial, Helvetica, sans-serif;
    }
    body {
      margin: 0;
      padding: 28px;
    }
    .shell {
      max-width: 1120px;
      margin: 0 auto;
    }
    .topbar {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-end;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
    }
    .muted,
    .hint {
      color: #827780;
    }
    .button {
      display: inline-block;
      padding: 10px 14px;
      border-radius: 999px;
      color: #fff;
      background: #2f2b31;
      text-decoration: none;
      font-weight: 700;
    }
    .card {
      display: grid;
      grid-template-columns: minmax(240px, 360px) 1fr;
      gap: 22px;
      margin: 0 0 24px;
      padding: 20px;
      background: #fff;
      border: 1px solid #eadfdd;
      border-radius: 14px;
      box-shadow: 0 14px 34px rgba(47, 43, 49, 0.06);
    }
    .preview-wrap {
      min-height: 260px;
      display: grid;
      place-items: center;
      background: #fbfaf8;
      border-radius: 12px;
      overflow: hidden;
    }
    .preview {
      display: block;
      width: 100%;
      height: auto;
      object-fit: contain;
    }
    .missing {
      color: #9b9298;
      font-weight: 700;
    }
    .summary h2 {
      margin: 0 0 12px;
      font-size: 22px;
    }
    .summary p {
      margin: 7px 0;
    }
    .fulfillment {
      grid-column: 1 / -1;
      padding-top: 16px;
      border-top: 1px solid #efe8e6;
    }
    .fulfillment h3 {
      margin: 0 0 6px;
    }
    .mono {
      font-family: Consolas, Monaco, monospace;
      overflow-wrap: anywhere;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 14px;
    }
    th,
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #eee5e2;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: #7b5c72;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    @media (max-width: 760px) {
      body {
        padding: 14px;
      }
      .topbar,
      .card {
        display: block;
      }
      .preview-wrap {
        margin-bottom: 16px;
      }
      table {
        display: block;
        overflow-x: auto;
        white-space: nowrap;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <div class="topbar">
      <div>
        <h1>Crystafy Local Design Products</h1>
        <div class="muted">${records.length} local records. Newest first.</div>
      </div>
      <a class="button" href="/api/designs/local-records">View Raw JSON</a>
    </div>
    ${records.length ? records.map(recordCard).join('') : '<p>No local design records yet.</p>'}
  </main>
</body>
</html>`;
}

localDashboardRouter.get('/designs', async (_req, res) => {
  const records = await listDesignRecords();
  res.type('html').send(page(records));
});
