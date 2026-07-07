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
  is_slab_available: boolean
  allows_letter_topper: boolean
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

export async function updateCategory(
  id: string,
  patch: Partial<Pick<AdminCategory, 'is_visible'>>,
): Promise<void> {
  const { error } = await supabase.from('categories').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Upload a single image or video file to the public product-images bucket
 * and return its gallery entry ({ url, type }). Used for the product gallery
 * (multiple images/videos per product, shown as a carousel on the storefront).
 */
export async function uploadProductMedia(file: File): Promise<ProductMedia> {
  const isVideo = file.type.startsWith('video/')
  const ext = file.name.split('.').pop() ?? (isVideo ? 'mp4' : 'jpg')
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('product-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return { url: data.publicUrl, type: isVideo ? 'video' : 'image' }
}
