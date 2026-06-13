import { config } from '../config.js';
import type { CreatedDesignProduct } from '../types.js';
import type { ParsedDesignPayload } from '../validation.js';
import { createDesignId } from '../utils/ids.js';
import { createDesignProduct } from '../shopify/designProduct.js';
import { saveDesignRecord } from './designStore.js';

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

  return product;
}
