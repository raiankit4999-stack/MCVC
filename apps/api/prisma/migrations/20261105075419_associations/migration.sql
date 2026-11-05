-- AlterTable
ALTER TABLE "membership_applications" ADD COLUMN     "associationId" UUID;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "associationId" UUID;

-- CreateTable
CREATE TABLE "associations" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "zone" TEXT NOT NULL,
    "officeBearers" JSONB NOT NULL DEFAULT '[]',
    "sourceUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "associations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "associations_slug_key" ON "associations"("slug");

-- CreateIndex
CREATE INDEX "associations_zone_idx" ON "associations"("zone");

-- CreateIndex
CREATE INDEX "stores_associationId_idx" ON "stores"("associationId");

-- AddForeignKey
ALTER TABLE "associations" ADD CONSTRAINT "associations_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associations" ADD CONSTRAINT "associations_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "associations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
