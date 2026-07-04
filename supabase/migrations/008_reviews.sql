-- 008_reviews.sql
-- Google reviews are curated manually by admin (no API sync in v1).
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  author text not null,
  rating int not null check (rating between 1 and 5),
  body text not null,
  source text not null default 'google',
  is_featured boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
