-- 019_products_corporate.sql
-- Flag a product as available as a corporate/wedding quote flavour. The
-- corporate page's flavour picker lists products where is_corporate = true,
-- using each product's own cover image. Toggled from the admin product form
-- (same pattern as is_hot_pick from migration 015).
alter table products
  add column if not exists is_corporate boolean not null default false;
