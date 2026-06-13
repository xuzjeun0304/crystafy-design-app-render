import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (value === '' || value === null) return undefined;
  return value;
};

const requiredTextSchema = z.preprocess((value) => {
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return value;
}, z.string().trim().min(1));

const optionalTextSchema = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

const positiveNumberSchema = z.coerce.number().positive();
const nonnegativeNumberSchema = z.coerce.number().nonnegative();
const positiveIntSchema = z.coerce.number().int().positive();
const optionalPositiveNumberSchema = z.preprocess(
  emptyToUndefined,
  z.coerce.number().positive().optional(),
);

export const designBeadSchema = z.object({
  variantId: requiredTextSchema,
  productId: optionalTextSchema,
  sku: requiredTextSchema,
  title: requiredTextSchema,
  titleCn: optionalTextSchema,
  sizeMm: optionalPositiveNumberSchema,
  quantity: positiveIntSchema,
  unitPrice: nonnegativeNumberSchema,
  imageUrl: optionalTextSchema,
  shape: optionalTextSchema,
  beadDims: z.record(z.unknown()).optional(),
});

export const designPayloadSchema = z.object({
  designName: z.string().trim().min(1).max(80),
  designId: optionalTextSchema,
  customerId: optionalTextSchema,
  customerEmail: z.preprocess(emptyToUndefined, z.string().email().optional()),
  source: z.enum(['DIY', 'Gift Ready', 'Community', 'Imported']).default('DIY'),
  wristSizeCm: positiveNumberSchema,
  totalPrice: nonnegativeNumberSchema,
  currency: z.string().min(3).max(3).default('USD'),
  previewImageDataUrl: optionalTextSchema,
  previewImageUrl: optionalTextSchema,
  sequenceCode: requiredTextSchema,
  logoPalette: z.array(requiredTextSchema).optional(),
  beads: z.array(designBeadSchema).min(1),
});

export type ParsedDesignPayload = z.infer<typeof designPayloadSchema>;
