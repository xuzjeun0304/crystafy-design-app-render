import { config } from '../config.js';
import {
  deductInventoryBySku,
  restockInventoryBySku,
  type InventoryAdjustmentRequest,
} from '../shopify/inventory.js';
import { fetchDesignPayloadFromProduct } from '../shopify/productDesignPayload.js';
import {
  isDesignProductLine,
  lineProperty,
  orderGid,
  type OrderLineItem,
  type OrderWebhookPayload,
} from './orderLines.js';

export interface OrderInventoryDeductionSummary {
  ok: boolean;
  skipped?: boolean;
  orderName?: string;
  designLines: number;
  adjusted: number;
  warnings: string[];
}

function parseSkuSummary(value?: string): InventoryAdjustmentRequest[] {
  if (!value) return [];
  return value
    .split(';')
    .map((part) => part.trim())
    .map((part) => {
      const match = part.match(/^(.+?)\s*x\s*(\d+)$/i);
      if (!match) return null;
      return {
        sku: match[1].trim(),
        quantity: Number(match[2]),
      };
    })
    .filter((item): item is InventoryAdjustmentRequest => Boolean(item?.sku && item.quantity > 0));
}

function mergeRequests(requests: InventoryAdjustmentRequest[]): InventoryAdjustmentRequest[] {
  const map = new Map<string, number>();
  for (const request of requests) {
    if (!request.sku || request.quantity <= 0) continue;
    map.set(request.sku, (map.get(request.sku) || 0) + request.quantity);
  }
  return [...map.entries()].map(([sku, quantity]) => ({ sku, quantity }));
}

async function requestsFromDesignLine(line: OrderLineItem): Promise<InventoryAdjustmentRequest[]> {
  const fromProperties = parseSkuSummary(lineProperty(line, '_SKU清单'));
  if (fromProperties.length > 0) return fromProperties;

  const payload = await fetchDesignPayloadFromProduct(line.product_id);
  if (!payload?.beads?.length) return [];

  return payload.beads.map((bead) => ({
    sku: bead.sku,
    quantity: bead.quantity,
  }));
}

async function collectOrderBeadInventoryRequests(order: OrderWebhookPayload) {
  const warnings: string[] = [];
  const designLines = (order.line_items || []).filter(isDesignProductLine);
  const requests: InventoryAdjustmentRequest[] = [];
  for (const line of designLines) {
    const lineQuantity = Math.max(1, Number(line.quantity || 1));
    const lineRequests = await requestsFromDesignLine(line);
    if (lineRequests.length === 0) {
      warnings.push(`No bead SKU data found for design line ${line.id || line.sku || 'unknown'}`);
      continue;
    }
    for (const request of lineRequests) {
      requests.push({
        sku: request.sku,
        quantity: request.quantity * lineQuantity,
      });
    }
  }

  return {
    designLines,
    mergedRequests: mergeRequests(requests),
    warnings,
  };
}

export async function deductOrderBeadInventory(
  order: OrderWebhookPayload,
): Promise<OrderInventoryDeductionSummary> {
  if (!config.deductBeadInventoryOnOrder) {
    return {
      ok: true,
      skipped: true,
      orderName: order.name,
      designLines: 0,
      adjusted: 0,
      warnings: ['Inventory deduction is disabled by DEDUCT_BEAD_INVENTORY_ON_ORDER=false.'],
    };
  }

  const { designLines, mergedRequests, warnings } = await collectOrderBeadInventoryRequests(order);
  if (mergedRequests.length === 0) {
    return {
      ok: true,
      orderName: order.name,
      designLines: designLines.length,
      adjusted: 0,
      warnings,
    };
  }

  const result = await deductInventoryBySku(
    mergedRequests,
    orderGid(order),
    `crystafy-order-inventory-${order.id || order.name || Date.now()}`,
  );

  return {
    ok: true,
    orderName: order.name,
    designLines: designLines.length,
    adjusted: result.adjusted.length,
    warnings: [...warnings, ...result.warnings],
  };
}

export async function restockOrderBeadInventory(
  order: OrderWebhookPayload,
): Promise<OrderInventoryDeductionSummary> {
  if (!config.restockBeadInventoryOnCancel) {
    return {
      ok: true,
      skipped: true,
      orderName: order.name,
      designLines: 0,
      adjusted: 0,
      warnings: ['Inventory restock is disabled by RESTOCK_BEAD_INVENTORY_ON_CANCEL=false.'],
    };
  }

  const { designLines, mergedRequests, warnings } = await collectOrderBeadInventoryRequests(order);
  if (mergedRequests.length === 0) {
    return {
      ok: true,
      orderName: order.name,
      designLines: designLines.length,
      adjusted: 0,
      warnings,
    };
  }

  const result = await restockInventoryBySku(
    mergedRequests,
    orderGid(order),
    `crystafy-order-cancel-restock-${order.id || order.name || Date.now()}`,
  );

  return {
    ok: true,
    orderName: order.name,
    designLines: designLines.length,
    adjusted: result.adjusted.length,
    warnings: [...warnings, ...result.warnings],
  };
}
