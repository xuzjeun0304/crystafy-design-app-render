import { config } from '../config.js';
import type { DesignPayload } from '../types.js';
import { shopifyGraphql } from '../shopify/admin.js';

const DESIGN_PRODUCTS_QUERY = /* GraphQL */ `
  query DesignProducts($first: Int!, $after: String, $query: String!) {
    products(first: $first, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        status
        createdAt
        updatedAt
        productType
        vendor
        tags
        variants(first: 1) {
          nodes {
            id
            sku
            price
          }
        }
        designId: metafield(namespace: "custom", key: "design_id") {
          value
        }
        designPayload: metafield(namespace: "custom", key: "design_payload") {
          value
        }
        media(first: 1) {
          nodes {
            ... on MediaImage {
              image {
                url
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

interface DesignProductsQueryResult {
  products: {
    nodes: Array<{
      id: string;
      title: string;
      handle: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      productType?: string;
      vendor?: string;
      tags: string[];
      variants: {
        nodes: Array<{
          id: string;
          sku: string;
          price: string;
        }>;
      };
      designId?: null | {
        value: string;
      };
      designPayload?: null | {
        value: string;
      };
      media: {
        nodes: Array<{
          image?: {
            url: string;
          };
        }>;
      };
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string | null;
    };
  };
}

export interface DesignAnalyticsRecord {
  designId: string;
  productId: string;
  productHandle: string;
  productStatus: string;
  productTitle: string;
  productUrl: string;
  createdAt: string;
  updatedAt: string;
  designName: string;
  source: string;
  wristSizeCm: number | '';
  totalPrice: number | '';
  currency: string;
  beadCount: number;
  uniqueSkuCount: number;
  skuSummary: string;
  beadSummary: string;
  sequenceCode: string;
  previewImageUrl: string;
  logoPalette: string;
}

function productQuery(): string {
  const primaryTag = config.designProductTags[0];
  if (primaryTag) return `tag:${primaryTag}`;
  return `product_type:"${config.designProductType.replace(/"/g, '\\"')}"`;
}

function numericIdFromGid(gid: string): string {
  return gid.split('/').pop() || gid;
}

function parseDesignPayload(value?: string): DesignPayload | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as DesignPayload;
  } catch {
    return null;
  }
}

function skuSummary(payload: DesignPayload | null): string {
  if (!payload?.beads?.length) return '';
  return payload.beads.map((bead) => `${bead.sku} x${bead.quantity}`).join('; ');
}

function beadSummary(payload: DesignPayload | null): string {
  if (!payload?.beads?.length) return '';
  return payload.beads
    .map((bead) => {
      const name = bead.titleCn || bead.title || bead.sku;
      const size = bead.sizeMm ? `${bead.sizeMm}mm` : 'size n/a';
      return `${name} ${size} ${bead.sku} x${bead.quantity}`;
    })
    .join('; ');
}

function beadCount(payload: DesignPayload | null): number {
  return payload?.beads?.reduce((sum, bead) => sum + bead.quantity, 0) || 0;
}

function uniqueSkuCount(payload: DesignPayload | null): number {
  return new Set(payload?.beads?.map((bead) => bead.sku) || []).size;
}

function shopDomain(): string {
  return config.shopDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function productUrl(handle: string): string {
  return `https://${shopDomain().replace('.myshopify.com', '.com')}/products/${handle}`;
}

export async function listDesignAnalytics(limit = 100): Promise<DesignAnalyticsRecord[]> {
  const records: DesignAnalyticsRecord[] = [];
  let after: string | null | undefined;
  const cappedLimit = Math.max(1, Math.min(limit, 250));

  while (records.length < cappedLimit) {
    const first = Math.min(50, cappedLimit - records.length);
    const data = await shopifyGraphql<DesignProductsQueryResult>(DESIGN_PRODUCTS_QUERY, {
      first,
      after,
      query: productQuery(),
    });

    for (const product of data.products.nodes) {
      const payload = parseDesignPayload(product.designPayload?.value);
      const variant = product.variants.nodes[0];
      const imageUrl = product.media.nodes[0]?.image?.url || payload?.previewImageUrl || '';
      records.push({
        designId: product.designId?.value || payload?.designId || variant?.sku || '',
        productId: numericIdFromGid(product.id),
        productHandle: product.handle,
        productStatus: product.status,
        productTitle: product.title,
        productUrl: productUrl(product.handle),
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        designName: payload?.designName || product.title,
        source: payload?.source || '',
        wristSizeCm: payload?.wristSizeCm || '',
        totalPrice: payload?.totalPrice ?? (variant ? Number(variant.price) : ''),
        currency: payload?.currency || 'USD',
        beadCount: beadCount(payload),
        uniqueSkuCount: uniqueSkuCount(payload),
        skuSummary: skuSummary(payload),
        beadSummary: beadSummary(payload),
        sequenceCode: payload?.sequenceCode || '',
        previewImageUrl: imageUrl,
        logoPalette: payload?.logoPalette?.join('|') || '',
      });
      if (records.length >= cappedLimit) break;
    }

    if (!data.products.pageInfo.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
  }

  return records;
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function designsToCsv(records: DesignAnalyticsRecord[]): string {
  const columns: Array<keyof DesignAnalyticsRecord> = [
    'designId',
    'createdAt',
    'updatedAt',
    'designName',
    'source',
    'productStatus',
    'productId',
    'productUrl',
    'wristSizeCm',
    'totalPrice',
    'currency',
    'beadCount',
    'uniqueSkuCount',
    'skuSummary',
    'beadSummary',
    'sequenceCode',
    'previewImageUrl',
    'logoPalette',
  ];

  const header = columns.map(csvCell).join(',');
  const rows = records.map((record) => columns.map((column) => csvCell(record[column])).join(','));
  return [header, ...rows].join('\n');
}
