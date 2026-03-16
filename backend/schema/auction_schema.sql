-- Auction Marketplace Schema
-- This schema supports crop auctions with real-time bidding
-- Future-ready: blockchain-agnostic design for smart contract integration

-- Auctions Table
CREATE TABLE IF NOT EXISTS auctions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID NOT NULL,
  crop_name VARCHAR(255) NOT NULL,
  crop_variety VARCHAR(255),
  crop_image_url VARCHAR(500),
  description TEXT,
  quantity NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(50) DEFAULT 'kg',
  base_price NUMERIC(12, 2) NOT NULL,
  current_price NUMERIC(12, 2) NOT NULL,
  highest_bidder_id UUID,
  status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENDED', 'SOLD', 'CANCELLED')),
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_prices CHECK (base_price > 0 AND current_price >= base_price),
  CONSTRAINT valid_times CHECK (end_time > start_time)
);

-- Bids Table
CREATE TABLE IF NOT EXISTS bids (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL,
  bid_amount NUMERIC(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'OUTBID', 'ACCEPTED', 'REJECTED')),
  bid_time TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_bid_amount CHECK (bid_amount > 0)
);

-- Auction Winners Table (for tracking accepted bids)
CREATE TABLE IF NOT EXISTS auction_settlements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID NOT NULL UNIQUE REFERENCES auctions(id) ON DELETE CASCADE,
  winning_bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  final_price NUMERIC(12, 2) NOT NULL,
  settlement_status VARCHAR(50) DEFAULT 'PENDING' CHECK (settlement_status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_settlements_seller_id ON auction_settlements(seller_id);
CREATE INDEX IF NOT EXISTS idx_settlements_buyer_id ON auction_settlements(buyer_id);

-- Trigger to update auction updated_at timestamp
CREATE OR REPLACE FUNCTION update_auction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auction_update_timestamp
BEFORE UPDATE ON auctions
FOR EACH ROW
EXECUTE FUNCTION update_auction_timestamp();

-- Trigger to update settlement timestamp
CREATE OR REPLACE FUNCTION update_settlement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settlement_update_timestamp
BEFORE UPDATE ON auction_settlements
FOR EACH ROW
EXECUTE FUNCTION update_settlement_timestamp();

-- Trigger to automatically mark auctions as ENDED when time expires
CREATE OR REPLACE FUNCTION check_auction_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time <= NOW() AND NEW.status = 'ACTIVE' THEN
    NEW.status = 'ENDED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auction_expiry_check
BEFORE UPDATE ON auctions
FOR EACH ROW
EXECUTE FUNCTION check_auction_expiry();

-- Trigger to prevent self-bidding (seller cannot bid on own auction)
CREATE OR REPLACE FUNCTION prevent_self_bidding()
RETURNS TRIGGER AS $$
DECLARE
  auction_seller_id UUID;
BEGIN
  SELECT seller_id INTO auction_seller_id FROM auctions WHERE id = NEW.auction_id;
  
  IF auction_seller_id = NEW.bidder_id THEN
    RAISE EXCEPTION 'Sellers cannot bid on their own auctions';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_self_bidding_trigger
BEFORE INSERT OR UPDATE ON bids
FOR EACH ROW
EXECUTE FUNCTION prevent_self_bidding();
