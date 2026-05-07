-- ============================================================
-- wheels.com.pk — Seed Data (Development & Staging)
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ── Test Users ────────────────────────────────────────────────

INSERT INTO users (id, phone, email, full_name, username, role, city, phone_verified, email_verified, trust_score, referral_code) VALUES
-- Super Admin
('00000000-0000-0000-0000-000000000001', '+923001111111', 'admin@wheels.com.pk',
 'Super Admin', 'superadmin', 'admin', 'Lahore', true, true, 100, 'ADMIN001'),

-- Moderator
('00000000-0000-0000-0000-000000000002', '+923002222222', 'mod@wheels.com.pk',
 'Content Mod', 'contentmod', 'moderator', 'Karachi', true, true, 95, 'MOD0001'),

-- Verified Individual Seller (Lahore)
('00000000-0000-0000-0000-000000000003', '+923009876543', 'ahmed.raza@gmail.com',
 'Ahmed Raza', 'ahmedraza_lhe', 'seller', 'Lahore', true, true, 82, 'AHMED03'),

-- Verified Individual Seller (Karachi)
('00000000-0000-0000-0000-000000000004', '+923331234567', 'bilal.hassan@gmail.com',
 'Bilal Hassan', 'bilalhassan_khi', 'seller', 'Karachi', true, false, 71, 'BILAL04'),

-- Buyer account
('00000000-0000-0000-0000-000000000005', '+923215556666', 'sara.khan@yahoo.com',
 'Sara Khan', 'sarakhan', 'buyer', 'Islamabad', true, true, 65, 'SARA005'),

-- Unverified user (for testing fraud detection)
('00000000-0000-0000-0000-000000000006', '+923447778888', NULL,
 'Test Seller', 'testseller06', 'seller', 'Rawalpindi', true, false, 40, 'TEST006');

-- ── Test Dealers ──────────────────────────────────────────────

-- Dealer user accounts
INSERT INTO users (id, phone, email, full_name, username, role, city, phone_verified, trust_score, referral_code) VALUES
('00000000-0000-0000-0000-000000000010', '+922131234567', 'automax@gmail.com',
 'AutoMax Karachi', 'automax_khi', 'dealer', 'Karachi', true, 95, 'DEALER10'),
('00000000-0000-0000-0000-000000000011', '+924235678901', 'premiermotors@gmail.com',
 'Premier Motors Lahore', 'premiermotors', 'dealer', 'Lahore', true, 92, 'DEALER11'),
('00000000-0000-0000-0000-000000000012', '+925198765432', 'capsimport@gmail.com',
 'CAPS Import Islamabad', 'capsimport', 'dealer', 'Islamabad', true, 88, 'DEALER12');

-- Dealer profiles
INSERT INTO dealers (user_id, business_name, slug, description, city, address, phone, whatsapp, is_verified, is_featured, subscription_tier) VALUES
('00000000-0000-0000-0000-000000000010',
 'AutoMax Karachi', 'automax-karachi',
 'Karachi''s largest certified pre-owned dealership with 20+ years experience. Specializing in Japanese and Korean vehicles.',
 'Karachi', 'Plot 45, Shahrah-e-Faisal, Karachi', '+922131234567', '+922131234567',
 true, true, 'professional'),

('00000000-0000-0000-0000-000000000011',
 'Premier Motors Lahore', 'premier-motors-lahore',
 'Premium cars for discerning buyers. Honda, Toyota, Hyundai authorized reseller.',
 'Lahore', '23-B, MM Alam Road, Gulberg III, Lahore', '+924235678901', '+924235678901',
 true, false, 'basic'),

('00000000-0000-0000-0000-000000000012',
 'CAPS Import Islamabad', 'caps-import-islamabad',
 'Imported luxury vehicles. BMW, Mercedes, Audi specialists. Documentation & clearance assistance.',
 'Islamabad', 'Plot 7, Blue Area, Islamabad', '+925198765432', '+925198765432',
 true, false, 'professional');

-- ── Sample Vehicle Listings ───────────────────────────────────

INSERT INTO vehicles (
  id, seller_id, dealer_id, vehicle_type, status, title, make, model, variant, year,
  color, body_type, fuel_type, transmission, assembly, condition_type,
  engine_capacity, mileage, registered_city, price, price_negotiable,
  city, features, view_count, contact_count, favorite_count,
  inspection_badge, fraud_risk_score, is_featured, published_at
) VALUES

-- 1. Featured Toyota Corolla
('10000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000003', NULL,
 'car', 'active',
 '2022 Toyota Corolla Altis X 1.6 CVT - Full Option | Lahore Registered',
 'Toyota', 'Corolla', 'Altis X 1.6 CVT', 2022,
 'Pearl White', 'sedan', 'petrol', 'cvt', 'local', 'used',
 1600, 18000, 'Lahore', 6500000, true,
 'Lahore',
 '["Android Auto", "Apple CarPlay", "Leather Seats", "Sunroof", "Cruise Control", "Parking Sensors", "Keyless Entry", "Push Start", "7\" Touchscreen", "Reverse Camera"]',
 847, 23, 45, true, 8, true,
 NOW() - INTERVAL '3 days'),

-- 2. Honda Civic (Dealer listing)
('10000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0000-000000000010',
 (SELECT id FROM dealers WHERE slug = 'automax-karachi'),
 'car', 'active',
 '2021 Honda Civic Oriel 1.8 i-VTEC CVT | Single Owner | Karachi',
 'Honda', 'Civic', 'Oriel 1.8 i-VTEC', 2021,
 'Lunar Silver Metallic', 'sedan', 'petrol', 'cvt', 'local', 'used',
 1800, 32000, 'Karachi', 7200000, false,
 'Karachi',
 '["Honda Sensing", "Push Start", "LED Headlights", "7\" Display Audio", "Rear AC Vents", "Alloy Wheels", "Fog Lights", "Bluetooth"]',
 1203, 67, 89, true, 5, false,
 NOW() - INTERVAL '1 day'),

-- 3. Suzuki Alto new
('10000000-0000-0000-0000-000000000003',
 '00000000-0000-0000-0000-000000000004', NULL,
 'car', 'active',
 '2023 Suzuki Alto VXR AGS - Only 8000km | First Owner | Islamabad',
 'Suzuki', 'Alto', 'VXR AGS', 2023,
 'Burning Red', 'hatchback', 'petrol', 'automatic', 'local', 'used',
 660, 8000, 'Islamabad', 2950000, true,
 'Islamabad',
 '["AGS Auto Gear Shift", "Keyless Entry", "Alloy Wheels", "Fog Lights", "Rear Spoiler"]',
 412, 18, 22, false, 12, false,
 NOW() - INTERVAL '5 hours'),

-- 4. Hyundai Tucson
('10000000-0000-0000-0000-000000000004',
 '00000000-0000-0000-0000-000000000011',
 (SELECT id FROM dealers WHERE slug = 'premier-motors-lahore'),
 'car', 'active',
 '2022 Hyundai Tucson AWD Ultimate - Panoramic Roof | All Options',
 'Hyundai', 'Tucson', 'AWD Ultimate', 2022,
 'Phantom Black Pearl', 'suv', 'petrol', 'automatic', 'local', 'used',
 2000, 22000, 'Lahore', 11800000, false,
 'Lahore',
 '["BOSE Sound System", "Panoramic Sunroof", "360° Camera", "Ventilated Seats", "Heated Steering", "Wireless Charging", "HUD", "ADAS", "Lane Keep Assist", "Blind Spot Monitor"]',
 2341, 89, 156, true, 3, true,
 NOW() - INTERVAL '2 days'),

-- 5. KIA Sportage
('10000000-0000-0000-0000-000000000005',
 '00000000-0000-0000-0000-000000000003', NULL,
 'car', 'active',
 '2021 KIA Sportage FWD Alpha | 1 Year Warranty Remaining | Lahore',
 'KIA', 'Sportage', 'FWD Alpha', 2021,
 'Snow White Pearl', 'suv', 'petrol', 'automatic', 'local', 'used',
 2000, 41000, 'Lahore', 8200000, true,
 'Lahore',
 '["10.25\" Infotainment", "360° Camera", "Wireless Charging", "Heated Seats", "Push Start", "Smart Key", "Blind Spot Monitor"]',
 567, 34, 41, false, 10, false,
 NOW() - INTERVAL '4 days'),

-- 6. Toyota Yaris (budget segment)
('10000000-0000-0000-0000-000000000006',
 '00000000-0000-0000-0000-000000000004', NULL,
 'car', 'active',
 '2020 Toyota Yaris ATIV CVT - Well Maintained | Karachi',
 'Toyota', 'Yaris', 'ATIV CVT', 2020,
 'Silver Metallic', 'sedan', 'petrol', 'cvt', 'local', 'used',
 1300, 55000, 'Karachi', 3200000, true,
 'Karachi',
 '["Reverse Camera", "Keyless Entry", "Alloy Wheels", "7\" Display"]',
 234, 12, 18, false, 15, false,
 NOW() - INTERVAL '1 week'),

-- 7. Honda CD 70 Bike
('10000000-0000-0000-0000-000000000007',
 '00000000-0000-0000-0000-000000000005', NULL,
 'bike', 'active',
 '2023 Honda CD 70 - Brand New Condition | 3000km Only | Lahore',
 'Honda', 'CD 70', 'Standard', 2023,
 'Black', NULL, 'petrol', 'manual', 'local', 'used',
 70, 3000, 'Lahore', 185000, true,
 'Lahore', '[]',
 89, 7, 5, false, 5, false,
 NOW() - INTERVAL '2 days'),

-- 8. Imported BMW (CAPS dealer)
('10000000-0000-0000-0000-000000000008',
 '00000000-0000-0000-0000-000000000012',
 (SELECT id FROM dealers WHERE slug = 'caps-import-islamabad'),
 'car', 'active',
 '2020 BMW 3 Series 320i M-Sport Package | Imported | Islamabad',
 'BMW', '3 Series', '320i M-Sport', 2020,
 'Alpine White', 'sedan', 'petrol', 'automatic', 'imported', 'used',
 2000, 38000, 'Islamabad', 12800000, true,
 'Islamabad',
 '["M-Sport Body Kit", "Digital Cockpit", "Harman Kardon Audio", "Parking Assistant", "Adaptive LED", "Gesture Control", "Wireless Charging"]',
 892, 41, 67, true, 7, false,
 NOW() - INTERVAL '3 days'),

-- 9. Pending listing (awaiting moderation)
('10000000-0000-0000-0000-000000000009',
 '00000000-0000-0000-0000-000000000006', NULL,
 'car', 'pending',
 '2019 Suzuki Mehran VXR - Cheap Price | Faisalabad',
 'Suzuki', 'Mehran', 'VXR', 2019,
 'White', 'hatchback', 'petrol', 'manual', 'local', 'used',
 800, 78000, 'Faisalabad', 750000, true,
 'Faisalabad', '[]',
 0, 0, 0, false, 45, false, NULL);

-- ── Sample Vehicle Images ─────────────────────────────────────

INSERT INTO vehicle_images (vehicle_id, url, thumbnail_url, order_index, is_primary) VALUES
('10000000-0000-0000-0000-000000000001',
 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=1200&q=85',
 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&q=70',
 0, true),
('10000000-0000-0000-0000-000000000001',
 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200&q=85',
 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&q=70',
 1, false),
('10000000-0000-0000-0000-000000000002',
 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=1200&q=85',
 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&q=70',
 0, true),
('10000000-0000-0000-0000-000000000004',
 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=85',
 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&q=70',
 0, true),
('10000000-0000-0000-0000-000000000008',
 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=85',
 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&q=70',
 0, true);

-- ── Sample Auction ────────────────────────────────────────────

INSERT INTO auctions (
  id, vehicle_id, seller_id, status,
  start_price, reserve_price, current_price, bid_increment,
  starts_at, ends_at, total_bids, fee_percentage
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000012',
  'live',
  12000000, 12500000, 12800000, 100000,
  NOW() - INTERVAL '2 hours',
  NOW() + INTERVAL '2 hours',
  7, 2.50
);

-- Sample bids for the auction
INSERT INTO bids (auction_id, bidder_id, amount, is_winning) VALUES
('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 12800000, true),
('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 12600000, false),
('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 12400000, false),
('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 12200000, false),
('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 12100000, false);

-- ── Sample Saved Searches ─────────────────────────────────────

INSERT INTO saved_searches (user_id, name, filters, alert_enabled, alert_frequency) VALUES
('00000000-0000-0000-0000-000000000005',
 'Corolla under 70 Lac in Lahore',
 '{"make": "Toyota", "model": "Corolla", "city": "Lahore", "max_price": 7000000}',
 true, 'daily'),
('00000000-0000-0000-0000-000000000005',
 'Honda Civic 2020-2022',
 '{"make": "Honda", "model": "Civic", "min_year": 2020, "max_year": 2022}',
 true, 'instant');

-- ── Sample Blog Posts ─────────────────────────────────────────

INSERT INTO blog_posts (author_id, title, slug, excerpt, content, category, is_published, is_featured, view_count, published_at) VALUES
('00000000-0000-0000-0000-000000000001',
 'Top 5 Most Reliable Cars in Pakistan 2024',
 'top-5-reliable-cars-pakistan-2024',
 'Looking for a dependable daily driver? We''ve analyzed 50,000+ listings to find the most reliable cars available in Pakistan.',
 'Full article content here...',
 'buying-guide', true, true, 12450,
 NOW() - INTERVAL '1 week'),
('00000000-0000-0000-0000-000000000001',
 'How to Avoid Car Fraud in Pakistan',
 'avoid-car-fraud-pakistan',
 'Our AI fraud detection catches thousands of suspicious listings. Here''s what to watch out for when buying a used car.',
 'Full article content here...',
 'safety', true, false, 8920,
 NOW() - INTERVAL '3 days');

-- ── Price Trends ──────────────────────────────────────────────

INSERT INTO price_trends (make, model, variant, year, avg_price, min_price, max_price, sample_count, recorded_at) VALUES
('Toyota', 'Corolla', 'Altis X', 2022, 6250000, 5800000, 7000000, 47, CURRENT_DATE),
('Toyota', 'Corolla', 'Altis X', 2021, 5600000, 5200000, 6200000, 38, CURRENT_DATE),
('Honda', 'Civic', 'Oriel', 2022, 7400000, 6900000, 8000000, 29, CURRENT_DATE),
('Honda', 'Civic', 'Oriel', 2021, 6900000, 6400000, 7500000, 33, CURRENT_DATE),
('Suzuki', 'Alto', 'VXR AGS', 2023, 3050000, 2900000, 3200000, 52, CURRENT_DATE),
('Hyundai', 'Tucson', 'AWD Ultimate', 2022, 11900000, 11200000, 12800000, 18, CURRENT_DATE),
('KIA', 'Sportage', 'FWD Alpha', 2022, 9200000, 8700000, 9800000, 21, CURRENT_DATE);

-- ── Vehicle Makes with logos ──────────────────────────────────

UPDATE vehicle_makes SET logo_url = 'https://cdn.wheels.com.pk/makes/toyota.png', is_popular = true WHERE name = 'Toyota';
UPDATE vehicle_makes SET logo_url = 'https://cdn.wheels.com.pk/makes/honda.png', is_popular = true WHERE name = 'Honda';
UPDATE vehicle_makes SET logo_url = 'https://cdn.wheels.com.pk/makes/suzuki.png', is_popular = true WHERE name = 'Suzuki';
UPDATE vehicle_makes SET logo_url = 'https://cdn.wheels.com.pk/makes/hyundai.png', is_popular = true WHERE name = 'Hyundai';
UPDATE vehicle_makes SET logo_url = 'https://cdn.wheels.com.pk/makes/kia.png', is_popular = true WHERE name = 'KIA';

-- ── Test Account Reference ────────────────────────────────────
-- ┌─────────────────────────────────────────────────────────────┐
-- │  TEST ACCOUNTS (development only)                           │
-- │                                                             │
-- │  Admin:        +923001111111  (any 6-digit OTP in dev)      │
-- │  Seller:       +923009876543  (Ahmed Raza, Lahore)          │
-- │  Seller 2:     +923331234567  (Bilal Hassan, Karachi)       │
-- │  Buyer:        +923215556666  (Sara Khan, Islamabad)        │
-- │  Dealer:       +922131234567  (AutoMax Karachi)             │
-- │  Unverified:   +923447778888  (Test Seller)                 │
-- │                                                             │
-- │  In development, OTP is logged to console instead of SMS.  │
-- └─────────────────────────────────────────────────────────────┘

SELECT 'Seed data loaded successfully.' AS status,
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM vehicles) AS vehicles,
       (SELECT COUNT(*) FROM dealers) AS dealers,
       (SELECT COUNT(*) FROM auctions) AS auctions;
