-- 009_settings.sql
-- Single-row key/value settings, JSON values.
create table site_settings (
  key text primary key,
  value jsonb not null
);
insert into site_settings (key, value) values
  ('banner', '{"enabled": false, "text": "", "starts_at": null, "ends_at": null}'),
  ('features', '{"corporate_section": true, "wedding_section": true, "reviews_section": true}'),
  ('business', '{"whatsapp_number": "", "google_business_url": ""}');
