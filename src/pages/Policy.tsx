import { useParams, Link } from 'react-router-dom'
import { useCatalog } from '../contexts/CatalogContext'
import Seo from '../components/Seo'

// Static policy pages (Return Policy, Payment Terms) linked from the footer.
// Content is admin-editable (content.policies.*); the body is plain text with
// blank lines separating paragraphs. Unknown slugs fall through to a not-found
// message rather than erroring.
const SLUGS = {
  returns: 'returns',
  payment: 'payment',
} as const

export default function Policy() {
  const { slug } = useParams<{ slug: string }>()
  const { catalog } = useCatalog()
  const { policies } = catalog.content

  const key = slug === SLUGS.returns ? 'returns' : slug === SLUGS.payment ? 'payment' : null
  const policy = key ? policies[key] : null

  if (!policy) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-display text-2xl text-navy">Page not found</h1>
        <Link to="/" className="mt-4 inline-block text-sm text-pink hover:underline">
          Back to home
        </Link>
      </div>
    )
  }

  const paragraphs = policy.body.split(/\n\s*\n/).filter((p) => p.trim() !== '')

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <Seo
        title={`${policy.title} — ${catalog.content.seo.siteName}`}
        description={paragraphs[0]?.slice(0, 155) ?? policy.title}
        path={`/policies/${slug}`}
      />
      <nav className="flex items-center gap-2 text-[13px] text-neutral-400">
        <Link to="/" className="hover:text-pink">
          Home
        </Link>
        <span>/</span>
        <span className="text-neutral-500">{policy.title}</span>
      </nav>
      <h1 className="mt-4 font-display text-[clamp(1.9rem,4vw,2.75rem)] leading-tight text-navy">{policy.title}</h1>
      <div className="mt-6 flex flex-col gap-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-line text-[15px] leading-relaxed text-neutral-600 md:text-base">
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}
