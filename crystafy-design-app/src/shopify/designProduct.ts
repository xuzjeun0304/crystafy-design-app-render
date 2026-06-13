import { config } from '../config.js';
import type { CreatedDesignProduct } from '../types.js';
import type { ParsedDesignPayload } from '../validation.js';
import { createDesignId } from '../utils/ids.js';
import { cents } from '../utils/money.js';
import { shopifyGraphql } from './admin.js';
import { uploadPreviewImageDataUrl } from './media.js';

const PRODUCT_CREATE = /* GraphQL */ `
  mutation CreateDesignProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) {
      product {
        id
        handle
        variants(first: 1) {
          nodes {
            id
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PRODUCT_VARIANTS_BULK_UPDATE = /* GraphQL */ `
  mutation UpdateDesignProductVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PUBLICATIONS_QUERY = /* GraphQL */ `
  query DesignProductPublications {
    publications(first: 20) {
      nodes {
        id
        name
      }
    }
  }
`;

const PUBLISHABLE_PUBLISH = /* GraphQL */ `
  mutation PublishDesignProduct($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;

interface ProductCreateResult {
  productCreate: {
    product: null | {
      id: string;
      handle: string;
      variants: {
        nodes: Array<{ id: string }>;
      };
    };
    userErrors: Array<{ field?: string[]; message: string }>;
  };
}

interface ProductVariantsBulkUpdateResult {
  productVariantsBulkUpdate: {
    productVariants: Array<{ id: string }>;
    userErrors: Array<{ field?: string[]; message: string }>;
  };
}

interface PublicationsResult {
  publications: {
    nodes: Array<{ id: string; name: string }>;
  };
}

interface PublishablePublishResult {
  publishablePublish: {
    userErrors: Array<{ field?: string[]; message: string }>;
  };
}

function numericIdFromGid(gid: string): string | undefined {
  return gid.split('/').pop() || undefined;
}

function designPayloadForMetafield(payload: ParsedDesignPayload): Record<string, unknown> {
  return {
    ...payload,
    previewImageDataUrl: payload.previewImageDataUrl
      ? '[captured-preview-image-data-url-omitted]'
      : undefined,
  };
}

function designMetafields(designId: string, payload: ParsedDesignPayload) {
  return [
    {
      namespace: 'custom',
      key: 'design_id',
      type: 'single_line_text_field',
      value: designId,
    },
    {
      namespace: 'custom',
      key: 'design_payload',
      type: 'json',
      value: JSON.stringify(designPayloadForMetafield(payload)),
    },
    {
      namespace: 'custom',
      key: 'bead_sequence',
      type: 'json',
      value: JSON.stringify(payload.sequenceCode),
    },
  ];
}

async function publishDesignProduct(productId: string): Promise<string[]> {
  if (!config.publishDesignProducts) return [];

  try {
    const data = await shopifyGraphql<PublicationsResult>(PUBLICATIONS_QUERY);
    const onlineStore = data.publications.nodes.find((publication) =>
      publication.name.toLowerCase().includes('online store'),
    );
    const target = onlineStore || data.publications.nodes[0];
    if (!target) return ['Design Product created, but Shopify returned no publications to publish to.'];

    const published = await shopifyGraphql<PublishablePublishResult>(PUBLISHABLE_PUBLISH, {
      id: productId,
      input: [{ publicationId: target.id }],
    });
    const errors = published.publishablePublish.userErrors;
    if (errors.length > 0) {
      return ['Design Product created, but publish failed: ' + errors.map((error) => error.message).join('; ')];
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return ['Design Product created, but publish was skipped/failed: ' + message];
  }

  return [];
}

export async function createDesignProduct(payload: ParsedDesignPayload): Promise<CreatedDesignProduct> {
  const designId = payload.designId || createDesignId();
  const title = `${payload.designName} - ${designId}`;
  const uploadedPreviewUrl = payload.previewImageDataUrl
    ? await uploadPreviewImageDataUrl(payload.previewImageDataUrl, designId)
    : payload.previewImageUrl;

  const data = await shopifyGraphql<ProductCreateResult>(PRODUCT_CREATE, {
    product: {
      title,
      vendor: config.designProductVendor,
      productType: config.designProductType,
      status: config.designProductStatus,
      tags: config.designProductTags,
      metafields: designMetafields(designId, payload),
    },
    media: uploadedPreviewUrl
      ? [
          {
            originalSource: uploadedPreviewUrl,
            alt: `${payload.designName} preview`,
            mediaContentType: 'IMAGE',
          },
        ]
      : undefined,
  });

  const errors = data.productCreate.userErrors;
  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }

  const product = data.productCreate.product;
  const variant = product?.variants.nodes[0];
  if (!product || !variant) {
    throw new Error('Shopify did not return created product / variant');
  }

  const variantData = await shopifyGraphql<ProductVariantsBulkUpdateResult>(
    PRODUCT_VARIANTS_BULK_UPDATE,
    {
      productId: product.id,
      variants: [
        {
          id: variant.id,
          price: cents(payload.totalPrice),
          inventoryPolicy: 'CONTINUE',
          taxable: true,
          inventoryItem: {
            sku: designId,
            tracked: false,
          },
        },
      ],
    },
  );

  const variantErrors = variantData.productVariantsBulkUpdate.userErrors;
  if (variantErrors.length > 0) {
    throw new Error(variantErrors.map((error) => error.message).join('; '));
  }

  const warnings = await publishDesignProduct(product.id);

  return {
    designId,
    productId: product.id,
    productNumericId: numericIdFromGid(product.id),
    variantId: variant.id,
    variantNumericId: numericIdFromGid(variant.id),
    handle: product.handle,
    previewImageUrl: uploadedPreviewUrl,
    warnings,
  };
}
