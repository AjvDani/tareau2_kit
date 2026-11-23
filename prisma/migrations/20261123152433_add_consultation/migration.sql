-- CreateEnum
CREATE TYPE "Species" AS ENUM ('perro', 'gato', 'ave', 'conejo', 'reptil');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('ABIERTA', 'EN_TRATAMIENTO', 'CERRADA');

-- CreateTable
CREATE TABLE "Consultation" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "petName" TEXT NOT NULL,
    "species" "Species" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'ABIERTA',
    "userId" INTEGER NOT NULL,
    "treatmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Consultation_treatmentId_idx" ON "Consultation"("treatmentId");

-- CreateIndex
CREATE INDEX "Consultation_userId_date_idx" ON "Consultation"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_userId_petName_date_key" ON "Consultation"("userId", "petName", "date");

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
