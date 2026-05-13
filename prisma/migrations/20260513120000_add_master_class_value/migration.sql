-- Add MASTER value to ClassType enum.
-- Must run in its own migration: PostgreSQL forbids using a newly-added enum
-- value inside the same transaction it was added in.
ALTER TYPE "ClassType" ADD VALUE IF NOT EXISTS 'MASTER';
