-- When a session has no 보조강사, admin can flag it so the 보조강사 share (12%) is
-- redirected to 충당금 (making reserve effectively 32%). Off by default.
ALTER TABLE "ClassSession"
  ADD COLUMN "assistantToReserve" BOOLEAN NOT NULL DEFAULT false;
