/**
 * GST computation in integer paise.
 *
 * - Intra-state supply (place of supply == store state): tax split into CGST + SGST.
 * - Inter-state supply: IGST.
 * - Prices can be tax-exclusive (default) or tax-inclusive (MRP-style retail).
 * - Grand total is rounded to the nearest rupee and the difference recorded as round-off.
 *
 * Rates and HSN/SAC codes are configuration supplied by the store and must be
 * validated by a tax professional — this module only performs the arithmetic.
 */
export interface GstLineInput {
  quantity: number; // may be fractional (up to 3 decimals)
  unitPricePaise: number;
  discountPaise?: number; // absolute discount for the whole line
  gstRate: number; // percent, e.g. 18 or 0.25
}

export interface GstLineResult {
  grossPaise: number;
  discountPaise: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
}

export interface GstTotals {
  lines: GstLineResult[];
  subtotalPaise: number;
  discountPaise: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  roundOffPaise: number;
  grandTotalPaise: number;
}

export function computeGst(lines: GstLineInput[], opts: { interState: boolean; pricesIncludeTax?: boolean; roundToRupee?: boolean }): GstTotals {
  const results = lines.map((line) => computeLine(line, opts.interState, !!opts.pricesIncludeTax));
  const sum = (k: keyof GstLineResult) => results.reduce((acc, r) => acc + r[k], 0);
  const taxable = sum('taxablePaise');
  const cgst = sum('cgstPaise');
  const sgst = sum('sgstPaise');
  const igst = sum('igstPaise');
  const exact = taxable + cgst + sgst + igst;
  const rounded = opts.roundToRupee === false ? exact : Math.round(exact / 100) * 100;
  return {
    lines: results,
    subtotalPaise: sum('grossPaise'),
    discountPaise: sum('discountPaise'),
    taxablePaise: taxable,
    cgstPaise: cgst,
    sgstPaise: sgst,
    igstPaise: igst,
    roundOffPaise: rounded - exact,
    grandTotalPaise: rounded,
  };
}

function computeLine(line: GstLineInput, interState: boolean, inclusive: boolean): GstLineResult {
  if (!(line.quantity > 0)) throw new RangeError('Quantity must be positive');
  if (line.unitPricePaise < 0 || !Number.isInteger(line.unitPricePaise)) throw new RangeError('Unit price must be whole paise');
  const rateBp = Math.round(line.gstRate * 100); // basis points of percent: 18% → 1800
  if (rateBp < 0 || rateBp > 10000) throw new RangeError('GST rate out of range');

  const gross = Math.round(line.quantity * line.unitPricePaise);
  const discount = line.discountPaise ?? 0;
  if (discount < 0 || discount > gross) throw new RangeError('Discount must be between 0 and the line amount');
  const net = gross - discount;

  let taxable: number;
  let tax: number;
  if (inclusive) {
    taxable = Math.round((net * 10000) / (10000 + rateBp));
    tax = net - taxable;
  } else {
    taxable = net;
    tax = Math.round((taxable * rateBp) / 10000);
  }

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (interState) {
    igst = tax;
  } else {
    cgst = Math.round(tax / 2);
    sgst = tax - cgst;
  }
  return { grossPaise: gross, discountPaise: discount, taxablePaise: taxable, cgstPaise: cgst, sgstPaise: sgst, igstPaise: igst, totalPaise: taxable + tax };
}
