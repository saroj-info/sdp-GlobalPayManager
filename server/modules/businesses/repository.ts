/**
 * SQL for `business_logos`. Direct drizzle like the other modules; business
 * and country lookups go through `storage` (wired in service.ts).
 */
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { businessLogos } from "@shared/schema";
import type { BusinessLogoRepository } from "./types";

export const repository: BusinessLogoRepository = {
  async getBusinessLogo(businessId) {
    const [row] = await db.select().from(businessLogos).where(eq(businessLogos.businessId, businessId)).limit(1);
    return row;
  },
  async upsertBusinessLogo(row) {
    await db
      .insert(businessLogos)
      .values(row)
      .onConflictDoUpdate({
        target: businessLogos.businessId,
        set: {
          contentType: row.contentType,
          byteSize: row.byteSize,
          sha256: row.sha256,
          data: row.data,
          uploadedByUserId: row.uploadedByUserId ?? null,
          updatedAt: new Date(),
        },
      });
  },
  async deleteBusinessLogo(businessId) {
    await db.delete(businessLogos).where(eq(businessLogos.businessId, businessId));
  },
};
