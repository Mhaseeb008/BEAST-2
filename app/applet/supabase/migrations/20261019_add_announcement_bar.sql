-- Supabase / PostgreSQL Migration
-- Migration: Add Announcement Bar Setting to BeastMC Network site_settings
-- Generated: 2026-10-19

ALTER TABLE IF EXISTS "site_settings"
ADD COLUMN IF NOT EXISTS "announcement_text" TEXT DEFAULT 'BeastMC Season 4 • 24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted',
ADD COLUMN IF NOT EXISTS "announcement_enabled" INTEGER DEFAULT 1;

-- If a row already exists with id = 1, initialize values if null
UPDATE "site_settings"
SET
  announcement_text = COALESCE(announcement_text, 'BeastMC Season 4 • 24h Order Delivery Guaranteed • Manual Bank & Crypto Accepted'),
  announcement_enabled = COALESCE(announcement_enabled, 1)
WHERE id = 1;
