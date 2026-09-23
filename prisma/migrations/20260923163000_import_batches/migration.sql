CREATE TYPE "ImportType" AS ENUM ('ANIMALS', 'WEIGHINGS', 'SALES');
CREATE TYPE "ImportStatus" AS ENUM ('PREVIEW', 'COMMITTED', 'ROLLED_BACK', 'FAILED');
CREATE TABLE "ImportBatch" ("id" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "farmId" UUID NOT NULL, "type" "ImportType" NOT NULL, "fileName" TEXT NOT NULL, "fileHash" TEXT NOT NULL, "status" "ImportStatus" NOT NULL DEFAULT 'PREVIEW', "totalRows" INTEGER NOT NULL DEFAULT 0, "validRows" INTEGER NOT NULL DEFAULT 0, "errorRows" INTEGER NOT NULL DEFAULT 0, "committedAt" TIMESTAMP(3), "rolledBackAt" TIMESTAMP(3), CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ImportRow" ("id" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "batchId" UUID NOT NULL, "rowNumber" INTEGER NOT NULL, "raw" JSONB NOT NULL, "normalized" JSONB, "status" TEXT NOT NULL, "errors" JSONB, CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "ImportBatch_farmId_fileHash_key" ON "ImportBatch"("farmId", "fileHash");
CREATE UNIQUE INDEX "ImportRow_batchId_rowNumber_key" ON "ImportRow"("batchId", "rowNumber");
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
