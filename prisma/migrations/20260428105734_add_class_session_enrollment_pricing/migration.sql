-- CreateEnum
CREATE TYPE "ClassType" AS ENUM ('ZERO', 'UP', 'PRO');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('APPLIED', 'ATTENDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "classType" "ClassType" NOT NULL,
    "mainInstructorId" TEXT,
    "assistantInstructorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'APPLIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingConfig" (
    "id" TEXT NOT NULL,
    "classType" "ClassType" NOT NULL,
    "pricePerPerson" INTEGER NOT NULL,
    "toolbShare" DOUBLE PRECISION NOT NULL DEFAULT 0.50,
    "mainShare" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "assistantShare" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "PricingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassSession_startAt_idx" ON "ClassSession"("startAt");

-- CreateIndex
CREATE INDEX "ClassSession_mainInstructorId_idx" ON "ClassSession"("mainInstructorId");

-- CreateIndex
CREATE INDEX "ClassSession_assistantInstructorId_idx" ON "ClassSession"("assistantInstructorId");

-- CreateIndex
CREATE INDEX "Enrollment_userId_idx" ON "Enrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_sessionId_userId_key" ON "Enrollment"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingConfig_classType_key" ON "PricingConfig"("classType");

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_mainInstructorId_fkey" FOREIGN KEY ("mainInstructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_assistantInstructorId_fkey" FOREIGN KEY ("assistantInstructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
