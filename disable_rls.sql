-- Disable Row Level Security and drop all policies for marketplace tables

-- Drop all RLS policies for marketplace_listings
DROP POLICY IF EXISTS "Anyone can read available listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Farmers can create their own listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Farmers can update their own listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Farmers can delete their own listings" ON marketplace_listings;

-- Drop all RLS policies for marketplace_transactions
DROP POLICY IF EXISTS "Users can read their own transactions" ON marketplace_transactions;
DROP POLICY IF EXISTS "Any authenticated user can create transactions" ON marketplace_transactions;

-- Disable RLS on both tables
ALTER TABLE marketplace_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('marketplace_listings', 'marketplace_transactions');
