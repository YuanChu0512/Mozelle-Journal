CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL DEFAULT 'article'
    CHECK (content_type IN ('article', 'lab', 'collection')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '电子',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  code TEXT NOT NULL DEFAULT 'EE / NEW',
  read_time TEXT NOT NULL DEFAULT '5 min',
  content_markdown TEXT NOT NULL DEFAULT '',
  cover_url TEXT,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'scheduled')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'article';

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS gallery JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_content_type_check'
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_content_type_check
      CHECK (content_type IN ('article', 'lab', 'collection'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS posts_status_published_idx
  ON posts (status, published_at DESC);

CREATE INDEX IF NOT EXISTS posts_updated_idx
  ON posts (updated_at DESC);

CREATE INDEX IF NOT EXISTS posts_type_published_idx
  ON posts (content_type, status, published_at DESC);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  public_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assets_created_idx
  ON assets (created_at DESC);

CREATE TABLE IF NOT EXISTS revisions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS revisions_post_created_idx
  ON revisions (post_id, created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_key TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_views (
  id BIGSERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
  path TEXT NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS page_views_visited_idx
  ON page_views (visited_at DESC);

CREATE INDEX IF NOT EXISTS page_views_ip_visited_idx
  ON page_views (ip_address, visited_at DESC);

CREATE INDEX IF NOT EXISTS page_views_path_visited_idx
  ON page_views (path, visited_at DESC);

CREATE TABLE IF NOT EXISTS ip_locations (
  ip_address INET PRIMARY KEY,
  country TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  location_label TEXT NOT NULL DEFAULT '未知地区',
  source TEXT NOT NULL DEFAULT 'lookup',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ip_locations_updated_idx
  ON ip_locations (updated_at DESC);
