export interface DesignBead {
  variantId: string;
  productId?: string;
  sku: string;
  title: string;
  titleCn?: string;
  sizeMm?: number;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
  shape?: string;
  beadDims?: Record<string, unknown>;
}

export interface DesignPayload {
  designName: string;
  designId?: string;
  customerId?: string;
  customerEmail?: string;
  source: 'DIY' | 'Gift Ready' | 'Community' | 'Imported';
  wristSizeCm: number;
  totalPrice: number;
  currency: string;
  previewImageDataUrl?: string;
  previewImageUrl?: string;
  sequenceCode: string;
  logoPalette?: string[];
  beads: DesignBead[];
}

export interface CreatedDesignProduct {
  designId: string;
  productId: string;
  productNumericId?: string;
  variantId: string;
  variantNumericId?: string;
  handle?: string;
  previewImageUrl?: string;
  warnings?: string[];
}
