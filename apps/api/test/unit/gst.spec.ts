import { computeGst } from '../../src/billing/gst';

describe('computeGst', () => {
  it('splits intra-state tax into equal CGST and SGST', () => {
    const r = computeGst([{ quantity: 1, unitPricePaise: 100000, gstRate: 18 }], { interState: false });
    expect(r.taxablePaise).toBe(100000);
    expect(r.cgstPaise).toBe(9000);
    expect(r.sgstPaise).toBe(9000);
    expect(r.igstPaise).toBe(0);
    expect(r.grandTotalPaise).toBe(118000);
  });

  it('uses IGST for inter-state supply', () => {
    const r = computeGst([{ quantity: 2, unitPricePaise: 50000, gstRate: 18 }], { interState: true });
    expect(r.igstPaise).toBe(18000);
    expect(r.cgstPaise + r.sgstPaise).toBe(0);
  });

  it('applies discounts before tax', () => {
    const r = computeGst([{ quantity: 1, unitPricePaise: 100000, discountPaise: 10000, gstRate: 18 }], { interState: false });
    expect(r.taxablePaise).toBe(90000);
    expect(r.cgstPaise + r.sgstPaise).toBe(16200);
  });

  it('back-calculates tax from tax-inclusive prices', () => {
    const r = computeGst([{ quantity: 1, unitPricePaise: 118000, gstRate: 18 }], { interState: false, pricesIncludeTax: true });
    expect(r.taxablePaise).toBe(100000);
    expect(r.cgstPaise + r.sgstPaise).toBe(18000);
    expect(r.grandTotalPaise).toBe(118000);
  });

  it('keeps odd paise split exact and rounds the grand total to the rupee', () => {
    const r = computeGst([{ quantity: 1, unitPricePaise: 1099, gstRate: 18 }], { interState: false });
    expect(r.cgstPaise + r.sgstPaise).toBe(198);
    expect(r.taxablePaise + r.cgstPaise + r.sgstPaise + r.roundOffPaise).toBe(r.grandTotalPaise);
    expect(r.grandTotalPaise % 100).toBe(0);
  });

  it('supports fractional rates and mixed lines', () => {
    const r = computeGst(
      [
        { quantity: 1, unitPricePaise: 100000, gstRate: 0.25 },
        { quantity: 3, unitPricePaise: 33333, gstRate: 5 },
      ],
      { interState: true, roundToRupee: false },
    );
    expect(r.igstPaise).toBe(250 + 5000);
    expect(r.roundOffPaise).toBe(0);
  });

  it('rejects invalid input', () => {
    expect(() => computeGst([{ quantity: 0, unitPricePaise: 100, gstRate: 18 }], { interState: false })).toThrow();
    expect(() => computeGst([{ quantity: 1, unitPricePaise: 100, discountPaise: 200, gstRate: 18 }], { interState: false })).toThrow();
  });
});
