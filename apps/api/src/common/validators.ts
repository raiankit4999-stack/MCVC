import { z } from 'zod';

/** Indian mobile numbers, normalised to +91XXXXXXXXXX. */
export const indianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ''))
  .transform((v) => v.replace(/^(\+91|0091|91(?=\d{10}$)|0(?=\d{10}$))/, ''))
  .refine((v) => /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number')
  .transform((v) => `+91${v}`);

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Validates GSTIN format and its mod-36 check digit. */
export function isValidGstin(value: string): boolean {
  const v = value.toUpperCase();
  if (!GSTIN_RE.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const code = GSTIN_CHARS.indexOf(v[i]);
    const product = code * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  const check = GSTIN_CHARS[(36 - (sum % 36)) % 36];
  return check === v[14];
}

export const gstin = z
  .string()
  .trim()
  .toUpperCase()
  .refine(isValidGstin, 'Invalid GSTIN');

export const stateCode = z.string().regex(/^\d{2}$/, 'State code must be 2 digits');
export const hsnSac = z.string().regex(/^\d{4,8}$/, 'HSN/SAC must be 4–8 digits');
export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');
/** Positive money amount in rupees with at most 2 decimals. */
export const money = z.coerce
  .number()
  .nonnegative()
  .max(1e11)
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Use at most 2 decimal places');
export const uuid = z.uuid();
export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a #RRGGBB colour');

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
});
