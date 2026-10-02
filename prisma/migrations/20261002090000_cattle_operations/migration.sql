-- Cattle operations foundation: locations, stock movements, audit history and reproduction.
ALTER TYPE "AnimalStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';
ALTER TYPE "AnimalStatus" ADD VALUE IF NOT EXISTS 'EXTERNAL';

ALTER TABLE "Animal"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "microchip" TEXT,
  ADD COLUMN "genetics" TEXT,
  ADD COLUMN "motherId" UUID,
  ADD COLUMN "fatherId" UUID,
  ADD COLUMN "currentGroupId" UUID,
  ADD COLUMN "currentLotId" UUID,
  ADD COLUMN "currentLocationId" UUID;

CREATE TYPE "MovementType" AS ENUM ('INITIAL', 'PURCHASE', 'BIRTH', 'OTHER_IN', 'TRANSFER_IN', 'SALE', 'DEATH', 'DISPOSAL', 'OTHER_OUT', 'TRANSFER_OUT');

CREATE TABLE "Group" (
  "id" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "farmId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Lot" (
  "id" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "farmId" UUID NOT NULL,
  "groupId" UUID,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Location" (
  "id" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "farmId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StockMovement" (
  "id" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "farmId" UUID NOT NULL,
  "userId" UUID,
  "type" "MovementType" NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "origin" TEXT,
  "destination" TEXT,
  "value" DECIMAL(65,30),
  "reason" TEXT,
  "notes" TEXT,
  "groupId" UUID,
  "lotId" UUID,
  "locationId" UUID,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MovementAnimal" (
  "movementId" UUID NOT NULL,
  "animalId" UUID NOT NULL,
  CONSTRAINT "MovementAnimal_pkey" PRIMARY KEY ("movementId", "animalId")
);
CREATE TABLE "AnimalEvent" (
  "id" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "farmId" UUID NOT NULL,
  "animalId" UUID NOT NULL,
  "userId" UUID,
  "type" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "notes" TEXT,
  CONSTRAINT "AnimalEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Management" (
  "id" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "farmId" UUID NOT NULL,
  "userId" UUID,
  "type" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "responsible" TEXT,
  "result" TEXT,
  "notes" TEXT,
  CONSTRAINT "Management_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ManagementAnimal" (
  "managementId" UUID NOT NULL,
  "animalId" UUID NOT NULL,
  CONSTRAINT "ManagementAnimal_pkey" PRIMARY KEY ("managementId", "animalId")
);
CREATE TABLE "ReproductiveService" (
  "id" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "farmId" UUID NOT NULL,
  "motherId" UUID NOT NULL,
  "fatherId" UUID,
  "type" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "expectedBirth" TIMESTAMP(3),
  "notes" TEXT,
  CONSTRAINT "ReproductiveService_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PregnancyDiagnosis" (
  "id" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "farmId" UUID NOT NULL,
  "motherId" UUID NOT NULL,
  "serviceId" UUID,
  "date" TIMESTAMP(3) NOT NULL,
  "result" TEXT NOT NULL,
  "gestationDays" INTEGER,
  "evaluation" TEXT,
  "notes" TEXT,
  CONSTRAINT "PregnancyDiagnosis_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Birth" (
  "id" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "farmId" UUID NOT NULL,
  "motherId" UUID NOT NULL,
  "fatherId" UUID,
  "serviceId" UUID,
  "date" TIMESTAMP(3) NOT NULL,
  "gestationDays" INTEGER,
  "totalCalves" INTEGER NOT NULL DEFAULT 0,
  "stillborn" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  CONSTRAINT "Birth_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BirthCalf" (
  "id" UUID NOT NULL,
  "birthId" UUID NOT NULL,
  "animalId" UUID,
  "identifier" TEXT NOT NULL,
  "sex" "Sex" NOT NULL,
  "alive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  CONSTRAINT "BirthCalf_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Abortion" (
  "id" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "farmId" UUID NOT NULL,
  "motherId" UUID NOT NULL,
  "serviceId" UUID,
  "date" TIMESTAMP(3) NOT NULL,
  "gestationDays" INTEGER,
  "cause" TEXT,
  "notes" TEXT,
  CONSTRAINT "Abortion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CatalogItem" (
  "id" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "farmId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Group_farmId_name_key" ON "Group"("farmId", "name");
CREATE UNIQUE INDEX "Lot_farmId_name_key" ON "Lot"("farmId", "name");
CREATE UNIQUE INDEX "Location_farmId_name_key" ON "Location"("farmId", "name");
CREATE UNIQUE INDEX "CatalogItem_farmId_type_name_key" ON "CatalogItem"("farmId", "type", "name");
CREATE INDEX "StockMovement_farmId_date_type_idx" ON "StockMovement"("farmId", "date", "type");
CREATE INDEX "AnimalEvent_farmId_animalId_date_idx" ON "AnimalEvent"("farmId", "animalId", "date");

ALTER TABLE "Group" ADD CONSTRAINT "Group_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Location" ADD CONSTRAINT "Location_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MovementAnimal" ADD CONSTRAINT "MovementAnimal_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "StockMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovementAnimal" ADD CONSTRAINT "MovementAnimal_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnimalEvent" ADD CONSTRAINT "AnimalEvent_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnimalEvent" ADD CONSTRAINT "AnimalEvent_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnimalEvent" ADD CONSTRAINT "AnimalEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Management" ADD CONSTRAINT "Management_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Management" ADD CONSTRAINT "Management_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ManagementAnimal" ADD CONSTRAINT "ManagementAnimal_managementId_fkey" FOREIGN KEY ("managementId") REFERENCES "Management"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManagementAnimal" ADD CONSTRAINT "ManagementAnimal_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReproductiveService" ADD CONSTRAINT "ReproductiveService_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReproductiveService" ADD CONSTRAINT "ReproductiveService_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReproductiveService" ADD CONSTRAINT "ReproductiveService_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PregnancyDiagnosis" ADD CONSTRAINT "PregnancyDiagnosis_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PregnancyDiagnosis" ADD CONSTRAINT "PregnancyDiagnosis_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PregnancyDiagnosis" ADD CONSTRAINT "PregnancyDiagnosis_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ReproductiveService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Birth" ADD CONSTRAINT "Birth_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Birth" ADD CONSTRAINT "Birth_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Birth" ADD CONSTRAINT "Birth_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Birth" ADD CONSTRAINT "Birth_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ReproductiveService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BirthCalf" ADD CONSTRAINT "BirthCalf_birthId_fkey" FOREIGN KEY ("birthId") REFERENCES "Birth"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BirthCalf" ADD CONSTRAINT "BirthCalf_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Abortion" ADD CONSTRAINT "Abortion_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Abortion" ADD CONSTRAINT "Abortion_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Abortion" ADD CONSTRAINT "Abortion_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ReproductiveService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_currentGroupId_fkey" FOREIGN KEY ("currentGroupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_currentLotId_fkey" FOREIGN KEY ("currentLotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
