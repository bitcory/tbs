-- AlterTable
ALTER TABLE "User" ADD COLUMN     "capsrtAccess" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DesktopToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "DesktopToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DesktopToken_token_key" ON "DesktopToken"("token");

-- CreateIndex
CREATE INDEX "DesktopToken_userId_idx" ON "DesktopToken"("userId");

-- AddForeignKey
ALTER TABLE "DesktopToken" ADD CONSTRAINT "DesktopToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
