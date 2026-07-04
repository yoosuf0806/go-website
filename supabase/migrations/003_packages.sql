-- 003_packages.sql
-- Packages are LOCKED business rules, seeded once, edited only by admin.
create table packages (
  id text primary key,             -- 'box-9' | 'box-12' | 'box-15' | 'slab-12'
  label text not null,             -- '9 Pieces', '12 Pieces', '15 Pieces', 'Brownie Slab (12 pcs)'
  piece_count int not null check (piece_count > 0),
  is_slab boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0
);
insert into packages (id, label, piece_count, is_slab, sort_order) values
  ('box-9',  '9 Pieces',              9,  false, 1),
  ('box-12', '12 Pieces',             12, false, 2),
  ('box-15', '15 Pieces',             15, false, 3),
  ('slab-12','Brownie Slab (12 pcs)', 12, true,  4);
