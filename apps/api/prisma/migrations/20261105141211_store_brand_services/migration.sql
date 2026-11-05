-- CreateEnum
CREATE TYPE "BrandServiceStatus" AS ENUM ('AUTHORISED', 'THIRD_PARTY', 'UNAUTHORISED');

-- CreateTable
CREATE TABLE "store_brand_services" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "status" "BrandServiceStatus" NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_brand_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_brand_services_brand_status_idx" ON "store_brand_services"("brand", "status");

-- CreateIndex
CREATE UNIQUE INDEX "store_brand_services_storeId_brand_key" ON "store_brand_services"("storeId", "brand");

-- AddForeignKey
ALTER TABLE "store_brand_services" ADD CONSTRAINT "store_brand_services_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
