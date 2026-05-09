-- Add 충당금(reserve) share. Existing rows get 0 so their previous toolb/main/assistant
-- split (which already sums to 1.0) stays valid until an admin rebalances via the UI.
-- New rows created via Prisma get the @default(0.20) set in schema.prisma.

ALTER TABLE "PricingConfig"
  ADD COLUMN "reserveShare" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "PricingConfig"
  ALTER COLUMN "reserveShare" SET DEFAULT 0.20;

-- Update the legacy default split (toolb 0.50 / main 0.35 / assistant 0.15) to the new
-- recommended ratio (toolb 0.40 / main 0.28 / assistant 0.12 / reserve 0.20) ONLY for
-- rows that still hold the exact previous defaults. Custom-edited rows are left alone.
UPDATE "PricingConfig"
SET "toolbShare" = 0.40,
    "mainShare" = 0.28,
    "assistantShare" = 0.12,
    "reserveShare" = 0.20
WHERE ABS("toolbShare" - 0.50) < 0.0001
  AND ABS("mainShare" - 0.35) < 0.0001
  AND ABS("assistantShare" - 0.15) < 0.0001
  AND "reserveShare" = 0;

ALTER TABLE "PricingConfig"
  ALTER COLUMN "toolbShare" SET DEFAULT 0.40,
  ALTER COLUMN "mainShare" SET DEFAULT 0.28,
  ALTER COLUMN "assistantShare" SET DEFAULT 0.12;
