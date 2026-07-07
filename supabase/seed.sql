-- seed.sql — demo data for a fresh Supabase project.
-- packages, delivery_tiers, and site_settings are already seeded by their
-- migrations (003, 005, 009). This file adds demo categories, products, addon
-- rows, and featured reviews. Mirrors scripts/seed-data.ts (same ids/prices).
-- Apply after migrations:  supabase db reset  (or run in the SQL editor).

-- ── categories ────────────────────────────────────────────────────────────────
insert into categories (id, name, slug, is_visible, sort_order) values
  ('11111111-1111-4111-8111-111111111111', 'Classic Brownies', 'classic', true, 1),
  ('22222222-2222-4222-8222-222222222222', 'Premium Brownies', 'premium', true, 2);

-- ── products ──────────────────────────────────────────────────────────────────
insert into products
  (id, category_id, name, slug, description, price_per_piece, image_url,
   is_visible, in_stock, stock_qty, is_slab_available, allows_letter_topper, sort_order)
values
  ('a1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
   'Naked Brownie', 'naked-brownie',
   'Our signature fudgy classic — rich, dense, and unadorned.',
   150, null, true, true, null, true, true, 1),
  ('a2222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
   'Walnut Fudge', 'walnut-fudge',
   'Classic brownie loaded with toasted walnuts.',
   170, null, true, true, null, false, false, 2),
  ('a3333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222',
   'Cashew Brownie', 'cashew-brownie',
   'Buttery Sri Lankan cashews over a dark-chocolate base.',
   190, null, true, true, 40, true, true, 3),
  ('a4444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222',
   'Triple Chocolate', 'triple-chocolate',
   'Dark, milk, and white chocolate in every bite.',
   210, null, true, true, null, true, true, 4),
  ('a5555555-5555-4555-8555-555555555555', '22222222-2222-4222-8222-222222222222',
   'Salted Caramel', 'salted-caramel',
   'Molten salted-caramel swirl on a fudge brownie.',
   200, null, true, false, null, true, true, 5);

-- ── addons ────────────────────────────────────────────────────────────────────
insert into addons (id, label, price, is_enabled, config) values
  ('letter_topper', 'Letter Topper', 350, true,
   '{"lines": 3, "max_chars_per_line": 5, "slab_only": true}'::jsonb),
  ('gift_message', 'Gift Message', 100, true,
   '{"max_chars": 100}'::jsonb),
  ('gift_ribbon', 'Gift Ribbon', 150, true,
   '{"colors": ["Red", "Gold", "Pink", "White"]}'::jsonb);

-- ── reviews (featured Google reviews, curated manually) ────────────────────────
insert into reviews (id, author, rating, body, source, is_featured, is_hidden) values
  ('c1111111-1111-4111-8111-111111111111', 'Nadeesha P.', 5,
   'The fudgiest brownies in Colombo. The slab with the letter topper made my daughter''s birthday!',
   'google', true, false),
  ('c2222222-2222-4222-8222-222222222222', 'Roshan M.', 5,
   'Ordered a corporate box of 15 — delivered on time and everyone raved. Highly recommend.',
   'google', true, false),
  ('c3333333-3333-4333-8333-333333333333', 'Ayesha F.', 4,
   'Cashew brownie is divine. Will order again for our next event.',
   'google', true, false);

-- Update business settings with the demo WhatsApp number / Google Business URL.
update site_settings
   set value = '{"whatsapp_number": "94771234567", "google_business_url": "https://g.page/golden-oven"}'::jsonb
 where key = 'business';
