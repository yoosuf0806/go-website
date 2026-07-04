-- 010_updated_at_trigger.sql
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();
