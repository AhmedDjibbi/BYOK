import { useEffect, useMemo, useState } from 'react'
import BrandedPageHero from './BrandedPageHero'
import ProductCard from './ProductCard'
import './BrowsePage.css'
import './Store.css'

const collectionInfo = {
  'new-drop': {
    title: 'The New Drop',
    accent: 'Just landed',
    subtitle: 'Fresh pieces from the BYOK collection.',
    filter: (product, allProducts) =>
      allProducts.some((candidate) => candidate.name === product.name && candidate.badge),
  },
  essentials: {
    title: 'Streetwear',
    accent: 'Essentials',
    subtitle: 'The everyday pieces that make your rotation.',
    filter: (product) => ['tshirts', 'hoodies', 'pants'].includes(product.category),
  },
  archive: {
    title: 'The',
    accent: 'Archive',
    subtitle: 'Explore the full BYOK catalogue.',
    filter: () => true,
  },
  accessories: {
    title: 'BYOK',
    accent: 'Accessories',
    subtitle: 'Finish the fit with the details.',
    filter: (product) => product.category === 'accessories',
  },
}

const pageCopy = {
  search: { title: 'Find your', accent: 'Next Fit', eyebrow: 'BYOK / Search' },
  wishlist: { title: 'Your', accent: 'Wishlist', eyebrow: 'BYOK / Saved pieces' },
}

export default function BrowsePage({
  type,
  collectionSlug,
  initialQuery = '',
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState(initialQuery)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/products', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('The product catalogue is unavailable.')
        const data = await response.json()
        if (!Array.isArray(data.products)) throw new Error('The product catalogue is unavailable.')
        setProducts(data.products)
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') {
          console.error('Unable to load browse products.', loadError)
          setError(loadError.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const collection = type === 'collection' ? collectionInfo[collectionSlug] : null
  const copy = collection ?? pageCopy[type]
  const filtered = useMemo(() => {
    let result = products
    if (type === 'collection') {
      result = collection
        ? result.filter((product) => collection.filter(product, products))
        : []
    } else if (type === 'wishlist') {
      result = result.filter((product) => wishlistIds.includes(product.id))
    } else if (type === 'search' && query.trim()) {
      const searchTerm = query.trim().toLowerCase()
      result = result.filter((product) =>
        `${product.name} ${product.colorway} ${product.category}`.toLowerCase().includes(searchTerm),
      )
    }

    return [...result].sort((a, b) => b.added - a.added)
  }, [products, type, collection, wishlistIds, query])

  if (!copy) {
    return (
      <section className="container browse-empty">
        <h1>Collection not found.</h1>
        <a className="btn btn--outline" href="#/collections">Explore collections</a>
      </section>
    )
  }

  return (
    <div className="browse-page">
      <BrandedPageHero
        eyebrow={copy.eyebrow ?? 'BYOK / Collection'}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
      />
      <section className="container browse-page__content">
        {type === 'search' && (
          <form className="browse-search" onSubmit={(event) => event.preventDefault()}>
            <label className="visually-hidden" htmlFor="catalogue-search">Search products</label>
            <input
              id="catalogue-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tees, hoodies, colours..."
            />
            <span>{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</span>
          </form>
        )}
        {loading ? (
          <p className="store-status" role="status">Loading products...</p>
        ) : error ? (
          <p className="browse-page__message" role="alert">{error}</p>
        ) : filtered.length ? (
          <div className="store-grid">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                isWishlisted={wishlistIds.includes(product.id)}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        ) : (
          <div className="browse-page__empty">
            <p>
              {type === 'wishlist'
                ? 'Your wishlist is empty. Save pieces you love and they’ll be waiting here.'
                : type === 'search'
                  ? 'No pieces found. Try another name, category or colour.'
                  : 'There are no pieces in this collection just yet.'}
            </p>
            <a className="btn btn--outline" href="#/store">Explore the store</a>
          </div>
        )}
      </section>
    </div>
  )
}
