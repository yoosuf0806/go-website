import { useState } from 'react'
import { useAdminContent, useUpdateContent } from '../../hooks/useAdminContent'
import type { HeroSlide, IconCard, OccasionCard, SeoMeta, SiteContent } from '../../types/content'
import { uploadImage } from '../../lib/adminProducts'
import Toast from '../../components/ui/Toast'

// Admin Content & SEO — edit every storefront section's copy + per-page SEO.
// Saved to the `content` settings blob; goes live on the next Publish.
export default function Content() {
  const { data, isLoading, isError, error } = useAdminContent()
  const [toast, setToast] = useState<string | null>(null)

  if (isLoading) return <p className="text-sm text-neutral-500">Loading…</p>
  if (isError) return <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">Failed: {error.message}</p>
  if (!data) return null

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold">Content &amp; SEO</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Edit every storefront section and its SEO. Changes go live on the next Publish.
      </p>
      <ContentForm initial={data} onSaved={() => setToast('Content saved. Publish to go live.')} />
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

function ContentForm({ initial, onSaved }: { initial: SiteContent; onSaved: () => void }) {
  const [form, setForm] = useState<SiteContent>(initial)
  const update = useUpdateContent()

  function set<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    update.mutate(form, { onSuccess: onSaved })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
      <Section title="Homepage sections (show / hide)">
        <p className="-mt-2 mb-2 text-xs text-neutral-500">
          Turn any homepage section off for visitors without deleting its content.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {([
            ['hotPicks', 'Hot Picks'],
            ['trust', 'Trust bar'],
            ['slideshow', 'Slideshow'],
            ['categories', 'Occasion cards'],
            ['ctaBanner', 'CTA banner'],
            ['howItWorks', 'How it works'],
            ['testimonials', 'Testimonials'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.sectionVisibility[key] !== false}
                onChange={(e) =>
                  set('sectionVisibility', { ...form.sectionVisibility, [key]: e.target.checked })
                }
              />
              {label}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Announcement ticker">
        <label className="text-sm">
          <span className="block text-neutral-600">Messages (one per line)</span>
          <textarea
            rows={5}
            value={form.promoMessages.join('\n')}
            onChange={(e) => set('promoMessages', e.target.value.split('\n').filter((l) => l.trim()))}
            className={textareaCls}
          />
        </label>
      </Section>

      <Section title="Hero">
        <Row>
          <Text label="Title (before highlight)" value={form.hero.title} onChange={(v) => set('hero', { ...form.hero, title: v })} />
          <Text label="Highlight word" value={form.hero.highlight} onChange={(v) => set('hero', { ...form.hero, highlight: v })} />
          <Text label="Title (after highlight)" value={form.hero.titleAfter} onChange={(v) => set('hero', { ...form.hero, titleAfter: v })} />
        </Row>
        <Area label="Subtitle" value={form.hero.subtitle} onChange={(v) => set('hero', { ...form.hero, subtitle: v })} />
        <Row>
          <Text label="Primary button" value={form.hero.primaryCta} onChange={(v) => set('hero', { ...form.hero, primaryCta: v })} />
          <Text label="Secondary button" value={form.hero.secondaryCta} onChange={(v) => set('hero', { ...form.hero, secondaryCta: v })} />
        </Row>
      </Section>

      <Section title="Hero banner slides">
        <p className="-mt-2 mb-2 text-xs text-neutral-500">
          Add image slides with their own text overlaid. When at least one slide exists, the homepage
          shows this image carousel instead of the default hero. Leave empty to keep the default hero.
        </p>
        <HeroSlidesEditor slides={form.heroSlides} onChange={(v) => set('heroSlides', v)} />
      </Section>

      <Section title="Trust bar">
        <IconCards items={form.trust} onChange={(v) => set('trust', v)} />
      </Section>

      <Section title="Occasion cards">
        {form.categories.map((c, i) => (
          <OccasionEditor
            key={i}
            card={c}
            onChange={(next) => set('categories', form.categories.map((x, j) => (j === i ? next : x)))}
          />
        ))}
      </Section>

      <Section title="Promo banner">
        <Text label="Title" value={form.ctaBanner.title} onChange={(v) => set('ctaBanner', { ...form.ctaBanner, title: v })} />
        <Area label="Body" value={form.ctaBanner.body} onChange={(v) => set('ctaBanner', { ...form.ctaBanner, body: v })} />
        <Text label="Button" value={form.ctaBanner.cta} onChange={(v) => set('ctaBanner', { ...form.ctaBanner, cta: v })} />
      </Section>

      <Section title="How it works">
        <IconCards items={form.howItWorks} onChange={(v) => set('howItWorks', v)} iconLabel="Step" />
      </Section>

      <Section title="Badge strip">
        <IconCards items={form.badges} onChange={(v) => set('badges', v)} />
      </Section>

      <Section title="Testimonials heading">
        <Text label="Title" value={form.testimonialsHeading.title} onChange={(v) => set('testimonialsHeading', { ...form.testimonialsHeading, title: v })} />
        <Text label="Subtitle" value={form.testimonialsHeading.sub} onChange={(v) => set('testimonialsHeading', { ...form.testimonialsHeading, sub: v })} />
      </Section>

      <Section title="Product page info">
        <Area label="Freshness & storage" value={form.productInfo.freshness} onChange={(v) => set('productInfo', { ...form.productInfo, freshness: v })} />
        <Area label="Allergens" value={form.productInfo.allergens} onChange={(v) => set('productInfo', { ...form.productInfo, allergens: v })} />
      </Section>

      <Section title="SEO">
        <Text label="Site name" value={form.seo.siteName} onChange={(v) => set('seo', { ...form.seo, siteName: v })} />
        <SeoEditor label="Home" meta={form.seo.home} onChange={(m) => set('seo', { ...form.seo, home: m })} />
        <SeoEditor label="Shop" meta={form.seo.shop} onChange={(m) => set('seo', { ...form.seo, shop: m })} />
        <SeoEditor label="Corporate" meta={form.seo.corporate} onChange={(m) => set('seo', { ...form.seo, corporate: m })} />
      </Section>

      <div className="sticky bottom-0 -mx-2 flex items-center gap-3 bg-neutral-50/90 px-2 py-3 backdrop-blur">
        <button
          type="submit"
          disabled={update.isPending}
          className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {update.isPending ? 'Saving…' : 'Save all content'}
        </button>
        {update.isError && <span className="text-sm text-red-600">{update.error.message}</span>}
      </div>
    </form>
  )
}

const inputCls = 'mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm'
const textareaCls = 'mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{children}</div>
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-neutral-600">{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </label>
  )
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-neutral-600">{label}</span>
      <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className={textareaCls} />
    </label>
  )
}

function IconCards({
  items,
  onChange,
  iconLabel = 'Icon',
}: {
  items: IconCard[]
  onChange: (items: IconCard[]) => void
  iconLabel?: string
}) {
  const patch = (i: number, next: IconCard) => onChange(items.map((x, j) => (j === i ? next : x)))
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-1 gap-2 rounded border border-neutral-100 p-3 sm:grid-cols-[80px_1fr_2fr]">
          <Text label={iconLabel} value={item.icon} onChange={(v) => patch(i, { ...item, icon: v })} />
          <Text label="Title" value={item.title} onChange={(v) => patch(i, { ...item, title: v })} />
          <Text label="Body" value={item.body} onChange={(v) => patch(i, { ...item, body: v })} />
        </div>
      ))}
    </div>
  )
}

function OccasionEditor({ card, onChange }: { card: OccasionCard; onChange: (c: OccasionCard) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded border border-neutral-100 p-3 sm:grid-cols-2">
      <Text label="Emoji" value={card.emoji} onChange={(v) => onChange({ ...card, emoji: v })} />
      <Text label="Title" value={card.title} onChange={(v) => onChange({ ...card, title: v })} />
      <Text label="Body" value={card.body} onChange={(v) => onChange({ ...card, body: v })} />
      <Text label="Button text" value={card.cta} onChange={(v) => onChange({ ...card, cta: v })} />
      <Text label="Links to (/shop or /corporate)" value={card.to} onChange={(v) => onChange({ ...card, to: v })} />
    </div>
  )
}

function SeoEditor({ label, meta, onChange }: { label: string; meta: SeoMeta; onChange: (m: SeoMeta) => void }) {
  return (
    <div className="rounded border border-neutral-100 p-3">
      <p className="text-xs font-semibold text-neutral-500">{label} page</p>
      <div className="mt-2 flex flex-col gap-2">
        <Text label="SEO title" value={meta.title} onChange={(v) => onChange({ ...meta, title: v })} />
        <Area label="Meta description" value={meta.description} onChange={(v) => onChange({ ...meta, description: v })} />
      </div>
    </div>
  )
}

// Manage the hero image carousel: upload an image per slide, edit its overlaid
// text, reorder, and remove. An empty list means the storefront falls back to
// the default (emoji) hero.
function HeroSlidesEditor({
  slides,
  onChange,
}: {
  slides: HeroSlide[]
  onChange: (v: HeroSlide[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(i: number, patch: Partial<HeroSlide>) {
    onChange(slides.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }
  function remove(i: number) {
    onChange(slides.filter((_, idx) => idx !== i))
  }
  function move(i: number, dir: number) {
    const j = i + dir
    if (j < 0 || j >= slides.length) return
    const next = slides.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  async function addSlide(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const url = await uploadImage(file)
      onChange([
        ...slides,
        { imageUrl: url, title: 'Gift something they', highlight: 'actually', titleAfter: 'love.', subtitle: '' },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {slides.map((slide, i) => (
        <div key={i} className="rounded-lg border border-neutral-200 p-3">
          <div className="flex gap-3">
            <img
              src={slide.imageUrl}
              alt=""
              className="h-24 w-32 flex-shrink-0 rounded object-cover"
            />
            <div className="flex-1">
              <Row>
                <Text label="Title (before)" value={slide.title} onChange={(v) => update(i, { title: v })} />
                <Text label="Highlight" value={slide.highlight} onChange={(v) => update(i, { highlight: v })} />
                <Text label="Title (after)" value={slide.titleAfter} onChange={(v) => update(i, { titleAfter: v })} />
              </Row>
              <div className="mt-2">
                <Area label="Subtitle" value={slide.subtitle} onChange={(v) => update(i, { subtitle: v })} />
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded border border-neutral-300 px-2 py-1 disabled:opacity-40">
              ↑ Up
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === slides.length - 1} className="rounded border border-neutral-300 px-2 py-1 disabled:opacity-40">
              ↓ Down
            </button>
            <button type="button" onClick={() => remove(i)} className="rounded border border-neutral-300 px-2 py-1 text-red-600 hover:bg-red-50">
              Remove
            </button>
            <span className="text-neutral-400">Slide {i + 1} of {slides.length}</span>
          </div>
        </div>
      ))}

      <div>
        <label className="inline-block cursor-pointer rounded-full border-2 border-navy px-4 py-2 text-sm font-bold text-navy hover:bg-navy hover:text-white">
          {uploading ? 'Uploading…' : '+ Add slide (upload image)'}
          <input type="file" accept="image/*" onChange={addSlide} disabled={uploading} className="hidden" />
        </label>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}
