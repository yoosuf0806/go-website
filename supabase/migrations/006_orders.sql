-- 006_orders.sql
create type order_status as enum
  ('pending','confirmed','baking','ready','out_for_delivery','completed','cancelled');

create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_no serial unique,                    -- human-friendly, shown in WhatsApp msg
  status order_status not null default 'pending',
  customer_name text not null,
  phone text not null,
  address text,
  delivery_date date,
  note text,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null,
  total numeric(10,2) not null,
  total_pieces int not null,                 -- combined pieces, drives delivery tier
  source text not null default 'web',        -- 'web' | 'inquiry_conversion' | 'manual'
  inquiry_id uuid,                           -- set when converted from an inquiry
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,                -- denormalised snapshot
  package_id text not null references packages(id),
  package_label text not null,               -- snapshot
  piece_count int not null,
  box_qty int not null default 1 check (box_qty >= 1),
  unit_price numeric(10,2) not null,         -- price_per_piece snapshot (revenue side)
  unit_cost numeric(10,2),                   -- recipe cost-per-piece snapshot (COGS side);
                                             -- NULL until the business system's recipe tables
                                             -- exist. Filled by a DB trigger at insert time so
                                             -- historical profit stays correct even after a
                                             -- recipe is later edited. See "Cross-system contract".
  addons jsonb not null default '[]'::jsonb, -- [{id,label,price,detail:{lines|message|color}}]
  line_total numeric(10,2) not null
);
