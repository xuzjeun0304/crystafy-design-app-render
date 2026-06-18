import { config } from '../config.js';
import type { CreatedDesignProduct } from '../types.js';
import type { ParsedDesignPayload } from '../validation.js';

export interface AnalyticsWebhookResult {
  ok: boolean;
  skipped?: boolean;
  warning?: string;
}

export async function sendDesignAnalyticsWebhook(
  payload: ParsedDesignPayload,
  product: CreatedDesignProduct,
): Promise<AnalyticsWebhookResult> {
  if (!config.analyticsWebhookUrl) {
    return { ok: true, skipped: true };
  }

  const body = {
    event: 'design_product_created',
    createdAt: new Date().toISOString(),
    design: {
      designId: product.designId,
      designName: payload.designName,
      source: payload.source,
      wristSizeCm: payload.wristSizeCm,
      totalPrice: payload.totalPrice,
      currency: payload.currency,
      beadCount: payload.beads.reduce((sum, bead) => sum + bead.quantity, 0),
      sequenceCode: payload.sequenceCode,
      logoPalette: payload.logoPalette || [],
      previewImageUrl: product.previewImageUrl || payload.previewImageUrl || '',
      productId: product.productId,
      productNumericId: product.productNumericId || '',
      variantId: product.variantId,
      variantNumericId: product.variantNumericId || '',
      handle: product.handle || '',
    },
    beads: payload.beads.map((bead) => ({
      sku: bead.sku,
      title: bead.title,
      titleCn: bead.titleCn || '',
      sizeMm: bead.sizeMm || null,
      quantity: bead.quantity,
      unitPrice: bead.unitPrice,
      imageUrl: bead.imageUrl || '',
      shape: bead.shape || '',
    })),
  };

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (config.analyticsWebhookToken) {
    headers.authorization = `Bearer ${config.analyticsWebhookToken}`;
  }

  try {
    const response = await fetch(config.analyticsWebhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        ok: false,
        warning: `Analytics webhook failed with HTTP ${response.status}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      warning: `Analytics webhook failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
