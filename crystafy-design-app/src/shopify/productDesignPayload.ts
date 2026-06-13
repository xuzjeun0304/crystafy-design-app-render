import type { DesignPayload } from '../types.js';
import { shopifyGraphql } from './admin.js';

const PRODUCT_DESIGN_PAYLOAD_QUERY = /* GraphQL */ `
  query ProductDesignPayload($id: ID!) {
    product(id: $id) {
      metafield(namespace: "custom", key: "design_payload") {
        value
      }
    }
  }
`;

interface ProductDesignPayloadResult {
  product: null | {
    metafield: null | {
      value: string;
    };
  };
}

function productGid(productId?: number | string): string | undefined {
  if (!productId) return undefined;
  const value = String(productId);
  if (value.startsWith('gid://shopify/Product/')) return value;
  if (/^\d+$/.test(value)) return `gid://shopify/Product/${value}`;
  return undefined;
}

export async function fetchDesignPayloadFromProduct(
  productId?: number | string,
): Promise<DesignPayload | null> {
  const id = productGid(productId);
  if (!id) return null;

  const data = await shopifyGraphql<ProductDesignPayloadResult>(PRODUCT_DESIGN_PAYLOAD_QUERY, {
    id,
  });
  const value = data.product?.metafield?.value;
  if (!value) return null;

  try {
    return JSON.parse(value) as DesignPayload;
  } catch {
    return null;
  }
}
