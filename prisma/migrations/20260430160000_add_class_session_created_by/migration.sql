-- ClassSession.createdById (nullable; existing rows keep null and become "unowned")
ALTER TABLE "ClassSession" ADD COLUMN "createdById" TEXT;

ALTER TABLE "ClassSession"
  ADD CONSTRAINT "ClassSession_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ClassSession_createdById_idx" ON "ClassSession"("createdById");
