-- 023_slab_first_sort_order.sql
-- Bring the Brownie Slab packages (slab-12, slab-15) ahead of the box
-- packages (box-9, box-12, box-15) everywhere sort_order is used to
-- render the package/size picker (storefront PackageSelector, admin, and
-- the build-time snapshot).

update packages set sort_order = 1 where id = 'slab-12';
update packages set sort_order = 2 where id = 'slab-15';
update packages set sort_order = 3 where id = 'box-9';
update packages set sort_order = 4 where id = 'box-12';
update packages set sort_order = 5 where id = 'box-15';