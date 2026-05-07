-- ============================================================
-- wheels.com.pk — Migration 002: Forum, Videos, Referrals extras
-- ============================================================

-- ── Forum Posts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    tags JSONB DEFAULT '[]',
    is_pinned BOOLEAN DEFAULT false,
    is_official BOOLEAN DEFAULT false,
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_forum_posts_category ON forum_posts(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_forum_posts_created ON forum_posts(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_forum_posts_pinned ON forum_posts(is_pinned DESC, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_forum_posts_fts ON forum_posts USING gin(to_tsvector('english', title || ' ' || body));

-- ── Forum Replies ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_forum_replies_post ON forum_replies(post_id, created_at ASC) WHERE deleted_at IS NULL;

-- ── Forum Likes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_likes (
    post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- ── Seed forum posts ──────────────────────────────────────────
INSERT INTO forum_posts (id, author_id, title, body, category, tags, is_pinned, is_official, likes_count, replies_count, view_count)
VALUES
(
  'f0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Welcome to the wheels.com.pk Community Forum!',
  'Welcome to Pakistan''s most active automotive community! Ask questions, share reviews, get buying advice, and connect with other car enthusiasts across Pakistan. Our community guidelines: be respectful, no spam, honest reviews only.',
  'general',
  '["Welcome", "Community", "Guidelines"]',
  true, true, 312, 28, 15234
),
(
  'f0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  'Toyota Corolla vs Honda Civic 2024 — Which to Buy Under 75 Lac?',
  'I''m deciding between a 2022 Corolla Altis Grande and 2021 Civic Oriel. Both around PKR 70-75 lac in Lahore. I drive 80km daily Lahore-Sheikhupura. Need real owner feedback on fuel average, maintenance costs, and overall reliability.',
  'buying',
  '["Toyota", "Honda", "Comparison", "Lahore"]',
  false, false, 134, 47, 2341
),
(
  'f0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Hyundai Ioniq 5 Coming to Pakistan — Everything We Know',
  'Hyundai Nishat has officially confirmed the Ioniq 5 EV will launch in Pakistan. Expected price range: PKR 1.8-2.2 Crore. Features: 800V charging, 450km range, V2L (vehicle-to-load) capability. Pre-bookings expected Q2 2025.',
  'news',
  '["Hyundai", "EV", "Ioniq5", "Pakistan", "Electric"]',
  false, true, 312, 89, 28900
),
(
  'f0000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000004',
  'Complete Guide: Importing a Used Car from Japan to Pakistan (2024)',
  'I just completed importing a 2020 Prius from Japan. Here is the complete cost breakdown and process. FOB: $14,500. Import duty: PKR 8.2 Lac. Freight + insurance: PKR 85k. Clearing agent: PKR 45k. Registration: PKR 18k. Total landed: PKR ~50 Lac. Happy to answer any questions!',
  'importing',
  '["Import", "Japan", "Duty", "Prius", "Guide"]',
  false, false, 445, 156, 28900
);

-- ── Updated trigger ───────────────────────────────────────────
CREATE TRIGGER update_forum_posts_updated_at BEFORE UPDATE ON forum_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
