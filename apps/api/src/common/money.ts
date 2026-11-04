import { Prisma } from '@prisma/client';

/** Rupees (number | Decimal | string) → integer paise. */
export function toPaise(value: number | string | Prisma.Decimal): number {
  const d = new Prisma.Decimal(value as Prisma.Decimal.Value);
  return d.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}

/** Integer paise → Decimal rupees for storage. */
export function fromPaise(paise: number): Prisma.Decimal {
  return new Prisma.Decimal(paise).div(100);
}

export function formatInr(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
}
