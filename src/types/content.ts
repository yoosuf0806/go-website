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

// Structured-data business profile. Powers the Organization + LocalBusiness
// JSON-LD emitted site-wide so Google can build a rich Knowledge-Panel /
// business listing. Every field is admin-editable (Admin → Content & SEO →
// "SEO · Business & structured data"); empty fields are simply omitted from the
// emitted schema so we never publish blank/placeholder structured data.
export interface SeoBusiness {
  /** schema.org LocalBusiness subtype, e.g. "Bakery", "FoodEstablishment", "Store". */
  type: string
  /** Registered/legal name (Organization.legalName). Blank falls back to siteName. */
  legalName: string
  telephone: string
  email: string
  /** e.g. "$$" or "Rs. 500 – Rs. 5000". Shown as LocalBusiness.priceRange. */
  priceRange: string
  streetAddress: string
  addressLocality: string
  addressRegion: string
  postalCode: string
  /** ISO country code, e.g. "LK". */
  addressCountry: string
  latitude: string
  longitude: string
  /** Opening hours in schema.org shorthand, one per line, e.g. "Mo-Sa 09:00-18:00". */
  openingHours: string[]
  /** Areas served, e.g. ["Colombo", "Sri Lanka"] — LocalBusiness.areaServed. */
  areaServed: string[]
}

export interface FaqItem {
  q: string
  a: string
}

// A footer policy page (Return Policy, Payment Terms). `body` is plain text;
// blank lines separate paragraphs when rendered. Hidden from the footer when
// the body is empty.
export interface PolicyContent {
  title: string
  body: string
}

// Full-bleed banner hero at the top of a bulk-order landing page (corporate
// or wedding). Optional background image; falls back to a navy gradient.
export interface QuoteHero {
  eyebrow: string
  title: string
  subtitle: string
  cta: string
  imageUrl?: string
}

export interface PricingTier {
  label: string
  price: string
}

// Shared shape for the Corporate Orders and Wedding Orders landing pages:
// hero banner, trust-stat strip, "everything handled for you" section,
// occasions grid, pricing section, and the existing flavour-picker + quote
// request form. Corporate and wedding each get their own fully independent
// instance of this content.
export interface QuoteLandingContent {
  hero: QuoteHero
  /** Trust-stat strip (e.g. "50+ Minimum Order"). Reuses IconCard: icon = emoji, title = big stat, body = label. */
  stats: IconCard[]
  handledHeading: string
  handledImageUrl?: string
  handledItems: string[]
  handledCta: string
  occasionsHeading: string
  occasions: OccasionCard[]
  pricingTitle: string
  pricingTiers: PricingTier[]
  heading: string
  intro: string
  productInfo: string[]
  faq: FaqItem[]
  preOrderNote: string
  preOrderThreshold: number
  preOrderLeadDays: number
  discountThreshold: number
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
    gallery?: boolean
    giftReady?: boolean
  }
  /** Shared photo gallery shown on Home, Wedding, and Corporate. Admin-uploaded
   *  image URLs; empty (or gallery visibility off) hides the section. */
  gallery: string[]
  galleryHeading: string
  trust: IconCard[]
  categories: OccasionCard[]
  ctaBanner: CtaBanner
  /** Homepage "Build your own slab" card. Admin-editable copy + image. */
  homeSlab: { eyebrow: string; title: string; body: string; cta: string; imageUrl: string | null }
  /** Homepage "It arrives gift-ready" card. Admin-editable copy + its own image
   *  list; empty images falls back to product photos so it never renders blank. */
  homeGiftReady: { eyebrow: string; title: string; body: string; images: string[] }
  /** Homepage "Corporate" band (the navy strip). Admin-editable copy + CTA. */
  homeCorporate: { eyebrow: string; title: string; body: string; cta: string }
  /** Homepage FAQ — admin add/edit/delete; hidden when empty. */
  homeFaq: FaqItem[]
  /** Footer policy pages (return + payment terms). Rendered at /policies/:slug. */
  policies: { returns: PolicyContent; payment: PolicyContent }
  howItWorks: IconCard[]
  badges: IconCard[]
  testimonialsHeading: { title: string; sub: string }
  productInfo: { freshness: string; allergens: string }
  seo: {
    siteName: string
    /** Default social-share (Open Graph / Twitter) image + Organization/
     *  LocalBusiness logo. Absolute URL or an uploaded image URL. Blank falls
     *  back to /og-default.png (share) and the site logo is omitted. */
    defaultImageUrl?: string
    logoUrl?: string
    /** Business profile powering Organization + LocalBusiness structured data. */
    business: SeoBusiness
    /** Social / external profile URLs (schema.org sameAs), e.g. Instagram,
     *  Facebook, Google Business. Blank entries are ignored. */
    sameAs: string[]
    home: SeoMeta
    shop: SeoMeta
    corporate: SeoMeta
    wedding: SeoMeta
    slab: SeoMeta
  }
  corporate: QuoteLandingContent
  wedding: QuoteLandingContent
  /** Brownie Slab landing page (/slab): banner, how-it-works, flavour picker
   *  (driven live by slab-enabled products), product gallery, and FAQ. */
  slab: SlabLandingContent
}

// Brownie Slab landing page content. The flavour list itself is NOT stored
// here — it's read live from slab-enabled products; this holds only the
// editable copy, banner image, gallery images, and FAQ.
export interface SlabLandingContent {
  banner: {
    eyebrow: string
    title: string
    subtitle: string
    cta: string
    imageUrl?: string
  }
  /** "How it works" strip. Reuses IconCard: icon = emoji, title, body. */
  howItWorks: IconCard[]
  flavoursHeading: string
  flavoursIntro: string
  galleryHeading: string
  /** Admin-managed gallery image URLs. Empty = gallery section hidden. */
  gallery: string[]
  faqHeading: string
  faq: FaqItem[]
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
    gallery: true,
  },
  gallery: [],
  galleryHeading: 'View our Gallery',
  trust: [
    { icon: '🍫', title: 'Freshly Baked', body: 'Baked to order, never pre-made' },
    { icon: '🚚', title: 'Islandwide Delivery', body: 'Next day delivery available' },
    { icon: '♥️', title: 'Halal Certified', body: '100% halal ingredients' },
  ],
  categories: [
    { emoji: '🍫', title: 'Shop All', body: 'Browse our full collection of freshly baked brownies.', cta: 'Browse All →', to: '/shop' },
    { emoji: '💍', title: 'Wedding Orders', body: 'Favours and gifting for engagements, showers, and receptions.', cta: 'View Range →', to: '/wedding' },
    { emoji: '🏢', title: 'Corporate Orders', body: 'Bulk pricing for teams, events, and client gifting.', cta: 'View Range →', to: '/corporate' },
    { emoji: '🍰', title: 'Brownie Slab', body: 'Personalise with letter toppers and sparkles.', cta: 'Customise →', to: '/shop' },
  ],
  ctaBanner: {
    title: 'Made for Every Little Win',
    body: 'From birthday boxes to corporate hampers — freshly baked, islandwide delivery, made to order.',
    cta: 'Browse All Brownies →',
  },
  homeCorporate: {
    eyebrow: 'Corporate',
    title: '50 boxes. One invoice.',
    body: 'Branded toppers, scheduled delivery, formal quotation.',
    cta: 'Request a Quote',
  },
  homeSlab: {
    eyebrow: 'Free lettering',
    title: 'Build your own slab',
    body: '9, 12 or 15 pieces. Your flavours, their name on top.',
    cta: 'Build Your Slab',
    imageUrl: null,
  },
  homeGiftReady: {
    eyebrow: 'Gift-ready',
    title: 'It arrives gift-ready',
    body: 'Red box, white satin ribbon, foil wordmark. Nothing to re-wrap.',
    images: [],
  },
  homeFaq: [
    { q: 'How much notice do you need?', a: 'Most orders need 2–3 days. Slabs and bulk/corporate orders are best placed a week ahead, especially for a specific delivery date.' },
    { q: 'Do you deliver islandwide?', a: 'Yes — we deliver across Sri Lanka. Colombo and suburbs are usually next-day; other areas may take a little longer. We confirm timing on WhatsApp.' },
    { q: 'How do I pay?', a: 'There is no card checkout on the site. You place the order here, we confirm everything on WhatsApp, and settle by bank transfer or cash on delivery.' },
    { q: 'Are the brownies halal?', a: 'Yes — all our ingredients are 100% halal certified.' },
  ],
  policies: {
    returns: {
      title: 'Return & Refund Policy',
      body: 'Because every order is freshly baked to order, we cannot accept returns of the brownies themselves for change of mind.\n\nIf something is wrong with your order — the wrong items, damage in transit, or a quality issue — contact us on WhatsApp within 24 hours of delivery with a photo. We will replace the order or arrange a refund.\n\nRefunds, where agreed, are made to your original payment method (bank transfer reversal or the arrangement agreed at checkout) within 5 business days.\n\nFor cancellations: orders can be cancelled for a full refund up until baking begins. Once an order is in production we may not be able to cancel it, as ingredients have already been prepared.',
    },
    payment: {
      title: 'Payment Terms',
      body: 'Golden Oven does not take card payments on this website. You place your order here, we confirm the details and total with you on WhatsApp, and payment is settled directly.\n\nAccepted methods: bank transfer and cash on delivery. For corporate and bulk orders, we issue a formal invoice and accept bank transfer against it.\n\nOrders are confirmed once payment (or, for cash on delivery, confirmation) is received. Prices are in Sri Lankan Rupees (LKR) and include applicable taxes unless stated otherwise.\n\nFor bulk and corporate orders, payment terms are set out on the quotation we provide.',
    },
  },
  howItWorks: [
    { icon: '1', title: 'Choose a Category', body: 'Browse Shop All, Bulk Orders, or Brownie Slab.' },
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
    defaultImageUrl: '',
    logoUrl: '',
    business: {
      type: 'Bakery',
      legalName: 'Golden Oven Brownies',
      telephone: '',
      email: '',
      priceRange: 'Rs.',
      streetAddress: '',
      addressLocality: 'Colombo',
      addressRegion: 'Western Province',
      postalCode: '',
      addressCountry: 'LK',
      latitude: '',
      longitude: '',
      openingHours: [],
      areaServed: ['Sri Lanka'],
    },
    sameAs: [],
    home: {
      title: 'Golden Oven Brownies — Handmade, delivered across Sri Lanka',
      description: 'Freshly baked, made-to-order brownies with islandwide delivery. Gift boxes, corporate hampers, wedding favours, and customisable brownie slabs.',
    },
    shop: {
      title: 'Shop All Brownies — Golden Oven',
      description: 'Browse our full range of freshly baked brownies — classic, premium, and customisable slabs. Islandwide delivery across Sri Lanka.',
    },
    corporate: {
      title: 'Corporate Gifting — Golden Oven',
      description: 'Premium brownie boxes for teams, events, and client gifting. Bulk pricing and custom packaging. Get a tailored quotation.',
    },
    wedding: {
      title: 'Wedding Favours & Gifting — Golden Oven',
      description: 'Brownie favours and gifting for engagements, bridal showers, and wedding receptions. Bulk pricing and custom packaging.',
    },
    slab: {
      title: 'Brownie Slab — Golden Oven',
      description: 'One big shareable brownie slab, freshly baked in your choice of flavour. Perfect for celebrations, offices, and gifting. Add letter toppers free.',
    },
  },
  corporate: {
    hero: {
      eyebrow: 'Corporate Gifting',
      title: "Gift Your Team Something They'll Actually Love.",
      subtitle: 'Bulk brownie boxes for offices, events, client appreciation and corporate celebrations. Islandwide delivery available.',
      cta: 'Get a Corporate Quote',
    },
    stats: [
      { icon: '📦', title: '50+', body: 'Minimum Order' },
      { icon: '🍫', title: '5', body: 'Flavours Available' },
      { icon: '🚀', title: 'Next Day', body: 'Delivery Available' },
      { icon: '💯', title: '100%', body: 'Halal Certified' },
    ],
    handledHeading: 'Everything Handled for You.',
    handledItems: [
      'Bulk pricing on all orders 50+',
      'Custom quantities per box',
      'Branded message cards available',
      'Gift ribbon packaging',
      'Scheduled delivery to your office or venue',
      'Invoice provided for company records',
    ],
    handledCta: 'Start Your Order',
    occasionsHeading: 'Occasions We Cover',
    occasions: [
      { emoji: '🎉', title: 'Year End Parties', body: 'Reward your team with something sweet', cta: '', to: '/corporate' },
      { emoji: '💼', title: 'Client Appreciation', body: 'A gift they’ll remember', cta: '', to: '/corporate' },
      { emoji: '👩‍💼', title: "Women's Day", body: 'Celebrate the women in your team', cta: '', to: '/corporate' },
      { emoji: '🎂', title: 'Office Birthdays', body: 'Make every birthday feel special', cta: '', to: '/corporate' },
      { emoji: '🤝', title: 'New Client Welcome', body: 'Start the relationship sweetly', cta: '', to: '/corporate' },
      { emoji: '🏆', title: 'Team Milestones', body: 'Celebrate wins, big and small', cta: '', to: '/corporate' },
    ],
    pricingTitle: 'Bulk Pricing',
    pricingTiers: [
      { label: '50 – 99 pcs', price: 'Standard per-piece rate' },
      { label: '100 – 249 pcs', price: 'Bulk discount applied' },
      { label: '250+ pcs', price: 'Custom quote — contact us' },
    ],
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
  },
  wedding: {
    hero: {
      eyebrow: 'Wedding Orders',
      title: "Wedding Favours They'll Actually Love.",
      subtitle: 'Brownie favours and gifting for engagements, bridal showers, welcome bags and wedding receptions. Islandwide delivery available.',
      cta: 'Get a Wedding Quote',
    },
    stats: [
      { icon: '📦', title: '50+', body: 'Minimum Order' },
      { icon: '🍫', title: '5', body: 'Flavours Available' },
      { icon: '🚀', title: 'Next Day', body: 'Delivery Available' },
      { icon: '💯', title: '100%', body: 'Halal Certified' },
    ],
    handledHeading: 'Everything Handled for You.',
    handledItems: [
      'Bulk pricing on all favour orders',
      'Custom quantities per favour box',
      'Personalised message cards & wedding tags',
      'Elegant ribbon packaging',
      'Scheduled delivery to your venue',
      'Invoice provided for planners & couples',
    ],
    handledCta: 'Start Your Order',
    occasionsHeading: 'Occasions We Cover',
    occasions: [
      { emoji: '💍', title: 'Engagement Parties', body: 'Sweeten the celebration', cta: '', to: '/wedding' },
      { emoji: '🥂', title: 'Bridal Showers', body: 'A treat for the bride’s day', cta: '', to: '/wedding' },
      { emoji: '💒', title: 'Wedding Receptions', body: 'Favours your guests will love', cta: '', to: '/wedding' },
      { emoji: '🎁', title: 'Welcome Gifts', body: 'Greet your guests sweetly', cta: '', to: '/wedding' },
      { emoji: '🙏', title: 'Thank-You Favours', body: 'Show your appreciation', cta: '', to: '/wedding' },
      { emoji: '💕', title: 'Anniversary Celebrations', body: 'Celebrate another year of love', cta: '', to: '/wedding' },
    ],
    pricingTitle: 'Wedding Pricing',
    pricingTiers: [
      { label: '50 – 99 pcs', price: 'Standard per-piece rate' },
      { label: '100 – 249 pcs', price: 'Bulk discount applied' },
      { label: '250+ pcs', price: 'Custom quote — contact us' },
    ],
    heading: 'Wedding Favours & Gifting',
    intro: 'Freshly baked brownie favours for engagements, showers, and receptions. Tell us what you need and we\'ll get back to you with a tailored quote.',
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
        q: 'Do you offer custom packaging or branding for the wedding?',
        a: 'We offer custom ribbon, gift tags, and message card options. For fully branded packaging, contact us directly to discuss.',
      },
    ],
    preOrderNote: 'Orders over 50 pieces require at least 4 days\' notice. Orders over 100 pieces qualify for a bulk discount — we\'ll confirm the rate in your quote.',
    preOrderThreshold: 50,
    preOrderLeadDays: 4,
    discountThreshold: 100,
  },
  slab: {
    banner: {
      eyebrow: 'The Brownie Slab',
      title: 'One big slab. Every bit shareable.',
      subtitle: 'A generous, freshly baked brownie slab in your choice of flavour — cut it your way, top it with a free letter message, and make any table the centrepiece.',
      cta: 'Choose your flavour',
      imageUrl: undefined,
    },
    howItWorks: [
      { icon: '🍫', title: 'Pick a flavour', body: 'Choose from our slab-ready brownie flavours.' },
      { icon: '✍️', title: 'Add a message', body: 'Free letter toppers — spell out a name or a note.' },
      { icon: '🚚', title: 'Freshly delivered', body: 'Baked to order and delivered islandwide.' },
    ],
    flavoursHeading: 'Choose your flavour',
    flavoursIntro: 'Every one of these can be ordered as a full slab.',
    galleryHeading: 'Our slab gallery',
    gallery: [],
    faqHeading: 'Brownie slab FAQ',
    faq: [
      {
        q: 'How big is a brownie slab?',
        a: 'The slab is a single large brownie made to share — sized to serve a group. Exact piece counts are shown on each flavour when you order.',
      },
      {
        q: 'Can I add a message on top?',
        a: 'Yes — letter toppers are free and built in. Spell out a name, a date, or a short message.',
      },
      {
        q: 'How much notice do you need?',
        a: 'Slabs are baked fresh to order. We recommend ordering at least a day ahead; larger orders may need more lead time.',
      },
    ],
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
    homeCorporate: { ...DEFAULT_CONTENT.homeCorporate, ...partial.homeCorporate },
    homeSlab: { ...DEFAULT_CONTENT.homeSlab, ...partial.homeSlab },
    homeGiftReady: {
      ...DEFAULT_CONTENT.homeGiftReady,
      ...partial.homeGiftReady,
      // An empty list is a valid "use product photos as fallback" state, so keep
      // whatever the admin saved rather than substituting defaults.
      images: partial.homeGiftReady?.images ?? DEFAULT_CONTENT.homeGiftReady.images,
    },
    // homeFaq: an empty array is a valid "hide the FAQ" state, so keep whatever
    // the admin saved rather than substituting defaults.
    homeFaq: partial.homeFaq ?? DEFAULT_CONTENT.homeFaq,
    policies: {
      returns: { ...DEFAULT_CONTENT.policies.returns, ...partial.policies?.returns },
      payment: { ...DEFAULT_CONTENT.policies.payment, ...partial.policies?.payment },
    },
    testimonialsHeading: { ...DEFAULT_CONTENT.testimonialsHeading, ...partial.testimonialsHeading },
    productInfo: { ...DEFAULT_CONTENT.productInfo, ...partial.productInfo },
    seo: {
      ...DEFAULT_CONTENT.seo,
      ...partial.seo,
      business: { ...DEFAULT_CONTENT.seo.business, ...partial.seo?.business },
      // sameAs: keep whatever the admin saved (an empty list is valid), else defaults.
      sameAs: partial.seo?.sameAs ?? DEFAULT_CONTENT.seo.sameAs,
      home: { ...DEFAULT_CONTENT.seo.home, ...partial.seo?.home },
      shop: { ...DEFAULT_CONTENT.seo.shop, ...partial.seo?.shop },
      corporate: { ...DEFAULT_CONTENT.seo.corporate, ...partial.seo?.corporate },
      wedding: { ...DEFAULT_CONTENT.seo.wedding, ...partial.seo?.wedding },
      slab: { ...DEFAULT_CONTENT.seo.slab, ...partial.seo?.slab },
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
    // gallery: an empty array is a valid "hide the gallery" state, so keep the
    // DB value as-is rather than substituting defaults.
    gallery: partial.gallery ?? DEFAULT_CONTENT.gallery,
    galleryHeading: partial.galleryHeading || DEFAULT_CONTENT.galleryHeading,
    sectionVisibility: { ...DEFAULT_CONTENT.sectionVisibility, ...partial.sectionVisibility },
    corporate: mergeQuoteLanding(DEFAULT_CONTENT.corporate, partial.corporate),
    wedding: mergeQuoteLanding(DEFAULT_CONTENT.wedding, partial.wedding),
    slab: mergeSlabLanding(DEFAULT_CONTENT.slab, partial.slab),
  }
}

/** Merge a partial SlabLandingContent over defaults. gallery is intentionally
 *  preserved as-is (an empty array is a valid "hide the gallery" state), while
 *  howItWorks/faq fall back to defaults when the DB left them empty. */
function mergeSlabLanding(base: SlabLandingContent, partial?: Partial<SlabLandingContent>): SlabLandingContent {
  if (!partial) return base
  return {
    ...base,
    ...partial,
    banner: { ...base.banner, ...partial.banner },
    howItWorks: partial.howItWorks?.length ? partial.howItWorks : base.howItWorks,
    faq: partial.faq?.length ? partial.faq : base.faq,
    gallery: partial.gallery ?? base.gallery,
  }
}

/** Merge a partial QuoteLandingContent (corporate or wedding) over its defaults,
 *  falling back to the default list for any array the DB left empty. */
function mergeQuoteLanding(base: QuoteLandingContent, partial?: Partial<QuoteLandingContent>): QuoteLandingContent {
  if (!partial) return base
  return {
    ...base,
    ...partial,
    hero: { ...base.hero, ...partial.hero },
    stats: partial.stats?.length ? partial.stats : base.stats,
    handledItems: partial.handledItems?.length ? partial.handledItems : base.handledItems,
    occasions: partial.occasions?.length ? partial.occasions : base.occasions,
    pricingTiers: partial.pricingTiers?.length ? partial.pricingTiers : base.pricingTiers,
    productInfo: partial.productInfo?.length ? partial.productInfo : base.productInfo,
    faq: partial.faq?.length ? partial.faq : base.faq,
  }
}
