import { config } from '../config.js';
import { shopifyGraphql } from './admin.js';

const VARIANT_BY_SKU_QUERY = /* GraphQL */ `
  query VariantBySku($query: String!) {
    productVariants(first: 10, query: $query) {
      nodes {
        id
        sku
        inventoryItem {
          id
          inventoryLevels(first: 20) {
            nodes {
              location {
                id
                name
              }
              quantities(names: ["available"]) {
                name
                quantity
              }
            }
          }
        }
      }
    }
  }
`;

const INVENTORY_ADJUST_QUANTITIES = /* GraphQL */ `
  mutation AdjustDesignInventory($input: InventoryAdjustQuantitiesInput!, $idempotencyKey: String!) {
    inventoryAdjustQuantities(input: $input) @idempotent(key: $idempotencyKey) {
      inventoryAdjustmentGroup {
        createdAt
        reason
        referenceDocumentUri
        changes {
          name
          delta
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

interface VariantBySkuResult {
  productVariants: {
    nodes: Array<{
      id: string;
      sku: string;
      inventoryItem: {
        id: string;
        inventoryLevels: {
          nodes: Array<{
            location: {
              id: string;
              name: string;
            };
            quantities: Array<{
              name: string;
              quantity: number;
            }>;
          }>;
        };
      };
    }>;
  };
}

interface InventoryAdjustResult {
  inventoryAdjustQuantities: {
    inventoryAdjustmentGroup: null | {
      createdAt: string;
      reason: string;
      referenceDocumentUri?: string;
      changes: Array<{
        name: string;
        delta: number;
      }>;
    };
    userErrors: Array<{ field?: string[]; message: string }>;
  };
}

export interface InventoryAdjustmentRequest {
  sku: string;
  quantity: number;
}

export interface InventoryDeductionResult {
  adjusted: Array<{
    sku: string;
    quantity: number;
    inventoryItemId: string;
    locationId: string;
  }>;
  warnings: string[];
}

function escapeSearchValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function normalizeLocationId(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('gid://shopify/Location/')) return value;
  if (/^\d+$/.test(value)) return `gid://shopify/Location/${value}`;
  return value;
}

function availableQuantity(level: {
  quantities: Array<{ name: string; quantity: number }>;
}): number {
  return level.quantities.find((quantity) => quantity.name === 'available')?.quantity ?? 0;
}

async function findInventoryTargetBySku(sku: string) {
  const data = await shopifyGraphql<VariantBySkuResult>(VARIANT_BY_SKU_QUERY, {
    query: `sku:"${escapeSearchValue(sku)}"`,
  });

  const variant =
    data.productVariants.nodes.find((node) => node.sku === sku) || data.productVariants.nodes[0];
  if (!variant) return null;

  const desiredLocationId = normalizeLocationId(config.inventoryLocationId);
  const levels = variant.inventoryItem.inventoryLevels.nodes;
  const level =
    (desiredLocationId && levels.find((item) => item.location.id === desiredLocationId)) ||
    levels.find((item) => availableQuantity(item) > 0) ||
    levels[0];
  if (!level) return null;

  return {
    sku: variant.sku,
    inventoryItemId: variant.inventoryItem.id,
    locationId: level.location.id,
    locationName: level.location.name,
  };
}

async function adjustInventoryBySku(
  requests: InventoryAdjustmentRequest[],
  referenceDocumentUri: string,
  idempotencyKey: string,
  direction: -1 | 1,
): Promise<InventoryDeductionResult> {
  const warnings: string[] = [];
  const changeMap = new Map<
    string,
    {
      sku: string;
      quantity: number;
      inventoryItemId: string;
      locationId: string;
    }
  >();

  for (const request of requests) {
    if (!request.sku || request.quantity <= 0) continue;
    const target = await findInventoryTargetBySku(request.sku);
    if (!target) {
      warnings.push(`No inventory target found for SKU ${request.sku}`);
      continue;
    }

    const key = `${target.inventoryItemId}|${target.locationId}`;
    const existing = changeMap.get(key);
    if (existing) {
      existing.quantity += request.quantity;
    } else {
      changeMap.set(key, {
        sku: request.sku,
        quantity: request.quantity,
        inventoryItemId: target.inventoryItemId,
        locationId: target.locationId,
      });
    }
  }

  const adjusted = [...changeMap.values()];
  if (adjusted.length === 0) return { adjusted, warnings };

  const data = await shopifyGraphql<InventoryAdjustResult>(INVENTORY_ADJUST_QUANTITIES, {
    idempotencyKey,
    input: {
      reason: 'correction',
      name: 'available',
      referenceDocumentUri,
      changes: adjusted.map((item) => ({
        delta: direction * item.quantity,
        inventoryItemId: item.inventoryItemId,
        locationId: item.locationId,
      })),
    },
  });

  const errors = data.inventoryAdjustQuantities.userErrors;
  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }

  return { adjusted, warnings };
}

export async function deductInventoryBySku(
  requests: InventoryAdjustmentRequest[],
  referenceDocumentUri: string,
  idempotencyKey: string,
): Promise<InventoryDeductionResult> {
  return adjustInventoryBySku(requests, referenceDocumentUri, idempotencyKey, -1);
}

export async function restockInventoryBySku(
  requests: InventoryAdjustmentRequest[],
  referenceDocumentUri: string,
  idempotencyKey: string,
): Promise<InventoryDeductionResult> {
  return adjustInventoryBySku(requests, referenceDocumentUri, idempotencyKey, 1);
}
