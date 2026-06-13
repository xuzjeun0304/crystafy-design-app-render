export function createDesignId(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const t = date.getTime().toString(36).toUpperCase();
  return `CRY-DESIGN-${y}${m}${d}-${t}`;
}

export function toGid(type: 'Product' | 'ProductVariant', id: string): string {
  if (id.startsWith('gid://')) return id;
  return `gid://shopify/${type}/${id}`;
}
