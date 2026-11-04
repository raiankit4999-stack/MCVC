import { indianPhone, isValidGstin } from '../../src/common/validators';
import { financialYear } from '../../src/common/time';
import { isOpenNow } from '../../src/community/hours';
import { canTransition } from '../../src/repairs/repair-status';

describe('validators', () => {
  it('validates GSTIN checksum', () => {
    expect(isValidGstin('27AAPFU0939F1ZV')).toBe(true);
    expect(isValidGstin('27AAPFU0939F1ZX')).toBe(false);
    expect(isValidGstin('NOT-A-GSTIN')).toBe(false);
  });

  it('normalises Indian mobile numbers', () => {
    expect(indianPhone.parse('98250 12345')).toBe('+919825012345');
    expect(indianPhone.parse('+91-98250-12345')).toBe('+919825012345');
    expect(indianPhone.parse('09825012345')).toBe('+919825012345');
    expect(indianPhone.safeParse('12345').success).toBe(false);
    expect(indianPhone.safeParse('5825012345').success).toBe(false);
  });
});

describe('financialYear', () => {
  it('uses April–March in IST', () => {
    expect(financialYear(new Date('2026-03-31T18:45:00Z'))).toBe('2026-27'); // 1 Apr 2026 IST
    expect(financialYear(new Date('2026-03-31T18:45:00Z'), 'UTC')).toBe('2025-26');
    expect(financialYear(new Date('2026-03-31T18:00:00Z'))).toBe('2025-26'); // 23:30 IST, 31 Mar
    expect(financialYear(new Date('2027-01-15T00:00:00Z'))).toBe('2026-27');
  });
});

describe('business hours', () => {
  it('detects open/closed in store timezone', () => {
    const hours = [{ day: 3, open: '10:00', close: '20:00' }];
    expect(isOpenNow(hours, 'Asia/Kolkata', new Date('2026-11-04T06:00:00Z'))).toBe(true); // Wed 11:30 IST
    expect(isOpenNow(hours, 'Asia/Kolkata', new Date('2026-11-04T15:00:00Z'))).toBe(false); // Wed 20:30 IST
    expect(isOpenNow([], 'Asia/Kolkata')).toBeNull();
  });
});

describe('repair status machine', () => {
  it('allows only defined transitions', () => {
    expect(canTransition('RECEIVED', 'DIAGNOSING')).toBe(true);
    expect(canTransition('RECEIVED', 'DELIVERED')).toBe(false);
    expect(canTransition('READY', 'DELIVERED')).toBe(true);
    expect(canTransition('DELIVERED', 'IN_PROGRESS')).toBe(false);
  });
});
