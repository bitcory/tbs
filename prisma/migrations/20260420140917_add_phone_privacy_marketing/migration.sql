-- AlterTable
ALTER TABLE "User" ADD COLUMN     "marketingAgreedAt" TIMESTAMP(3),
ADD COLUMN     "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "privacyAgreedAt" TIMESTAMP(3);
