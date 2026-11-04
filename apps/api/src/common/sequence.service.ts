import { Injectable } from '@nestjs/common';
import type { Tx } from './tenant-db.service';
import { financialYear } from './time';

/**
 * Gap-free, per-store, per-financial-year document numbering.
 * Must be called inside a tenant transaction so the number is rolled back
 * together with the document if anything fails.
 */
@Injectable()
export class SequenceService {
  async next(tx: Tx, storeId: string, docType: string, prefix: string, timeZone: string, at = new Date()) {
    const fy = financialYear(at, timeZone);
    const rows = await tx.$queryRaw<{ value: number }[]>`
      INSERT INTO document_sequences ("storeId", "docType", "financialYear", "nextValue")
      VALUES (${storeId}::uuid, ${docType}, ${fy}, 2)
      ON CONFLICT ("storeId", "docType", "financialYear")
      DO UPDATE SET "nextValue" = document_sequences."nextValue" + 1
      RETURNING "nextValue" - 1 AS value`;
    const value = Number(rows[0].value);
    return { financialYear: fy, number: `${prefix}/${fy}/${String(value).padStart(5, '0')}` };
  }
}
