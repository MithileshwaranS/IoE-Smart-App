-- Marketplace Listings Table
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  crop_name TEXT NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold_out')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT price_positive CHECK (price_per_unit > 0),
  CONSTRAINT quantity_non_negative CHECK (quantity >= 0)
);

-- Marketplace Transactions Table
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  crop_name TEXT NOT NULL,
  farmer_name TEXT NOT NULL,
  farmer_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quantity_positive CHECK (quantity > 0),
  CONSTRAINT total_price_positive CHECK (total_price > 0)
);

-- Create indexes for better performance
CREATE INDEX idx_marketplace_listings_farmer_id ON marketplace_listings(farmer_id);
CREATE INDEX idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX idx_marketplace_listings_created_at ON marketplace_listings(created_at DESC);
CREATE INDEX idx_marketplace_transactions_buyer_id ON marketplace_transactions(buyer_id);
CREATE INDEX idx_marketplace_transactions_listing_id ON marketplace_transactions(listing_id);
CREATE INDEX idx_marketplace_transactions_created_at ON marketplace_transactions(created_at DESC);

-- Disable Row Level Security (RLS) for easier access
ALTER TABLE marketplace_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions DISABLE ROW LEVEL SECURITY;
