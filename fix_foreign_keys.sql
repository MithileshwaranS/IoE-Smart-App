-- Fix foreign key constraints to reference the correct users table

-- Drop existing foreign key constraints
ALTER TABLE marketplace_listings 
  DROP CONSTRAINT IF EXISTS marketplace_listings_farmer_id_fkey;

ALTER TABLE marketplace_transactions 
  DROP CONSTRAINT IF EXISTS marketplace_transactions_buyer_id_fkey;

-- Add new foreign key constraints referencing users table (not auth.users)
ALTER TABLE marketplace_listings 
  ADD CONSTRAINT marketplace_listings_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE marketplace_transactions 
  ADD CONSTRAINT marketplace_transactions_buyer_id_fkey 
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE;

-- Verify the constraints
SELECT
    tc.table_name, 
    tc.constraint_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('marketplace_listings', 'marketplace_transactions')
  AND tc.constraint_type = 'FOREIGN KEY';
