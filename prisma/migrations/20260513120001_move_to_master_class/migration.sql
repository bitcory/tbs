-- Relocate PRO slots into the new MASTER class and re-index PRO inside itself.
--
-- Mapping changes:
--   (PRO, 2) 광고영상      → (MASTER, 1)
--   (PRO, 4) 프리프로덕션  → (MASTER, 2)
--   (PRO, 3) 유튜브 수익화 → (PRO, 2)  -- (이름은 "유튜브 창작과정"으로 변경됨, 라벨은 코드에서 처리)
--
-- Order matters because PricingConfig has UNIQUE(classType, stepLevel):
-- we vacate (PRO, 2) and (PRO, 4) first, then move (PRO, 3) into the
-- now-empty (PRO, 2) slot.

-- Step 1: 광고영상 (PRO, 2) → (MASTER, 1)
UPDATE "PricingConfig"
   SET "classType" = 'MASTER', "stepLevel" = 1
 WHERE "classType" = 'PRO' AND "stepLevel" = 2;

UPDATE "ClassSession"
   SET "classType" = 'MASTER', "stepLevel" = 1
 WHERE "classType" = 'PRO' AND "stepLevel" = 2;

-- Step 2: 프리프로덕션 (PRO, 4) → (MASTER, 2)
UPDATE "PricingConfig"
   SET "classType" = 'MASTER', "stepLevel" = 2
 WHERE "classType" = 'PRO' AND "stepLevel" = 4;

UPDATE "ClassSession"
   SET "classType" = 'MASTER', "stepLevel" = 2
 WHERE "classType" = 'PRO' AND "stepLevel" = 4;

-- Step 3: 유튜브 수익화/창작과정 (PRO, 3) → (PRO, 2)
UPDATE "PricingConfig"
   SET "stepLevel" = 2
 WHERE "classType" = 'PRO' AND "stepLevel" = 3;

UPDATE "ClassSession"
   SET "stepLevel" = 2
 WHERE "classType" = 'PRO' AND "stepLevel" = 3;
