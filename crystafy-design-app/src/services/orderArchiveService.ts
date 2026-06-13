import { config } from '../config.js';
import { archiveProduct } from '../shopify/productArchive.js';
import {
  isDesignProductLine,
  productGidFromNumericId,
  type OrderWebhookPayload,
} from './orderLines.js';

export interface OrderArchiveSummary {
  ok: boolean;
  skipped?: boolean;
  orderName?: string;
  designLines: number;
  archived: number;
  warnings: string[];
}

export async function archiveDesignProductsForOrder(
  order: OrderWebhookPayload,
): Promise<OrderArchiveSummary> {
  const warnings: string[] = [];
  if (!config.archiveDesignProductsOnFulfillment) {
    return {
      ok: true,
      skipped: true,
      orderName: order.name,
      designLines: 0,
      archived: 0,
      warnings: ['Design Product archival is disabled by ARCHIVE_DESIGN_PRODUCTS_ON_FULFILLMENT=false.'],
    };
  }

  const designLines = (order.line_items || []).filter(isDesignProductLine);
  const productIds = [
    ...new Set(
      designLines
        .map((line) => productGidFromNumericId(line.product_id))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  let archived = 0;
  for (const productId of productIds) {
    try {
      await archiveProduct(productId);
      archived += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Archive failed for ${productId}: ${message}`);
    }
  }

  return {
    ok: warnings.length === 0,
    orderName: order.name,
    designLines: designLines.length,
    archived,
    warnings,
  };
}
