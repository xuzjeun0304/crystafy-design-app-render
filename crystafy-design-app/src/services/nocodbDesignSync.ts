import { config } from '../config.js';
import type { CreatedDesignProduct, DesignBead } from '../types.js';
import type { ParsedDesignPayload } from '../validation.js';

export interface NocoDBSyncStatus {
  enabled: boolean;
  configured: boolean;
  missing: string[];
  apiUrl: string;
  tableId: string;
}

export interface NocoDBSyncResult {
  ok: boolean;
  skipped?: boolean;
  warning?: string;
}

function cleanApiUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function beadCount(beads: DesignBead[]): number {
  return beads.reduce((sum, bead) => sum + bead.quantity, 0);
}

function beadLabel(bead: DesignBead): string {
  const name = bead.titleCn?.trim() || bead.title || bead.sku;
  const size = bead.sizeMm ? `${bead.sizeMm}mm` : '';
  return `${name}${size ? `(${size})` : ''} ${bead.sku}`.trim();
}

function beadSummary(beads: DesignBead[]): string {
  return beads.map((bead) => `${beadLabel(bead)} x${bead.quantity}`).join('; ');
}

function skuSummary(beads: DesignBead[]): string {
  return beads.map((bead) => `${bead.sku} x${bead.quantity}`).join('; ');
}

function readableSequence(beads: DesignBead[]): string {
  const items: string[] = [];
  for (const bead of beads) {
    for (let index = 0; index < bead.quantity; index += 1) {
      items.push(`${items.length + 1}.${beadLabel(bead)}`);
    }
  }
  return items.join(' > ');
}

export function getNocoDBSyncStatus(): NocoDBSyncStatus {
  const missing: string[] = [];
  if (!config.nocodbApiUrl) missing.push('NOCODB_API_URL');
  if (!config.nocodbApiToken) missing.push('NOCODB_API_TOKEN');
  if (!config.nocodbDesignsTableId) missing.push('NOCODB_DESIGNS_TABLE_ID');

  return {
    enabled: config.nocodbDesignSyncEnabled,
    configured: missing.length === 0,
    missing,
    apiUrl: config.nocodbApiUrl ? cleanApiUrl(config.nocodbApiUrl) : '',
    tableId: config.nocodbDesignsTableId,
  };
}

export async function syncDesignToNocoDB(
  payload: ParsedDesignPayload,
  product: CreatedDesignProduct,
): Promise<NocoDBSyncResult> {
  const status = getNocoDBSyncStatus();
  if (!status.enabled) return { ok: true, skipped: true };
  if (!status.configured) {
    return {
      ok: false,
      warning: `NocoDB sync skipped, missing env: ${status.missing.join(', ')}`,
    };
  }

  const endpoint = `${status.apiUrl}/api/v2/tables/${encodeURIComponent(status.tableId)}/records`;
  const createdAt = new Date().toISOString();
  const record = {
    'Design ID': product.designId,
    'Design Name': payload.designName,
    'Created At': createdAt,
    Source: payload.source,
    'Wrist Size cm': payload.wristSizeCm,
    'Total Price': payload.totalPrice,
    Currency: payload.currency,
    'Bead Count': beadCount(payload.beads),
    'Preview Image URL': product.previewImageUrl || payload.previewImageUrl || '',
    'Shopify Product ID': product.productId,
    'Shopify Product Numeric ID': product.productNumericId || '',
    'Shopify Variant ID': product.variantId,
    'Shopify Variant Numeric ID': product.variantNumericId || '',
    'Shopify Handle': product.handle || '',
    'SKU Summary': skuSummary(payload.beads),
    'Bead Summary': beadSummary(payload.beads),
    'Chinese Sequence': readableSequence(payload.beads),
    'Sequence Code': payload.sequenceCode,
    'Logo Palette': (payload.logoPalette || []).join('|'),
    'Beads JSON': JSON.stringify(payload.beads),
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'xc-token': config.nocodbApiToken,
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        ok: false,
        warning: `NocoDB sync failed with HTTP ${response.status}${text ? `: ${text.slice(0, 180)}` : ''}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      warning: `NocoDB sync failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
