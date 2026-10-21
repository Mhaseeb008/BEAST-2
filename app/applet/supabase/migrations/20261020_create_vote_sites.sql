-- ==============================================================================
-- Supabase / PostgreSQL Migration: Create vote_sites table with RLS Policies
-- Target: BeastMC Network Minecraft Voting Directory
-- Date: 2026-10-20
-- ==============================================================================

-- 1. Create vote_sites table
CREATE TABLE IF NOT EXISTS "vote_sites" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "description" TEXT DEFAULT '',
  "reward_text" TEXT DEFAULT 'Vote to receive in-game Beast Coins and Crate Keys!',
  "icon_url" TEXT DEFAULT '',
  "sort_order" INTEGER DEFAULT 0,
  "is_active" INTEGER DEFAULT 1,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create index on sort_order and is_active for high-speed public queries
CREATE INDEX IF NOT EXISTS "idx_vote_sites_active_sort" ON "vote_sites" ("is_active", "sort_order");

-- 3. Enable Row Level Security (RLS)
ALTER TABLE "vote_sites" ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Public can view active voting links
DROP POLICY IF EXISTS "Public can view active vote sites" ON "vote_sites";
CREATE POLICY "Public can view active vote sites"
ON "vote_sites"
FOR SELECT
USING ("is_active" = 1);

-- 5. Policy: Authorized Admins & Staff can view all voting sites (including disabled)
DROP POLICY IF EXISTS "Staff can view all vote sites" ON "vote_sites";
CREATE POLICY "Staff can view all vote sites"
ON "vote_sites"
FOR SELECT
USING (
  auth.role() = 'service_role' OR
  auth.jwt() ->> 'role' IN ('admin', 'owner')
);

-- 6. Policy: Only Authorized Admins can insert, update, or delete voting sites
DROP POLICY IF EXISTS "Admins can manage vote sites" ON "vote_sites";
CREATE POLICY "Admins can manage vote sites"
ON "vote_sites"
FOR ALL
USING (
  auth.role() = 'service_role' OR
  auth.jwt() ->> 'role' IN ('admin', 'owner')
)
WITH CHECK (
  auth.role() = 'service_role' OR
  auth.jwt() ->> 'role' IN ('admin', 'owner')
);
