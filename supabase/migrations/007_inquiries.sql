-- 007_inquiries.sql
create type inquiry_status as enum ('new','contacted','quoted','converted','closed');
create type inquiry_category as enum ('corporate','wedding');

create table inquiries (
  id uuid primary key default uuid_generate_v4(),
  category inquiry_category not null,
  status inquiry_status not null default 'new',
  name text not null,
  phone text not null,
  email text,
  event_date date,
  guest_count int,
  message text,
  converted_order_id uuid references orders(id),
  created_at timestamptz not null default now()
);
