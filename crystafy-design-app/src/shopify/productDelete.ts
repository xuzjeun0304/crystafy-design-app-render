import { shopifyGraphql } from './admin.js';

const PRODUCT_DELETE = /* GraphQL */ `
  mutation DeleteDesignProduct($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors {
        field
        message
      }
    }
  }
`;

interface ProductDeleteResult {
  productDelete: {
    deletedProductId: string | null;
    userErrors: Array<{ field?: string[]; message: string }>;
  };
}

export async function deleteProduct(productId: string): Promise<string | null> {
  const data = await shopifyGraphql<ProductDeleteResult>(PRODUCT_DELETE, {
    input: { id: productId },
  });

  const errors = data.productDelete.userErrors;
  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }

  return data.productDelete.deletedProductId;
}
