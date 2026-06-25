import 'dotenv/config';

function readEnv(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

function readBool(name: string, fallback = false): boolean {
  const raw = readEnv(name);
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function readNumber(name: string, fallback: number): number {
  const raw = Number(readEnv(name));
  return Number.isFinite(raw) ? raw : fallback;
}

function readProductStatus(name: string, fallback = 'DRAFT'): string {
  const status = readEnv(name, fallback).toUpperCase();
  return ['ACTIVE', 'DRAFT', 'ARCHIVED'].includes(status) ? status : fallback;
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
  designProductStatus: readProductStatus('DESIGN_PRODUCT_STATUS', 'DRAFT'),
  publishDesignProducts: readBool('PUBLISH_DESIGN_PRODUCTS', false),
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
  restockBeadInventoryOnCancel: readBool('RESTOCK_BEAD_INVENTORY_ON_CANCEL', true),
  archiveDesignProductsOnFulfillment: readBool('ARCHIVE_DESIGN_PRODUCTS_ON_FULFILLMENT', true),
  allowDesignProductDelete: readBool('ALLOW_DESIGN_PRODUCT_DELETE', false),
  autoCleanupArchivedDesigns: readBool('AUTO_CLEANUP_ARCHIVED_DESIGNS', false),
  autoCleanupOlderThanDays: readNumber('AUTO_CLEANUP_OLDER_THAN_DAYS', 30),
  autoCleanupIntervalHours: readNumber('AUTO_CLEANUP_INTERVAL_HOURS', 24),
  autoCleanupLimit: readNumber('AUTO_CLEANUP_LIMIT', 250),
  analyticsWebhookUrl: readEnv('DESIGN_ANALYTICS_WEBHOOK_URL'),
  analyticsWebhookToken: readEnv('DESIGN_ANALYTICS_WEBHOOK_TOKEN'),
  nocodbDesignSyncEnabled: readBool('NOCODB_DESIGN_SYNC_ENABLED', false),
  nocodbApiUrl: readEnv('NOCODB_API_URL'),
  nocodbApiToken: readEnv('NOCODB_API_TOKEN'),
  nocodbDesignsTableId: readEnv('NOCODB_DESIGNS_TABLE_ID'),
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
