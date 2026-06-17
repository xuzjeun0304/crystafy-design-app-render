import { config } from '../config.js';
import type { CreatedDesignProduct } from '../types.js';
import type { ParsedDesignPayload } from '../validation.js';
import { createDesignId } from '../utils/ids.js';
import { createDesignProduct } from '../shopify/designProduct.js';
import { sendDesignAnalyticsWebhook } from './designAnalyticsWebhook.js';
import { saveDesignRecord } from './designStore.js';
import { syncDesignToNocoDB } from './nocodbDesignSync.js';

function mockCreatedProduct(payload: ParsedDesignPayload): CreatedDesignProduct {
  const designId = payload.designId || createDesignId();
  const slug = designId.toLowerCase();
  return {
    designId,
    productId: `mock-product-${slug}`,
    productNumericId: `mock-product-${slug}`,
    variantId: `mock-variant-${slug}`,
    variantNumericId: `mock-variant-${slug}`,
    handle: `custom-bracelet-${slug}`,
    previewImageUrl: payload.previewImageUrl,
    warnings: [],
  };
}

export async function createAndStoreDesignProduct(
  payload: ParsedDesignPayload,
): Promise<CreatedDesignProduct> {
  const product = config.dryRunCreateProduct
    ? mockCreatedProduct(payload)
    : await createDesignProduct(payload);

  await saveDesignRecord({
    createdAt: new Date().toISOString(),
    payload,
    product,
  });

  const webhookResult = await sendDesignAnalyticsWebhook(payload, product);
  if (!webhookResult.ok && webhookResult.warning) {
    product.warnings = [...(product.warnings || []), webhookResult.warning];
  }

  const nocodbResult = await syncDesignToNocoDB(payload, product);
  if (!nocodbResult.ok && nocodbResult.warning) {
    product.warnings = [...(product.warnings || []), nocodbResult.warning];
  }

  return product;
}
