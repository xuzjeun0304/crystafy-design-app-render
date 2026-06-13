import { shopifyGraphql } from './admin.js';

const PRODUCT_ARCHIVE = /* GraphQL */ `
  mutation ArchiveDesignProduct($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

interface ProductArchiveResult {
  productUpdate: {
    product: null | {
      id: string;
      status: string;
    };
    userErrors: Array<{ field?: string[]; message: string }>;
  };
}

export async function archiveProduct(productId: string) {
  const data = await shopifyGraphql<ProductArchiveResult>(PRODUCT_ARCHIVE, {
    product: {
      id: productId,
      status: 'ARCHIVED',
    },
  });

  const errors = data.productUpdate.userErrors;
  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }

  return data.productUpdate.product;
}
