import { describe, it, expect } from 'vitest'
import { mergeContent, DEFAULT_CONTENT } from './content'

describe('mergeContent — Brownie Slab landing (content.slab)', () => {
  it('falls back to slab defaults when the DB blob omits slab entirely', () => {
    const merged = mergeContent({ promoMessages: ['x'] })
    expect(merged.slab.banner.title).toBe(DEFAULT_CONTENT.slab.banner.title)
    expect(merged.slab.faq.length).toBe(DEFAULT_CONTENT.slab.faq.length)
  })

  it('shallow-merges the banner so a single overridden field keeps the rest', () => {
    const merged = mergeContent({ slab: { banner: { title: 'Custom slab title' } } as never })
    expect(merged.slab.banner.title).toBe('Custom slab title')
    // Untouched banner fields still come from defaults.
    expect(merged.slab.banner.eyebrow).toBe(DEFAULT_CONTENT.slab.banner.eyebrow)
  })

  it('preserves an explicitly empty gallery (empty = hide the section)', () => {
    const merged = mergeContent({ slab: { gallery: [] } as never })
    expect(merged.slab.gallery).toEqual([])
  })

  it('keeps admin-provided gallery images', () => {
    const merged = mergeContent({ slab: { gallery: ['a.jpg', 'b.jpg'] } as never })
    expect(merged.slab.gallery).toEqual(['a.jpg', 'b.jpg'])
  })

  it('falls back to default FAQ when the DB left it empty', () => {
    const merged = mergeContent({ slab: { faq: [] } as never })
    expect(merged.slab.faq.length).toBe(DEFAULT_CONTENT.slab.faq.length)
  })

  it('exposes slab SEO with a default', () => {
    const merged = mergeContent(null)
    expect(merged.seo.slab.title).toContain('Brownie Slab')
  })
})
