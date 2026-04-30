-- ClassSession.stepLevel
ALTER TABLE "ClassSession" ADD COLUMN "stepLevel" INTEGER NOT NULL DEFAULT 1;

-- PricingConfig.stepLevel + relax unique
DROP INDEX IF EXISTS "PricingConfig_classType_key";
ALTER TABLE "PricingConfig" ADD COLUMN "stepLevel" INTEGER NOT NULL DEFAULT 0;

-- Map existing rows so current default prices stay valid:
--  ZERO  -> stepLevel 0
--  UP    -> stepLevel 2 (existing 30,000원 stays as UP 2)
--  PRO   -> stepLevel 2 (existing 40,000원 stays as PRO 2)
UPDATE "PricingConfig" SET "stepLevel" = 0 WHERE "classType" = 'ZERO';
UPDATE "PricingConfig" SET "stepLevel" = 2 WHERE "classType" IN ('UP', 'PRO');

-- New unique constraint
CREATE UNIQUE INDEX "PricingConfig_classType_stepLevel_key"
  ON "PricingConfig"("classType", "stepLevel");
