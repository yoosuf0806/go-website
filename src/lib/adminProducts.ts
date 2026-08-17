// Admin products & categories — live CRUD (spec §7 Products, §4 migrations
// 002). Includes image upload to the public `product-images` Storage bucket.
import { supabase } from './supabase'

export interface AdminCategory {
  id: string
  name: string
  slug: string
  is_visible: boolean
  sort_order: number
}

/** One item in a product's gallery — media[0] is the "cover" shown on tiles. */
export interface ProductMedia {
  url: string
  type: 'image' | 'video'
}

export interface AdminProduct {
  id: string
  category_id: string | null
  name: string
  slug: string
  description: string | null
  price_per_piece: number
  /** Derived = media[0]?.url, kept in sync on save; don't hand-edit. */
  image_url: string | null
  /** Ordered image/video gallery, shown as a carousel on the storefront. */
  media: ProductMedia[]
  is_visible: boolean
  in_stock: boolean
  stock_qty: number | null
  /** Can be ordered as the 12pc Brownie Slab. Independent of is_slab_15_available. */
  is_slab_available: boolean
  /** Can be ordered as the 15pc Brownie Slab. Independent of is_slab_available. */
  is_slab_15_available: boolean
  allows_letter_topper: boolean
  /** Featured on the homepage Hot Picks section. */
  is_hot_pick: boolean
  /** Offered as a corporate/wedding quote flavour on the /corporate page. */
  is_corporate: boolean
  sort_order: number
}

/** One row of `product_package_stock` — a per product×package sold-out override. No row = in stock. */
export interface AdminProductPackageStock {
  product_id: string
  package_id: string
  in_stock: boolean
}

/** One row of `product_package_availability` — a per product×package hide override. No row = available. */
export interface AdminProductPackageAvailability {
  product_id: string
  package_id: string
  is_available: boolean
}

export interface AdminPackage {
  id: string
  label: string
  piece_count: number
  is_slab: boolean
  is_active: boolean
  letter_max_chars: number
  sort_order: number
}

/** The editable fields of a product (everything except the generated id). */
export type ProductInput = Omit<AdminProduct, 'id'>

export async function fetchCategories(): Promise<AdminCategory[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminCategory[]
}

export async function fetchProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminProduct[]
}

export async function createProduct(input: ProductInput): Promise<void> {
  const { error } = await supabase.from('products').insert(input)
  if (error) throw new Error(error.message)
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<void> {
  const { error } = await supabase.from('products').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createCategory(input: Pick<AdminCategory, 'name' | 'slug' | 'sort_order'>): Promise<void> {
  const { error } = await supabase.from('categories').insert({ ...input, is_visible: true })
  if (error) throw new Error(error.message)
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<AdminCategory, 'name' | 'slug' | 'sort_order' | 'is_visible'>>,
): Promise<void> {
  const { error } = await supabase.from('categories').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

/** Deleting a category never deletes products — category_id is ON DELETE SET NULL. */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** All active packages (for building the stock-toggle grid: one column per package). */
export async function fetchPackages(): Promise<AdminPackage[]> {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminPackage[]
}

/** All product_package_stock rows. No row for a product×package = in stock. */
export async function fetchProductPackageStock(): Promise<AdminProductPackageStock[]> {
  const { data, error } = await supabase.from('product_package_stock').select('*')
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminProductPackageStock[]
}

/**
 * Set a single product×package combo in/out of stock. Setting in_stock=true
 * deletes the override row entirely (no row = in stock, keeping the table
 * small); setting false upserts a row.
 */
export async function setProductPackageStock(
  productId: string,
  packageId: string,
  inStock: boolean,
): Promise<void> {
  if (inStock) {
    const { error } = await supabase
      .from('product_package_stock')
      .delete()
      .eq('product_id', productId)
      .eq('package_id', packageId)
    if (error) throw new Error(error.message)
    return
  }
  const { error } = await supabase
    .from('product_package_stock')
    .upsert({ product_id: productId, package_id: packageId, in_stock: false })
  if (error) throw new Error(error.message)
}

/** All product_package_availability rows. No row for a product×package = available. */
export async function fetchProductPackageAvailability(): Promise<AdminProductPackageAvailability[]> {
  const { data, error } = await supabase.from('product_package_availability').select('*')
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminProductPackageAvailability[]
}

/**
 * Show/hide a single product×package combo. Setting available=true deletes the
 * override row entirely (no row = available, keeping the table small); setting
 * false upserts a row so the storefront hides that package for the product.
 */
export async function setProductPackageAvailability(
  productId: string,
  packageId: string,
  available: boolean,
): Promise<void> {
  if (available) {
    const { error } = await supabase
      .from('product_package_availability')
      .delete()
      .eq('product_id', productId)
      .eq('package_id', packageId)
    if (error) throw new Error(error.message)
    return
  }
  const { error } = await supabase
    .from('product_package_availability')
    .upsert({ product_id: productId, package_id: packageId, is_available: false })
  if (error) throw new Error(error.message)
}

/**
 * Upload a single image or video file to the public product-images bucket
 * and return its gallery entry ({ url, type }). Used for the product gallery
 * (multiple images/videos per product, shown as a carousel on the storefront).
 *
 * Images are downscaled + re-encoded (see resizeImage) before upload — product
 * photos are the storefront's heaviest asset (tiles, detail, hero), and phone
 * uploads run 3–5000px / several MB. Videos are passed through untouched.
 */
export async function uploadProductMedia(file: File): Promise<ProductMedia> {
  const isVideo = file.type.startsWith('video/')
  const blob = isVideo ? file : await resizeImage(file)
  const isPassthrough = blob === file
  const ext = isPassthrough
    ? (file.name.split('.').pop() ?? (isVideo ? 'mp4' : 'jpg'))
    : 'webp'
  const contentType = isPassthrough ? file.type || undefined : 'image/webp'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('product-images').upload(path, blob, {
    // UUID filenames are never reused, so the object is safe to cache "forever".
    cacheControl: `${ONE_YEAR}`,
    upsert: false,
    contentType,
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return { url: data.publicUrl, type: isVideo ? 'video' : 'image' }
}

/**
 * Upload a single image to the shared public bucket and return its URL. Used by
 * content sections (hero slides, trust bar, occasion cards) that only need an
 * image URL, reusing the same bucket and public-URL flow as product media.
 */
// Downscale + re-encode an image before upload. Admin uploads are often
// straight off a phone (3–5000px, several MB), which blew out mobile layout
// and load times when served raw. We cap the longest edge at MAX_EDGE and
// re-encode as compressed WebP (~30% smaller than the equivalent JPEG at the
// same visual quality). SVGs and GIFs are passed through untouched (vector /
// animation would be destroyed by canvas rasterisation).
const MAX_EDGE = 1600
const WEBP_QUALITY = 0.8
// Storage cache-control (seconds). Object paths are random UUIDs and never
// reused, so a re-uploaded image is always a new URL — the old bytes can be
// cached for a year. This is what makes repeat visits load instantly.
const ONE_YEAR = 31536000

async function resizeImage(file: File): Promise<Blob> {
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file
  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // Undecodable by the browser — let the raw file through rather than fail
    // the whole upload; the server/storage still receives something valid.
    return file
  }

  const { width, height } = bitmap
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
  )
  // If re-encoding somehow produced nothing or a bigger file, keep the original.
  if (!blob || blob.size >= file.size) return file
  return blob
}

export async function uploadImage(file: File): Promise<string> {
  const resized = await resizeImage(file)
  // After resize the bytes are WebP (unless we passed through an SVG/GIF or the
  // original was already smaller). Extension follows the actual output type so
  // the stored object and its content-type agree.
  const isPassthrough = resized === file
  const ext = isPassthrough ? (file.name.split('.').pop() ?? 'jpg') : 'webp'
  const contentType = isPassthrough ? file.type || 'image/jpeg' : 'image/webp'
  const path = `content/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('product-images').upload(path, resized, {
    cacheControl: `${ONE_YEAR}`,
    upsert: false,
    contentType,
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}
