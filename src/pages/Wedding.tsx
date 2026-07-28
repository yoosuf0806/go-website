import { useCatalog } from '../contexts/CatalogContext'
import QuoteLandingPage from './QuoteLandingPage'

export default function Wedding() {
  const { catalog } = useCatalog()
  const { content } = catalog
  return <QuoteLandingPage category="wedding" content={content.wedding} seo={content.seo.wedding} path="/wedding" />
}
