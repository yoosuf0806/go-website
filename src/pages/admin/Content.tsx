import { useState } from 'react'
import { useAdminContent, useUpdateContent } from '../../hooks/useAdminContent'
import type {
  FaqItem,
  HeroSlide,
  IconCard,
  OccasionCard,
  QuoteLandingContent,
  SeoMeta,
  SiteContent,
  SlabLandingContent,
} from '../../types/content'
import { uploadImage } from '../../lib/adminProducts'
import Toast from '../../components/ui/Toast'
import ImageCropModal from '../../components/admin/ImageCropModal'
import { isCroppable } from '../../lib/cropImage'

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
            ['ctaBanner', 'Promo strip'],
            ['testimonials', 'Testimonials'],
            ['gallery', 'Gallery'],
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

      <Section title="Gallery">
        <p className="-mt-2 mb-2 text-xs text-neutral-500">
          Shown on Home, Wedding, and Corporate as a photo grid. Toggle it on/off above
          ("Gallery"). Empty = hidden.
        </p>
        <Text label="Heading" value={form.galleryHeading} onChange={(v) => set('galleryHeading', v)} />
        <GalleryEditor images={form.gallery} onChange={(v) => set('gallery', v)} />
      </Section>

      <Section title="Homepage · Build your slab">
        <p className="-mt-2 mb-2 text-xs text-neutral-500">
          The white “Build your own slab” card on the home page.
        </p>
        <Text label="Eyebrow" value={form.homeSlab.eyebrow} onChange={(v) => set('homeSlab', { ...form.homeSlab, eyebrow: v })} />
        <Text label="Title" value={form.homeSlab.title} onChange={(v) => set('homeSlab', { ...form.homeSlab, title: v })} />
        <Area label="Body" value={form.homeSlab.body} onChange={(v) => set('homeSlab', { ...form.homeSlab, body: v })} />
        <Text label="Button" value={form.homeSlab.cta} onChange={(v) => set('homeSlab', { ...form.homeSlab, cta: v })} />
        <ImageField
          label="Card image"
          aspect={4 / 3}
          aspectLabel="Card"
          value={form.homeSlab.imageUrl ?? undefined}
          onChange={(url) => set('homeSlab', { ...form.homeSlab, imageUrl: url ?? null })}
        />
      </Section>

      <Section title="Homepage · Corporate band">
        <Text label="Eyebrow" value={form.homeCorporate.eyebrow} onChange={(v) => set('homeCorporate', { ...form.homeCorporate, eyebrow: v })} />
        <Text label="Title" value={form.homeCorporate.title} onChange={(v) => set('homeCorporate', { ...form.homeCorporate, title: v })} />
        <Area label="Body" value={form.homeCorporate.body} onChange={(v) => set('homeCorporate', { ...form.homeCorporate, body: v })} />
        <Text label="Button" value={form.homeCorporate.cta} onChange={(v) => set('homeCorporate', { ...form.homeCorporate, cta: v })} />
      </Section>

      <Section title="Homepage · FAQ">
        <FaqEditor items={form.homeFaq} onChange={(v) => set('homeFaq', v)} />
      </Section>

      <Section title="Footer · Policy pages">
        <p className="text-xs text-neutral-500">
          Shown in the footer under “Policies”. Leave a blank line between paragraphs. Linked at /policies/returns and
          /policies/payment.
        </p>
        <div className="rounded border border-neutral-100 p-3">
          <Text
            label="Return Policy — title"
            value={form.policies.returns.title}
            onChange={(v) => set('policies', { ...form.policies, returns: { ...form.policies.returns, title: v } })}
          />
          <label className="mt-2 block text-sm">
            <span className="text-neutral-600">Return Policy — body</span>
            <textarea
              rows={8}
              value={form.policies.returns.body}
              onChange={(e) => set('policies', { ...form.policies, returns: { ...form.policies.returns, body: e.target.value } })}
              className={textareaCls}
            />
          </label>
        </div>
        <div className="rounded border border-neutral-100 p-3">
          <Text
            label="Payment Terms — title"
            value={form.policies.payment.title}
            onChange={(v) => set('policies', { ...form.policies, payment: { ...form.policies.payment, title: v } })}
          />
          <label className="mt-2 block text-sm">
            <span className="text-neutral-600">Payment Terms — body</span>
            <textarea
              rows={8}
              value={form.policies.payment.body}
              onChange={(e) => set('policies', { ...form.policies, payment: { ...form.policies.payment, body: e.target.value } })}
              className={textareaCls}
            />
          </label>
        </div>
      </Section>

      <Section title="Testimonials heading">
        <Text label="Title" value={form.testimonialsHeading.title} onChange={(v) => set('testimonialsHeading', { ...form.testimonialsHeading, title: v })} />
        <Text label="Subtitle" value={form.testimonialsHeading.sub} onChange={(v) => set('testimonialsHeading', { ...form.testimonialsHeading, sub: v })} />
      </Section>

      <Section title="Product page info">
        <Area label="Freshness & storage" value={form.productInfo.freshness} onChange={(v) => set('productInfo', { ...form.productInfo, freshness: v })} />
        <Area label="Allergens" value={form.productInfo.allergens} onChange={(v) => set('productInfo', { ...form.productInfo, allergens: v })} />
      </Section>

      <QuoteLandingEditor
        title="Corporate Orders page"
        content={form.corporate}
        onChange={(v) => set('corporate', v)}
      />

      <QuoteLandingEditor
        title="Wedding Orders page"
        content={form.wedding}
        onChange={(v) => set('wedding', v)}
      />

      <SlabPageEditor content={form.slab} onChange={(v) => set('slab', v)} />

      <Section title="SEO">
        <Text label="Site name" value={form.seo.siteName} onChange={(v) => set('seo', { ...form.seo, siteName: v })} />
        <SeoEditor label="Home" meta={form.seo.home} onChange={(m) => set('seo', { ...form.seo, home: m })} />
        <SeoEditor label="Shop" meta={form.seo.shop} onChange={(m) => set('seo', { ...form.seo, shop: m })} />
        <SeoEditor label="Corporate Orders" meta={form.seo.corporate} onChange={(m) => set('seo', { ...form.seo, corporate: m })} />
        <SeoEditor label="Wedding Orders" meta={form.seo.wedding} onChange={(m) => set('seo', { ...form.seo, wedding: m })} />
        <SeoEditor label="Brownie Slab" meta={form.seo.slab} onChange={(m) => set('seo', { ...form.seo, slab: m })} />
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
    <div className="rounded border border-neutral-100 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Text label="Emoji (used if no image)" value={card.emoji} onChange={(v) => onChange({ ...card, emoji: v })} />
        <Text label="Title" value={card.title} onChange={(v) => onChange({ ...card, title: v })} />
        <Text label="Body" value={card.body} onChange={(v) => onChange({ ...card, body: v })} />
        <Text label="Button text" value={card.cta} onChange={(v) => onChange({ ...card, cta: v })} />
        <Text label="Links to (/shop or /corporate)" value={card.to} onChange={(v) => onChange({ ...card, to: v })} />
      </div>
      <div className="mt-2">
        <ImageField
          label="Card image (optional — replaces the emoji)"
          aspect={3 / 2}
          aspectLabel="Occasion card"
          value={card.imageUrl}
          onChange={(url) => onChange({ ...card, imageUrl: url })}
        />
      </div>
    </div>
  )
}

// Reusable image upload + preview + clear, for content sections. Uploads to the
// shared public bucket and stores the resulting URL. `aspect` (width / height)
// is the shape this image is shown in on the storefront — the admin frames the
// crop to it before uploading so they control what stays visible.
function ImageField({
  label,
  value,
  onChange,
  aspect = 3 / 2,
  aspectLabel,
}: {
  label: string
  value?: string
  onChange: (url: string | undefined) => void
  aspect?: number
  aspectLabel?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)

  async function upload(file: File) {
    setError(null)
    setUploading(true)
    try {
      onChange(await uploadImage(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
    setUploading(false)
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // Rasters go through the crop/preview step; SVGs and GIFs upload as-is.
    if (isCroppable(file)) setCropFile(file)
    else void upload(file)
  }

  return (
    <div>
      <span className="block text-sm text-neutral-600">{label}</span>
      <div className="mt-1 flex items-center gap-3">
        {value && (
          <img
            src={value}
            alt=""
            className="h-14 w-20 rounded object-cover"
            style={{ aspectRatio: aspect }}
          />
        )}
        <label className="cursor-pointer rounded border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100">
          {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
          <input type="file" accept="image/*" onChange={pick} disabled={uploading} className="hidden" />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-red-600 hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          aspect={aspect}
          aspectLabel={aspectLabel}
          onCancel={() => setCropFile(null)}
          onConfirm={(cropped) => {
            setCropFile(null)
            void upload(cropped)
          }}
        />
      )}
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
  const [cropFile, setCropFile] = useState<File | null>(null)

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

  async function upload(file: File) {
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

  function addSlide(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // Hero slides are full-bleed — frame the crop to the banner before upload.
    if (isCroppable(file)) setCropFile(file)
    else void upload(file)
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

      {cropFile && (
        <ImageCropModal
          file={cropFile}
          aspect={16 / 9}
          aspectLabel="Hero slide"
          onCancel={() => setCropFile(null)}
          onConfirm={(cropped) => {
            setCropFile(null)
            void upload(cropped)
          }}
        />
      )}
    </div>
  )
}

// Manage a FAQ list (question + answer) with add / edit / delete. Reused for
// the homepage FAQ and the corporate/wedding page FAQs.
function FaqEditor({ items, onChange }: { items: FaqItem[]; onChange: (v: FaqItem[]) => void }) {
  const update = (i: number, patch: Partial<FaqItem>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i))
  const add = () => onChange([...items, { q: 'New question?', a: '' }])

  return (
    <div className="mt-1 flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="rounded border border-neutral-100 p-3">
          <Text label="Question" value={item.q} onChange={(v) => update(i, { q: v })} />
          <div className="mt-2">
            <Area label="Answer" value={item.a} onChange={(v) => update(i, { a: v })} />
          </div>
          <button type="button" onClick={() => remove(i)} className="mt-2 rounded border border-neutral-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="self-start rounded-full border-2 border-navy px-4 py-2 text-sm font-bold text-navy hover:bg-navy hover:text-white">
        + Add FAQ
      </button>
    </div>
  )
}

// Full editor for a Corporate Orders or Wedding Orders landing page: hero
// banner, trust stats, "everything handled" checklist, occasions grid,
// pricing tiers, and the existing quote-form copy. Reused for both pages so
// they stay structurally identical while holding fully independent content.
function QuoteLandingEditor({
  title,
  content,
  onChange,
}: {
  title: string
  content: QuoteLandingContent
  onChange: (v: QuoteLandingContent) => void
}) {
  return (
    <Section title={title}>
      <p className="-mt-2 mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Hero banner</p>
      <Text label="Eyebrow" value={content.hero.eyebrow} onChange={(v) => onChange({ ...content, hero: { ...content.hero, eyebrow: v } })} />
      <Text label="Title" value={content.hero.title} onChange={(v) => onChange({ ...content, hero: { ...content.hero, title: v } })} />
      <Area label="Subtitle" value={content.hero.subtitle} onChange={(v) => onChange({ ...content, hero: { ...content.hero, subtitle: v } })} />
      <Text label="Button text" value={content.hero.cta} onChange={(v) => onChange({ ...content, hero: { ...content.hero, cta: v } })} />
      <ImageField label="Background image (optional)" aspect={16 / 9} aspectLabel="Hero banner" value={content.hero.imageUrl} onChange={(url) => onChange({ ...content, hero: { ...content.hero, imageUrl: url } })} />

      <p className="-mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        Feature bullets (shown below the hero — icon, title, body)
      </p>
      <IconCards items={content.stats} onChange={(v) => onChange({ ...content, stats: v })} iconLabel="Icon" />

      <p className="-mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">Everything handled for you</p>
      <Text label="Heading" value={content.handledHeading} onChange={(v) => onChange({ ...content, handledHeading: v })} />
      <ImageField label="Image (optional)" aspect={4 / 3} aspectLabel="Section image" value={content.handledImageUrl} onChange={(url) => onChange({ ...content, handledImageUrl: url })} />
      <label className="block text-sm">
        <span className="text-neutral-600">Checklist items (one per line)</span>
        <textarea
          rows={4}
          value={content.handledItems.join('\n')}
          onChange={(e) => onChange({ ...content, handledItems: e.target.value.split('\n').filter((l) => l.trim()) })}
          className={textareaCls}
        />
      </label>
      <Text label="Button text" value={content.handledCta} onChange={(v) => onChange({ ...content, handledCta: v })} />

      <p className="-mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">Occasions we cover</p>
      <Text label="Section heading" value={content.occasionsHeading} onChange={(v) => onChange({ ...content, occasionsHeading: v })} />
      {content.occasions.map((c, i) => (
        <OccasionEditor
          key={i}
          card={c}
          onChange={(next) => onChange({ ...content, occasions: content.occasions.map((x, j) => (j === i ? next : x)) })}
        />
      ))}

      <p className="-mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">Quote request form</p>
      <Text label="Heading" value={content.heading} onChange={(v) => onChange({ ...content, heading: v })} />
      <Area label="Intro" value={content.intro} onChange={(v) => onChange({ ...content, intro: v })} />
      <Area label="Heads-up note" value={content.preOrderNote} onChange={(v) => onChange({ ...content, preOrderNote: v })} />
      <label className="block text-sm">
        <span className="text-neutral-600">Product info points (one per line)</span>
        <textarea
          rows={4}
          value={content.productInfo.join('\n')}
          onChange={(e) => onChange({ ...content, productInfo: e.target.value.split('\n').filter((l) => l.trim()) })}
          className={textareaCls}
        />
      </label>
      <div>
        <span className="block text-sm text-neutral-600">FAQ</span>
        <FaqEditor items={content.faq} onChange={(v) => onChange({ ...content, faq: v })} />
      </div>
    </Section>
  )
}

// Admin editor for the Brownie Slab landing page (/slab). The flavour list is
// NOT edited here — it's read live from slab-enabled products. This edits the
// banner (copy + image), how-it-works strip, section headings, the product
// gallery (add/remove images), and the FAQ.
function SlabPageEditor({
  content,
  onChange,
}: {
  content: SlabLandingContent
  onChange: (v: SlabLandingContent) => void
}) {
  return (
    <Section title="Brownie Slab page">
      <p className="text-xs text-neutral-500">
        The flavour cards are driven automatically by your slab-enabled products — no need to edit them here.
      </p>

      <div className="rounded border border-neutral-100 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Banner</div>
        <div className="mt-2 flex flex-col gap-2">
          <Text label="Eyebrow" value={content.banner.eyebrow} onChange={(v) => onChange({ ...content, banner: { ...content.banner, eyebrow: v } })} />
          <Text label="Title" value={content.banner.title} onChange={(v) => onChange({ ...content, banner: { ...content.banner, title: v } })} />
          <Area label="Subtitle" value={content.banner.subtitle} onChange={(v) => onChange({ ...content, banner: { ...content.banner, subtitle: v } })} />
          <Text label="Button" value={content.banner.cta} onChange={(v) => onChange({ ...content, banner: { ...content.banner, cta: v } })} />
          <ImageField label="Banner image (optional)" aspect={16 / 9} aspectLabel="Banner" value={content.banner.imageUrl} onChange={(url) => onChange({ ...content, banner: { ...content.banner, imageUrl: url } })} />
        </div>
      </div>

      <div className="rounded border border-neutral-100 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">How it works (3 steps)</div>
        <div className="mt-2">
          <IconCards items={content.howItWorks} onChange={(v) => onChange({ ...content, howItWorks: v })} iconLabel="Emoji" />
        </div>
      </div>

      <Text label="Flavours heading" value={content.flavoursHeading} onChange={(v) => onChange({ ...content, flavoursHeading: v })} />
      <Area label="Flavours intro" value={content.flavoursIntro} onChange={(v) => onChange({ ...content, flavoursIntro: v })} />

      <div className="rounded border border-neutral-100 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Product gallery</div>
        <Text label="Gallery heading" value={content.galleryHeading} onChange={(v) => onChange({ ...content, galleryHeading: v })} />
        <div className="mt-2">
          <GalleryEditor images={content.gallery} onChange={(v) => onChange({ ...content, gallery: v })} />
        </div>
      </div>

      <div className="rounded border border-neutral-100 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">FAQ</div>
        <Text label="FAQ heading" value={content.faqHeading} onChange={(v) => onChange({ ...content, faqHeading: v })} />
        <div className="mt-2">
          <FaqEditor items={content.faq} onChange={(v) => onChange({ ...content, faq: v })} />
        </div>
      </div>
    </Section>
  )
}

// Add/remove/reorder-free gallery editor: each row is an uploaded image with a
// remove button; a trailing uploader appends. An empty gallery hides the
// section on the storefront.
function GalleryEditor({ images, onChange }: { images: string[]; onChange: (v: string[]) => void }) {
  const removeAt = (i: number) => onChange(images.filter((_, j) => j !== i))
  const addImage = (url: string | undefined) => {
    if (url) onChange([...images, url])
  }
  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt={`Gallery ${i + 1}`} className="aspect-square w-full rounded object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 text-xs font-bold text-red-600 shadow hover:bg-white"
                aria-label={`Remove image ${i + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <ImageField label="Add a gallery image" aspect={4 / 3} aspectLabel="Gallery" value={undefined} onChange={addImage} />
    </div>
  )
}
