import { describe, it, expect, vi } from 'vitest'

// The blur-up placeholder map is baked into catalog.json by the snapshot and
// read via `../data/catalog`. Mock it so these tests exercise the key-resolution
// logic against a known map without needing a real build snapshot.
const LOCAL = '/catalog-images/abc123.jpg'
const STORAGE_PATH = 'object/public/product-images/cake.jpg'
const BLUR = 'data:image/webp;base64,PLACEHOLDER'

vi.mock('../data/catalog', () => ({
  imagePlaceholders: {
    [LOCAL]: BLUR,
    [STORAGE_PATH]: BLUR,
  },
}))

const { blurDataUrl, blurStyle } = await import('./images')

describe('blurDataUrl', () => {
  it('resolves the baked local path (first-paint URL form)', () => {
    expect(blurDataUrl(LOCAL)).toBe(BLUR)
  })

  it('resolves a live Supabase storage URL to the same placeholder', () => {
    // After CatalogProvider swaps in live data the URL is the full Supabase one;
    // its stable storage path keys the same placeholder as the baked copy.
    const live = `https://xyz.supabase.co/storage/v1/${STORAGE_PATH}`
    expect(blurDataUrl(live)).toBe(BLUR)
  })

  it('ignores a query string on the storage URL', () => {
    const live = `https://xyz.supabase.co/storage/v1/${STORAGE_PATH}?width=800&token=abc`
    expect(blurDataUrl(live)).toBe(BLUR)
  })

  it('returns undefined for an image with no baked placeholder', () => {
    expect(blurDataUrl('/catalog-images/not-baked.jpg')).toBeUndefined()
    expect(blurDataUrl('https://xyz.supabase.co/storage/v1/object/public/other.jpg')).toBeUndefined()
  })

  it('returns undefined for nullish input', () => {
    expect(blurDataUrl(null)).toBeUndefined()
    expect(blurDataUrl(undefined)).toBeUndefined()
  })
})

describe('blurStyle', () => {
  it('builds a cover-background style from the placeholder', () => {
    expect(blurStyle(LOCAL)).toEqual({
      backgroundImage: `url("${BLUR}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    })
  })

  it('returns undefined when there is no placeholder, so it spreads harmlessly', () => {
    expect(blurStyle('/catalog-images/not-baked.jpg')).toBeUndefined()
    expect(blurStyle(null)).toBeUndefined()
  })
})
