import 'dotenv/config';

function readEnv(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

function readBool(name: string, fallback = false): boolean {
  const raw = readEnv(name);
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export const config = {
  nodeEnv: readEnv('NODE_ENV', 'development'),
  port: Number(readEnv('PORT', '8787')),
  shopDomain: readEnv('SHOPIFY_SHOP_DOMAIN'),
  adminAccessToken: readEnv('SHOPIFY_ADMIN_ACCESS_TOKEN'),
  shopifyClientId: readEnv('SHOPIFY_CLIENT_ID'),
  shopifyClientSecret: readEnv('SHOPIFY_CLIENT_SECRET'),
  apiVersion: readEnv('SHOPIFY_API_VERSION', '2026-01'),
  apiSecret: readEnv('SHOPIFY_API_SECRET'),
  designProductStatus: readEnv('DESIGN_PRODUCT_STATUS', 'ACTIVE'),
  publishDesignProducts: readBool('PUBLISH_DESIGN_PRODUCTS', true),
  designProductType: readEnv('DESIGN_PRODUCT_TYPE', 'Custom Bracelet'),
  designProductVendor: readEnv('DESIGN_PRODUCT_VENDOR', 'Crystafy'),
  designProductTags: readEnv('DESIGN_PRODUCT_TAGS', 'custom-design,hidden-design-product')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean),
  appBaseUrl: readEnv('APP_BASE_URL', readEnv('RENDER_EXTERNAL_URL')),
  setupToken: readEnv('CRYSTAFY_SETUP_TOKEN'),
  inventoryLocationId: readEnv('SHOPIFY_INVENTORY_LOCATION_ID'),
  deductBeadInventoryOnOrder: readBool('DEDUCT_BEAD_INVENTORY_ON_ORDER', true),
  archiveDesignProductsOnFulfillment: readBool('ARCHIVE_DESIGN_PRODUCTS_ON_FULFILLMENT', true),
  allowUnverifiedLocalRequests: readBool('ALLOW_UNVERIFIED_LOCAL_REQUESTS', false),
  dryRunCreateProduct: readBool('DRY_RUN_CREATE_PRODUCT', true),
};

export function assertShopifyConfig(): void {
  const missing: string[] = [];
  if (!config.shopDomain) missing.push('SHOPIFY_SHOP_DOMAIN');

  const hasStaticAdminToken = Boolean(config.adminAccessToken);
  const hasClientCredentials = Boolean(config.shopifyClientId && config.shopifyClientSecret);
  if (!hasStaticAdminToken && !hasClientCredentials) {
    missing.push('SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET');
  }

  if (missing.length > 0) {
    throw new Error('Missing Shopify config: ' + missing.join(', '));
  }
}
