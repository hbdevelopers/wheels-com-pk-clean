-- ============================================================
-- wheels.com.pk - Production Database Schema
-- PostgreSQL 15+
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'dealer', 'admin', 'moderator');
CREATE TYPE vehicle_type AS ENUM ('car', 'bike', 'auto_part', 'number_plate', 'truck', 'van');
CREATE TYPE listing_status AS ENUM ('draft', 'pending', 'active', 'sold', 'expired', 'rejected', 'boosted');
CREATE TYPE fuel_type AS ENUM ('petrol', 'diesel', 'hybrid', 'electric', 'cng', 'lpg');
CREATE TYPE transmission_type AS ENUM ('manual', 'automatic', 'semi_automatic', 'cvt');
CREATE TYPE body_type AS ENUM ('sedan', 'suv', 'hatchback', 'coupe', 'pickup', 'van', 'minivan', 'crossover', 'convertible', 'wagon');
CREATE TYPE assembly_type AS ENUM ('local', 'imported');
CREATE TYPE condition_type AS ENUM ('new', 'used', 'certified_used');
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn');
CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'professional', 'enterprise');
CREATE TYPE payment_method AS ENUM ('jazzcash', 'easypaisa', 'stripe', 'bank_transfer', 'cash');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE auction_status AS ENUM ('upcoming', 'live', 'ended', 'cancelled');
CREATE TYPE inspection_status AS ENUM ('requested', 'scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE report_status AS ENUM ('open', 'under_review', 'resolved', 'dismissed');
CREATE TYPE report_type AS ENUM ('fraud', 'spam', 'misleading', 'inappropriate', 'other');
CREATE TYPE notification_type AS ENUM ('message', 'offer', 'bid', 'price_drop', 'search_alert', 'system', 'promotion');
CREATE TYPE badge_type AS ENUM ('cnic_verified', 'phone_verified', 'email_verified', 'dealer_verified', 'inspection_passed');

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    google_id VARCHAR(255) UNIQUE,
    apple_id VARCHAR(255) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    role user_role DEFAULT 'buyer',
    city VARCHAR(100),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,
    cnic_number VARCHAR(20),
    cnic_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    trust_score INTEGER DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
    fraud_risk_score INTEGER DEFAULT 0 CHECK (fraud_risk_score BETWEEN 0 AND 100),
    total_listings INTEGER DEFAULT 0,
    total_sold INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    referral_code VARCHAR(20) UNIQUE DEFAULT UPPER(SUBSTRING(uuid_generate_v4()::text, 1, 8)),
    referred_by UUID REFERENCES users(id),
    last_active_at TIMESTAMPTZ,
    preferred_language VARCHAR(10) DEFAULT 'en',
    push_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_users_trust_score ON users(trust_score);
CREATE INDEX idx_users_referral_code ON users(referral_code);

-- ============================================================
-- USER BADGES
-- ============================================================

CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_type badge_type NOT NULL,
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB,
    UNIQUE(user_id, badge_type)
);

-- ============================================================
-- USER FOLLOWERS
-- ============================================================

CREATE TABLE user_follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- ============================================================
-- USER REVIEWS
-- ============================================================

CREATE TABLE user_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewed_id UUID NOT NULL REFERENCES users(id),
    listing_id UUID, -- linked after vehicles table creation
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEALERS
-- ============================================================

CREATE TABLE dealers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    business_name_urdu VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    cover_image_url TEXT,
    description TEXT,
    description_urdu TEXT,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    website VARCHAR(255),
    ntn_number VARCHAR(50),
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    subscription_tier subscription_tier DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    total_listings INTEGER DEFAULT 0,
    total_sold INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    monthly_leads INTEGER DEFAULT 0,
    crm_config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dealers_city ON dealers(city);
CREATE INDEX idx_dealers_slug ON dealers(slug);
CREATE INDEX idx_dealers_verified ON dealers(is_verified);

-- ============================================================
-- VEHICLES (MAIN LISTINGS TABLE)
-- ============================================================

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES users(id),
    dealer_id UUID REFERENCES dealers(id),
    vehicle_type vehicle_type NOT NULL DEFAULT 'car',
    status listing_status DEFAULT 'draft',

    -- Core details
    title VARCHAR(500) NOT NULL,
    title_urdu VARCHAR(500),
    description TEXT,
    description_urdu TEXT,

    -- Vehicle specs
    make VARCHAR(100) NOT NULL,        -- Toyota, Honda, Suzuki
    model VARCHAR(100) NOT NULL,       -- Corolla, Civic, Alto
    variant VARCHAR(100),              -- XLI, GLI, 1.3L
    year INTEGER NOT NULL,
    color VARCHAR(50),
    body_type body_type,
    fuel_type fuel_type,
    transmission transmission_type,
    assembly assembly_type,
    condition_type condition_type DEFAULT 'used',
    engine_capacity INTEGER,           -- in CC
    mileage INTEGER,                   -- in KM
    registered_city VARCHAR(100),
    registration_year INTEGER,
    vin VARCHAR(50),
    chassis_number VARCHAR(100),
    number_plate VARCHAR(20),

    -- Pricing
    price DECIMAL(15, 2) NOT NULL,
    price_negotiable BOOLEAN DEFAULT true,
    ai_estimated_price_min DECIMAL(15, 2),
    ai_estimated_price_max DECIMAL(15, 2),
    price_history JSONB DEFAULT '[]',  -- [{price, changed_at}]

    -- Location
    city VARCHAR(100) NOT NULL,
    area VARCHAR(100),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),

    -- Features (JSON array of feature strings)
    features JSONB DEFAULT '[]',

    -- Stats
    view_count INTEGER DEFAULT 0,
    contact_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,

    -- Boosting
    is_featured BOOLEAN DEFAULT false,
    is_boosted BOOLEAN DEFAULT false,
    boost_expires_at TIMESTAMPTZ,
    boost_package VARCHAR(50),

    -- Trust
    inspection_status inspection_status,
    inspection_badge BOOLEAN DEFAULT false,
    fraud_risk_score INTEGER DEFAULT 0,
    ai_fraud_flags JSONB DEFAULT '[]',

    -- Auction link
    auction_id UUID,

    -- Metadata
    ai_generated_title BOOLEAN DEFAULT false,
    ai_generated_description BOOLEAN DEFAULT false,
    ocr_data JSONB,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    sold_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_vehicles_seller ON vehicles(seller_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX idx_vehicles_city ON vehicles(city);
CREATE INDEX idx_vehicles_price ON vehicles(price);
CREATE INDEX idx_vehicles_year ON vehicles(year);
CREATE INDEX idx_vehicles_created ON vehicles(created_at DESC);
CREATE INDEX idx_vehicles_featured ON vehicles(is_featured, is_boosted);
CREATE INDEX idx_vehicles_search ON vehicles USING gin(to_tsvector('english', title || ' ' || make || ' ' || model || ' ' || COALESCE(variant, '')));

-- ============================================================
-- VEHICLE IMAGES
-- ============================================================

CREATE TABLE vehicle_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    cdn_key TEXT,
    order_index INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    is_ai_enhanced BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicle_images_vehicle ON vehicle_images(vehicle_id);

-- ============================================================
-- VEHICLE VIDEOS
-- ============================================================

CREATE TABLE vehicle_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    cdn_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUTO PARTS
-- ============================================================

CREATE TABLE auto_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    part_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    brand VARCHAR(100),
    condition_type condition_type DEFAULT 'used',
    compatible_makes JSONB DEFAULT '[]',   -- ["Toyota", "Honda"]
    compatible_models JSONB DEFAULT '[]',
    compatible_years JSONB DEFAULT '[]',   -- [2018, 2019, 2020]
    oem_part BOOLEAN DEFAULT false,
    warranty_months INTEGER DEFAULT 0
);

-- ============================================================
-- SAVED / FAVORITES
-- ============================================================

CREATE TABLE saved_listings (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, vehicle_id)
);

-- ============================================================
-- SAVED SEARCHES / ALERTS
-- ============================================================

CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    filters JSONB NOT NULL,   -- {make, model, min_price, max_price, city, ...}
    alert_enabled BOOLEAN DEFAULT true,
    alert_frequency VARCHAR(20) DEFAULT 'daily', -- instant, daily, weekly
    last_alerted_at TIMESTAMPTZ,
    result_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);

-- ============================================================
-- CHATS
-- ============================================================

CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    buyer_unread INTEGER DEFAULT 0,
    seller_unread INTEGER DEFAULT 0,
    is_archived_buyer BOOLEAN DEFAULT false,
    is_archived_seller BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chats_buyer ON chats(buyer_id);
CREATE INDEX idx_chats_seller ON chats(seller_id);
CREATE INDEX idx_chats_vehicle ON chats(vehicle_id);
CREATE INDEX idx_chats_last_message ON chats(last_message_at DESC);

-- ============================================================
-- MESSAGES
-- ============================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'text', -- text, image, voice, offer, system
    media_url TEXT,
    voice_duration INTEGER,  -- seconds
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_chat ON messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- ============================================================
-- OFFERS
-- ============================================================

CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    chat_id UUID REFERENCES chats(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    offered_price DECIMAL(15, 2) NOT NULL,
    counter_price DECIMAL(15, 2),
    status offer_status DEFAULT 'pending',
    message TEXT,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_vehicle ON offers(vehicle_id);
CREATE INDEX idx_offers_buyer ON offers(buyer_id);
CREATE INDEX idx_offers_seller ON offers(seller_id);
CREATE INDEX idx_offers_status ON offers(status);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dealer_id UUID REFERENCES dealers(id),
    user_id UUID REFERENCES users(id),
    tier subscription_tier NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PKR',
    features JSONB,              -- what's included
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    auto_renew BOOLEAN DEFAULT true,
    payment_method payment_method,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    reference_id UUID,              -- subscription_id, listing_id, etc
    reference_type VARCHAR(50),     -- subscription, boost, featured, auction
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PKR',
    payment_method payment_method NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    gateway_transaction_id VARCHAR(255),
    gateway_response JSONB,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(payment_status);

-- ============================================================
-- INSPECTIONS
-- ============================================================

CREATE TABLE inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    inspector_id UUID REFERENCES users(id),
    requester_id UUID NOT NULL REFERENCES users(id),
    status inspection_status DEFAULT 'requested',
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    location TEXT,
    report_url TEXT,
    score INTEGER CHECK (score BETWEEN 0 AND 100),
    findings JSONB,   -- {category, status, notes}[]
    fee DECIMAL(10, 2),
    commission_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REPORTS
-- ============================================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    reported_user_id UUID REFERENCES users(id),
    reported_vehicle_id UUID REFERENCES vehicles(id),
    report_type report_type NOT NULL,
    description TEXT NOT NULL,
    evidence_urls JSONB DEFAULT '[]',
    status report_status DEFAULT 'open',
    admin_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_vehicle ON reports(reported_vehicle_id);

-- ============================================================
-- BLOG / NEWS
-- ============================================================

CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    title_urdu VARCHAR(500),
    slug VARCHAR(500) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    content_urdu TEXT,
    cover_image_url TEXT,
    tags JSONB DEFAULT '[]',
    category VARCHAR(100),
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_urdu VARCHAR(255),
    body TEXT,
    body_urdu TEXT,
    data JSONB,
    deep_link TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    sent_push BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- AUCTIONS
-- ============================================================

CREATE TABLE auctions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    status auction_status DEFAULT 'upcoming',
    start_price DECIMAL(15, 2) NOT NULL,
    reserve_price DECIMAL(15, 2),
    current_price DECIMAL(15, 2),
    bid_increment DECIMAL(10, 2) DEFAULT 10000,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    winner_id UUID REFERENCES users(id),
    winning_bid DECIMAL(15, 2),
    total_bids INTEGER DEFAULT 0,
    total_watchers INTEGER DEFAULT 0,
    fee_percentage DECIMAL(4, 2) DEFAULT 2.50,
    is_instant_sell BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auctions_status ON auctions(status, ends_at);

-- ============================================================
-- BIDS
-- ============================================================

CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id UUID NOT NULL REFERENCES auctions(id),
    bidder_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15, 2) NOT NULL,
    is_auto_bid BOOLEAN DEFAULT false,
    max_auto_bid DECIMAL(15, 2),
    is_winning BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bids_auction ON bids(auction_id, created_at DESC);
CREATE INDEX idx_bids_bidder ON bids(bidder_id);

-- ============================================================
-- LEADS (Financing / Insurance / Mechanic)
-- ============================================================

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    vehicle_id UUID REFERENCES vehicles(id),
    lead_type VARCHAR(50) NOT NULL,   -- financing, insurance, mechanic, inspection
    provider VARCHAR(100),
    contact_name VARCHAR(255),
    contact_phone VARCHAR(20),
    amount_requested DECIMAL(15, 2),
    down_payment DECIMAL(15, 2),
    tenure_months INTEGER,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'new',
    assigned_to UUID REFERENCES users(id),
    commission_paid BOOLEAN DEFAULT false,
    commission_amount DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRICE TRENDS
-- ============================================================

CREATE TABLE price_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    variant VARCHAR(100),
    year INTEGER NOT NULL,
    avg_price DECIMAL(15, 2) NOT NULL,
    min_price DECIMAL(15, 2),
    max_price DECIMAL(15, 2),
    sample_count INTEGER,
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE(make, model, variant, year, recorded_at)
);

CREATE INDEX idx_price_trends_make_model ON price_trends(make, model, year);

-- ============================================================
-- REFERRALS
-- ============================================================

CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES users(id),
    referred_id UUID NOT NULL REFERENCES users(id),
    reward_amount DECIMAL(10, 2),
    reward_paid BOOLEAN DEFAULT false,
    reward_paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PUSH CAMPAIGNS
-- ============================================================

CREATE TABLE push_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    target_filters JSONB,   -- {city, role, last_active_days}
    deep_link TEXT,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    total_sent INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FOREIGN KEY UPDATES
-- ============================================================

ALTER TABLE user_reviews ADD CONSTRAINT fk_review_listing
    FOREIGN KEY (listing_id) REFERENCES vehicles(id);

ALTER TABLE vehicles ADD CONSTRAINT fk_vehicle_auction
    FOREIGN KEY (auction_id) REFERENCES auctions(id);

-- ============================================================
-- TRIGGERS: updated_at auto-update
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dealers_updated_at BEFORE UPDATE ON dealers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON auctions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED: Pakistan Cities
-- ============================================================

CREATE TABLE pakistan_cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_urdu VARCHAR(100),
    province VARCHAR(100),
    is_major BOOLEAN DEFAULT false
);

INSERT INTO pakistan_cities (name, name_urdu, province, is_major) VALUES
('Lahore', 'لاہور', 'Punjab', true),
('Karachi', 'کراچی', 'Sindh', true),
('Islamabad', 'اسلام آباد', 'Federal', true),
('Rawalpindi', 'راولپنڈی', 'Punjab', true),
('Faisalabad', 'فیصل آباد', 'Punjab', true),
('Multan', 'ملتان', 'Punjab', true),
('Gujranwala', 'گوجرانوالہ', 'Punjab', true),
('Peshawar', 'پشاور', 'KPK', true),
('Quetta', 'کوئٹہ', 'Balochistan', true),
('Sialkot', 'سیالکوٹ', 'Punjab', true),
('Hyderabad', 'حیدرآباد', 'Sindh', false),
('Bahawalpur', 'بہاولپور', 'Punjab', false),
('Sargodha', 'سرگودھا', 'Punjab', false),
('Abbottabad', 'ایبٹ آباد', 'KPK', false),
('Sukkur', 'سکھر', 'Sindh', false);

-- ============================================================
-- SEED: Popular Makes
-- ============================================================

CREATE TABLE vehicle_makes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    logo_url TEXT,
    country VARCHAR(100),
    is_popular BOOLEAN DEFAULT false
);

INSERT INTO vehicle_makes (name, country, is_popular) VALUES
('Toyota', 'Japan', true),
('Honda', 'Japan', true),
('Suzuki', 'Japan', true),
('Hyundai', 'South Korea', true),
('Kia', 'South Korea', true),
('Daihatsu', 'Japan', false),
('Mitsubishi', 'Japan', false),
('Nissan', 'Japan', false),
('BMW', 'Germany', false),
('Mercedes-Benz', 'Germany', false),
('Audi', 'Germany', false),
('MG', 'China', false),
('Chery', 'China', false),
('BAIC', 'China', false),
('Prince', 'Pakistan', false),
('Revo', 'Pakistan', false),
('United', 'Pakistan', false),
('Road Prince', 'Pakistan', false);
