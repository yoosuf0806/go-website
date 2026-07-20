// Editable storefront content (spec: admin edits every section for SEO).
// Stored as the `content` row in site_settings (JSONB), baked into the snapshot,
// and read by the storefront. DEFAULT_CONTENT is the fallback so the site always
// renders even before the row is populated or on an older snapshot.

export interface HeroContent {
  title: string
  highlight: string
  titleAfter: string
  subtitle: string
  primaryCta: string
  secondaryCta: string
}

// Admin-managed hero banner slide: a background image with its own text
// overlaid. When SiteContent.heroSlides is non-empty the hero renders as an
// image carousel (text over image); when empty it falls back to the built-in
// emoji-tile hero, so the site still renders before any slides are added.
export interface HeroSlide {
  imageUrl: string
  title: string
  highlight: string
  titleAfter: string
  subtitle: string
}

export interface IconCard {
  icon: string
  title: string
  body: string
}

export interface OccasionCard {
  emoji: string
  /** Optional uploaded image; when set, shown instead of the emoji. */
  imageUrl?: string
  title: string
  body: string
  cta: string
  to: string
}

// Admin-managed slide for the promotional slideshow (the dark carousel below
// the trust bar). Optional background image; falls back to a gradient + emoji
// when no image is set. Empty promoSlides list => the built-in default slides.
export interface PromoSlide {
  eyebrow: string
  title: string
  body: string
  cta: string
  to: string
  imageUrl?: string
}

export interface CtaBanner {
  title: string
  body: string
  cta: string
}

export interface SeoMeta {
  title: string
  description: string
}

export interface FaqItem {
  q: string
  a: string
}

// One slide in the short bulk-order banner slideshow at the top of the
// corporate page. Optional background image; falls back to a pink strip.
export interface CorporateBanner {
  title: string
  body: string
  cta?: string
  to?: string
  imageUrl?: string
}

export interface CorporateQuoteContent {
  heading: string
  intro: string
  productInfo: string[]
  faq: FaqItem[]
  preOrderNote: string
  preOrderThreshold: number
  preOrderLeadDays: number
  discountThreshold: number
  /** Short ad slideshow at the top of the corporate page. Empty = hidden. */
  banners: CorporateBanner[]
}

export interface SiteContent {
  promoMessages: string[]
  hero: HeroContent
  /** Admin-managed hero image carousel. Empty = fall back to the emoji-tile hero. */
  heroSlides: HeroSlide[]
  /** Admin-managed promo slideshow slides. Empty = built-in default slides. */
  promoSlides: PromoSlide[]
  /** Per-homepage-section on/off. Missing key defaults to visible (true). */
  sectionVisibility: {
    hotPicks?: boolean
    trust?: boolean
    slideshow?: boolean
    categories?: boolean
    ctaBanner?: boolean
    howItWorks?: boolean
    testimonials?: boolean
  }
  trust: IconCard[]
  categories: OccasionCard[]
  ctaBanner: CtaBanner
  howItWorks: IconCard[]
  badges: IconCard[]
  testimonialsHeading: { title: string; sub: string }
  productInfo: { freshness: string; allergens: string }
  seo: {
    siteName: string
    home: SeoMeta
    shop: SeoMeta
    corporate: SeoMeta
  }
  corporate: CorporateQuoteContent
}

export const DEFAULT_CONTENT: SiteContent = {
  promoMessages: [
    '🚚 Next day delivery available!',
    '🍰 Islandwide delivery across Sri Lanka',
    "🎁 Gift something they'll actually love",
    '🍫 Freshly baked to order, never pre-made',
    '♥️ 100% Halal Certified',
  ],
  hero: {
    title: 'Gift something they',
    highlight: 'actually',
    titleAfter: 'love.',
    subtitle:
      'Freshly baked brownies. Islandwide delivery. Made to order — for every little celebration worth sharing.',
    primaryCta: 'Shop All Brownies',
    secondaryCta: 'Corporate Gifting',
  },
  heroSlides: [],
  promoSlides: [],
  sectionVisibility: {
    hotPicks: true,
    trust: true,
    slideshow: true,
    categories: true,
    ctaBanner: true,
    howItWorks: true,
    testimonials: true,
  },
  trust: [
    { icon: '🍫', title: 'Freshly Baked', body: 'Baked to order, never pre-made' },
    { icon: '🚚', title: 'Islandwide Delivery', body: 'Next day delivery available' },
    { icon: '♥️', title: 'Halal Certified', body: '100% halal ingredients' },
  ],
  categories: [
    { emoji: '🍫', title: 'Shop All', body: 'Browse our full collection of freshly baked brownies.', cta: 'Browse All →', to: '/shop' },
    { emoji: '🏢', title: 'Corporate Gifting', body: 'Bulk pricing for teams, events and client gifting.', cta: 'View Range →', to: '/corporate' },
    { emoji: '💍', title: 'For Weddings', body: 'Elegant wedding favours with bulk pricing.', cta: 'Explore →', to: '/corporate' },
    { emoji: '🍰', title: 'Brownie Slab', body: 'Personalise with letter toppers and sparkles.', cta: 'Customise →', to: '/shop' },
  ],
  ctaBanner: {
    title: 'Made for Every Little Win',
    body: 'From birthday boxes to corporate hampers — freshly baked, islandwide delivery, made to order.',
    cta: 'Browse All Brownies →',
  },
  howItWorks: [
    { icon: '1', title: 'Choose a Category', body: 'Browse Shop All, Corporate, Wedding, or Brownie Slab.' },
    { icon: '2', title: 'Pick Your Package', body: 'Select a 9, 12, or 15-piece box, or a slab.' },
    { icon: '3', title: 'Personalise It', body: 'Letter toppers and sparkles on slab orders.' },
    { icon: '4', title: 'We Deliver Fresh', body: 'Baked fresh and delivered to your door, islandwide.' },
  ],
  badges: [
    { icon: '🍫', title: 'Baked Fresh Daily', body: 'Every order baked to order — never stored, never stale' },
    { icon: '🚚', title: 'Islandwide Delivery', body: 'We deliver across Sri Lanka — next day options available' },
    { icon: '🌙', title: '100% Halal', body: 'All ingredients fully halal certified — everyone can enjoy' },
    { icon: '🎁', title: 'Gift-Ready Boxes', body: 'Beautiful packaging — ready to give straight from the box' },
  ],
  testimonialsHeading: { title: 'Little Wins, Big Smiles', sub: 'What our customers are saying.' },
  productInfo: {
    freshness:
      'Baked fresh to order. Best enjoyed within 5 days; keep sealed at room temperature, or refrigerate to keep longer.',
    allergens:
      'Made in a kitchen that handles wheat, dairy, eggs, and nuts. Please tell us about any allergies when you order.',
  },
  seo: {
    siteName: 'Golden Oven Brownies',
    home: {
      title: 'Golden Oven Brownies — Handmade, delivered across Sri Lanka',
      description: 'Freshly baked, made-to-order brownies with islandwide delivery. Gift boxes, corporate hampers, wedding favours, and customisable brownie slabs.',
    },
    shop: {
      title: 'Shop All Brownies — Golden Oven',
      description: 'Browse our full range of freshly baked brownies — classic, premium, and customisable slabs. Islandwide delivery across Sri Lanka.',
    },
    corporate: {
      title: 'Corporate Gifting & Wedding Favours — Golden Oven',
      description: 'Premium brownie boxes for teams, events, and weddings. Bulk pricing and custom packaging. Get a tailored quotation.',
    },
  },
  corporate: {
    heading: 'Corporate & Bulk Gifting',
    intro: 'Freshly baked brownie boxes for teams, events, and client gifting. Tell us what you need and we\'ll get back to you with a tailored quote.',
    productInfo: [
      'Freshly baked to order — never pre-made or stored',
      'Beautiful gift-ready packaging included',
      'Islandwide delivery across Sri Lanka',
      '100% Halal certified ingredients',
    ],
    faq: [
      {
        q: 'How far in advance should I order?',
        a: 'We recommend at least 4 days for orders over 50 pieces. Smaller orders can often be turned around in 2 days — tell us your date and we\'ll confirm.',
      },
      {
        q: 'Can I mix flavours in one order?',
        a: 'Yes! Let us know your preferred flavour split in the message field and we\'ll accommodate where possible.',
      },
      {
        q: 'Do you offer custom packaging or branding?',
        a: 'We offer custom ribbon and gift message options. For branded packaging, contact us directly to discuss.',
      },
    ],
    preOrderNote: 'Orders over 50 pieces require at least 4 days\' notice. Orders over 100 pieces qualify for a bulk discount — we\'ll confirm the rate in your quote.',
    preOrderThreshold: 50,
    preOrderLeadDays: 4,
    discountThreshold: 100,
    banners: [],
  },
}

/** Deep-merge a partial (DB) content object over the defaults so missing keys
 *  always fall back. One level of nesting is enough for this shape. */
export function mergeContent(partial: Partial<SiteContent> | null | undefined): SiteContent {
  if (!partial) return DEFAULT_CONTENT
  return {
    ...DEFAULT_CONTENT,
    ...partial,
    hero: { ...DEFAULT_CONTENT.hero, ...partial.hero },
    ctaBanner: { ...DEFAULT_CONTENT.ctaBanner, ...partial.ctaBanner },
    testimonialsHeading: { ...DEFAULT_CONTENT.testimonialsHeading, ...partial.testimonialsHeading },
    productInfo: { ...DEFAULT_CONTENT.productInfo, ...partial.productInfo },
    seo: {
      ...DEFAULT_CONTENT.seo,
      ...partial.seo,
      home: { ...DEFAULT_CONTENT.seo.home, ...partial.seo?.home },
      shop: { ...DEFAULT_CONTENT.seo.shop, ...partial.seo?.shop },
      corporate: { ...DEFAULT_CONTENT.seo.corporate, ...partial.seo?.corporate },
    },
    promoMessages: partial.promoMessages?.length ? partial.promoMessages : DEFAULT_CONTENT.promoMessages,
    trust: partial.trust?.length ? partial.trust : DEFAULT_CONTENT.trust,
    categories: partial.categories?.length ? partial.categories : DEFAULT_CONTENT.categories,
    howItWorks: partial.howItWorks?.length ? partial.howItWorks : DEFAULT_CONTENT.howItWorks,
    badges: partial.badges?.length ? partial.badges : DEFAULT_CONTENT.badges,
    // heroSlides: an empty array is a valid, meaningful state (fall back to the
    // emoji hero), so keep whatever the DB has rather than substituting defaults.
    heroSlides: partial.heroSlides ?? DEFAULT_CONTENT.heroSlides,
    promoSlides: partial.promoSlides ?? DEFAULT_CONTENT.promoSlides,
    sectionVisibility: { ...DEFAULT_CONTENT.sectionVisibility, ...partial.sectionVisibility },
    corporate: {
      ...DEFAULT_CONTENT.corporate,
      ...partial.corporate,
      productInfo: partial.corporate?.productInfo?.length
        ? partial.corporate.productInfo
        : DEFAULT_CONTENT.corporate.productInfo,
      faq: partial.corporate?.faq?.length
        ? partial.corporate.faq
        : DEFAULT_CONTENT.corporate.faq,
      // banners: an empty array is meaningful (slideshow hidden), so keep the
      // DB value rather than substituting defaults.
      banners: partial.corporate?.banners ?? DEFAULT_CONTENT.corporate.banners,
    },
  }
}
