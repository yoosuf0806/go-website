// Demo seed data for local development, mirrored by supabase/seed.sql.
//
// Rows are in DB (snake_case) shape so scripts/snapshot.ts can run the SAME
// transform over them as it runs over live Supabase rows. This is the fallback
// the snapshot uses when no Supabase service key is configured, so `npm run
// build` / `npm run dev` produce a valid catalog.json offline (spec §10.2).
//
// Keep in sync with supabase/seed.sql (same ids, prices, and flags).

export interface RawCategory {
  id: string
  name: string
  slug: string
  is_visible: boolean
  sort_order: number
}

export interface RawProduct {
  id: string
  category_id: string | null
  name: string
  slug: string
  description: string | null
  price_per_piece: number
  image_url: string | null
  is_visible: boolean
  in_stock: boolean
  stock_qty: number | null
  is_slab_available: boolean
  allows_letter_topper: boolean
  sort_order: number
}

export interface RawPackage {
  id: string
  label: string
  piece_count: number
  is_slab: boolean
  is_active: boolean
  sort_order: number
}

export interface RawAddon {
  id: string
  label: string
  price: number
  is_enabled: boolean
  config: Record<string, unknown>
}

export interface RawDeliveryTier {
  min_pieces: number
  max_pieces: number | null
  fee: number
  warn_admin: boolean
  sort_order: number
}

export interface RawReview {
  id: string
  author: string
  rating: number
  body: string
  source: string
  is_featured: boolean
  is_hidden: boolean
}

export interface RawSettings {
  banner: Record<string, unknown>
  features: Record<string, unknown>
  business: Record<string, unknown>
}

export interface SeedData {
  categories: RawCategory[]
  products: RawProduct[]
  packages: RawPackage[]
  addons: RawAddon[]
  deliveryTiers: RawDeliveryTier[]
  reviews: RawReview[]
  settings: RawSettings
}

const CAT_CLASSIC = '11111111-1111-4111-8111-111111111111'
const CAT_PREMIUM = '22222222-2222-4222-8222-222222222222'

export const seedData: SeedData = {
  categories: [
    { id: CAT_CLASSIC, name: 'Classic Brownies', slug: 'classic', is_visible: true, sort_order: 1 },
    { id: CAT_PREMIUM, name: 'Premium Brownies', slug: 'premium', is_visible: true, sort_order: 2 },
  ],

  products: [
    {
      id: 'a1111111-1111-4111-8111-111111111111',
      category_id: CAT_CLASSIC,
      name: 'Naked Brownie',
      slug: 'naked-brownie',
      description: 'Our signature fudgy classic — rich, dense, and unadorned.',
      price_per_piece: 150,
      image_url: null,
      is_visible: true,
      in_stock: true,
      stock_qty: null,
      is_slab_available: true,
      allows_letter_topper: true,
      sort_order: 1,
    },
    {
      id: 'a2222222-2222-4222-8222-222222222222',
      category_id: CAT_CLASSIC,
      name: 'Walnut Fudge',
      slug: 'walnut-fudge',
      description: 'Classic brownie loaded with toasted walnuts.',
      price_per_piece: 170,
      image_url: null,
      is_visible: true,
      in_stock: true,
      stock_qty: null,
      is_slab_available: false,
      allows_letter_topper: false,
      sort_order: 2,
    },
    {
      id: 'a3333333-3333-4333-8333-333333333333',
      category_id: CAT_PREMIUM,
      name: 'Cashew Brownie',
      slug: 'cashew-brownie',
      description: 'Buttery Sri Lankan cashews over a dark-chocolate base.',
      price_per_piece: 190,
      image_url: null,
      is_visible: true,
      in_stock: true,
      stock_qty: 40,
      is_slab_available: true,
      allows_letter_topper: true,
      sort_order: 3,
    },
    {
      id: 'a4444444-4444-4444-8444-444444444444',
      category_id: CAT_PREMIUM,
      name: 'Triple Chocolate',
      slug: 'triple-chocolate',
      description: 'Dark, milk, and white chocolate in every bite.',
      price_per_piece: 210,
      image_url: null,
      is_visible: true,
      in_stock: true,
      stock_qty: null,
      is_slab_available: true,
      allows_letter_topper: true,
      sort_order: 4,
    },
    {
      id: 'a5555555-5555-4555-8555-555555555555',
      category_id: CAT_PREMIUM,
      name: 'Salted Caramel',
      slug: 'salted-caramel',
      description: 'Molten salted-caramel swirl on a fudge brownie.',
      price_per_piece: 200,
      image_url: null,
      is_visible: true,
      in_stock: false,
      stock_qty: null,
      is_slab_available: true,
      allows_letter_topper: true,
      sort_order: 5,
    },
  ],

  packages: [
    { id: 'box-9', label: '9 Pieces', piece_count: 9, is_slab: false, is_active: true, sort_order: 1 },
    { id: 'box-12', label: '12 Pieces', piece_count: 12, is_slab: false, is_active: true, sort_order: 2 },
    { id: 'box-15', label: '15 Pieces', piece_count: 15, is_slab: false, is_active: true, sort_order: 3 },
    { id: 'slab-12', label: 'Brownie Slab (12 pcs)', piece_count: 12, is_slab: true, is_active: true, sort_order: 4 },
  ],

  addons: [
    {
      id: 'letter_topper',
      label: 'Letter Topper',
      price: 350,
      is_enabled: true,
      config: { lines: 3, max_chars_per_line: 5, slab_only: true },
    },
    {
      id: 'gift_message',
      label: 'Gift Message',
      price: 100,
      is_enabled: true,
      config: { max_chars: 100 },
    },
    {
      id: 'gift_ribbon',
      label: 'Gift Ribbon',
      price: 150,
      is_enabled: true,
      config: { colors: ['Red', 'Gold', 'Pink', 'White'] },
    },
  ],

  deliveryTiers: [
    { min_pieces: 1, max_pieces: null, fee: 580, warn_admin: false, sort_order: 1 },
  ],

  reviews: [
    {
      id: 'c1111111-1111-4111-8111-111111111111',
      author: 'Nadeesha P.',
      rating: 5,
      body: 'The fudgiest brownies in Colombo. The slab with the letter topper made my daughter’s birthday!',
      source: 'google',
      is_featured: true,
      is_hidden: false,
    },
    {
      id: 'c2222222-2222-4222-8222-222222222222',
      author: 'Roshan M.',
      rating: 5,
      body: 'Ordered a corporate box of 15 — delivered on time and everyone raved. Highly recommend.',
      source: 'google',
      is_featured: true,
      is_hidden: false,
    },
    {
      id: 'c3333333-3333-4333-8333-333333333333',
      author: 'Ayesha F.',
      rating: 4,
      body: 'Cashew brownie is divine. Will order again for our next event.',
      source: 'google',
      is_featured: true,
      is_hidden: false,
    },
  ],

  settings: {
    banner: { enabled: false, text: '', starts_at: null, ends_at: null },
    features: { corporate_section: true, wedding_section: true, reviews_section: true },
    business: { whatsapp_number: '94771234567', google_business_url: 'https://g.page/golden-oven' },
  },
}
