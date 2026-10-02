CREATE TABLE "LaboratoryRecord" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "farmId" UUID NOT NULL,
    "animalId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "analysisType" TEXT NOT NULL,
    "sample" TEXT,
    "result" TEXT NOT NULL,
    "laboratory" TEXT,
    "professional" TEXT,
    "cost" DECIMAL(12,2),
    "attachmentUrl" TEXT,
    "notes" TEXT,
    CONSTRAINT "LaboratoryRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LaboratoryRecord_farmId_animalId_date_idx" ON "LaboratoryRecord"("farmId", "animalId", "date");
ALTER TABLE "LaboratoryRecord" ADD CONSTRAINT "LaboratoryRecord_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaboratoryRecord" ADD CONSTRAINT "LaboratoryRecord_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
