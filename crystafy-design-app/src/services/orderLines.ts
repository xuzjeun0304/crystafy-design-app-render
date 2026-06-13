export interface OrderLineProperty {
  name?: string;
  value?: string | number | boolean | null;
}

export interface OrderLineItem {
  id?: number;
  product_id?: number;
  sku?: string;
  quantity?: number;
  properties?: OrderLineProperty[];
}

export interface OrderWebhookPayload {
  id?: number;
  admin_graphql_api_id?: string;
  name?: string;
  line_items?: OrderLineItem[];
}

export function lineProperty(line: OrderLineItem, name: string): string | undefined {
  const prop = line.properties?.find((item) => item.name === name);
  if (prop?.value === undefined || prop.value === null) return undefined;
  return String(prop.value);
}

export function isDesignProductLine(line: OrderLineItem): boolean {
  return (
    lineProperty(line, '_design_product') === 'true' ||
    Boolean(lineProperty(line, '_design_id')) ||
    Boolean(line.sku && line.sku.startsWith('CRY-DESIGN-'))
  );
}

export function orderGid(order: OrderWebhookPayload): string {
  if (order.admin_graphql_api_id) return order.admin_graphql_api_id;
  return `gid://shopify/Order/${order.id || 'unknown'}`;
}

export function productGidFromNumericId(productId?: number): string | undefined {
  if (!productId) return undefined;
  return `gid://shopify/Product/${productId}`;
}
