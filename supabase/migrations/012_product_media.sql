-- 012_product_media.sql
-- Adds multi-image/video gallery support to products.
--
-- `media` is an ordered JSON array of { "url": text, "type": "image" | "video" }.
-- media[0] is the "cover" item — the admin form keeps the legacy `image_url`
-- column mirrored to media[0].url so existing consumers (JSON-LD, sitemap OG
-- image, ProductTile thumbnail) keep working untouched. New code should read
-- `media`; `image_url` is a derived convenience column, not hand-edited.
alter table products
  add column if not exists media jsonb not null default '[]'::jsonb;

-- Backfill: any product that already has a single image_url gets it as its
-- one-item gallery, so existing catalogue photos don't disappear.
update products
set media = jsonb_build_array(jsonb_build_object('url', image_url, 'type', 'image'))
where image_url is not null
  and media = '[]'::jsonb;

comment on column products.media is
  'Ordered gallery: [{"url": "...", "type": "image"|"video"}, ...]. media[0] is the cover, mirrored into image_url.';
