-- content.sql — adds the editable-content settings row (Content & SEO admin).
-- Run once in the Supabase SQL Editor if your project predates this feature.
-- Starts empty: the storefront renders built-in defaults until the admin saves,
-- and the admin's Content & SEO editor writes the full blob here on first save.
insert into site_settings (key, value)
values ('content', '{}'::jsonb)
on conflict (key) do nothing;
