import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BrandedPageHero from './BrandedPageHero'
import CatalogueState from './CatalogueState'
import ProductCard from './ProductCard'
import { Close } from './Icons'
import { fetchCollections, fetchProducts } from '../lib/api'
import './BrowsePage.css'
import './Store.css'

const pageCopy = {
  search: { title: 'Find your', accent: 'Next Fit', eyebrow: 'BYOC / Search' },
  wishlist: { title: 'Your', accent: 'Wishlist', eyebrow: 'BYOC / Saved pieces' },
}

const sizeTokens = new Set(['xs', 's', 'm', 'l', 'xl', 'xxl'])

const categorySearchTerms = {
  tshirts: 't shirts tshirt tee tees',
  hoodies: 'hoodie hoodies',
  pants: 'pants trousers cargo',
  jackets: 'jacket jackets puffer',
  accessories: 'accessory accessories bag cap',
}

const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const searchableProduct = (product) => {
  const text = normalizeText(
    [
      product.name,
      product.colorway,
      product.category,
      categorySearchTerms[product.category],
      product.badge,
      product.id,
      ...(product.sizes ?? []),
    ]
      .filter(Boolean)
      .join(' '),
  )
  return { text, compact: text.replace(/\s+/g, '') }
}

const matchesSearch = (product, tokens) => {
  if (!tokens.length) return false
  const { text, compact } = searchableProduct(product)
  return tokens.every((token) => {
    if (token.length >= 2) return text.includes(token) || compact.includes(token)
    if (sizeTokens.has(token)) {
      return (product.sizes ?? []).some((size) => size.toLowerCase() === token)
    }
    return false
  })
}

const relevance = (product, query) => {
  if (!query) return 0
  const name = normalizeText(product.name)
  if (name === query) return 3
  if (name.startsWith(query)) return 2
  if (name.includes(query)) return 1
  return 0
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
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [query, setQuery] = useState(initialQuery)
  const searchInputRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([fetchProducts({ signal: controller.signal }), fetchCollections({ signal: controller.signal })])
      .then(([productList, collectionList]) => {
        setProducts(productList)
        setCollections(collectionList)
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
  }, [reload])

  const retry = () => {
    setLoading(true)
    setError('')
    setReload((value) => value + 1)
  }

  const search = useMemo(() => {
    const normalized = normalizeText(query)
    const tokens = normalized ? normalized.split(' ') : []
    const activeTokens = tokens.filter(
      (token) => token.length >= 2 || sizeTokens.has(token),
    )
    return {
      normalized,
      tokens: activeTokens,
      tooShort: type === 'search' && normalized.length === 1 && !sizeTokens.has(normalized),
    }
  }, [query, type])

  const syncSearchUrl = useCallback(
    (value) => {
      if (type !== 'search') return
      const trimmed = value.trim()
      const nextHash = trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search'
      if (window.location.pathname + window.location.search !== nextHash) {
        window.history.replaceState(null, '', nextHash)
      }
    },
    [type],
  )

  useEffect(() => {
    if (type !== 'search') return undefined
    const timer = window.setTimeout(() => syncSearchUrl(query), 300)
    return () => window.clearTimeout(timer)
  }, [query, type, syncSearchUrl])

  useEffect(() => {
    if (type !== 'search') return
    if (window.matchMedia?.('(pointer: fine)').matches) {
      searchInputRef.current?.focus({ preventScroll: true })
    }
  }, [type])

  const matchedCollection = type === 'collection'
    ? collections.find((item) => item.slug === collectionSlug) ?? null
    : null
  const collection = type === 'collection' ? matchedCollection : null
  const copy =
    type === 'collection'
      ? collection
        ? {
            eyebrow: 'BYOC / Collection',
            title: collection.name,
            accent: '',
            subtitle: collection.description || 'Pieces from this BYOC collection.',
            filter: null,
          }
        : null
      : pageCopy[type]
  const filtered = useMemo(() => {
    let result = products
    if (type === 'collection') {
      result = collection
        ? result.filter((product) => product.collection?.slug === collectionSlug)
        : []
    } else if (type === 'wishlist') {
      result = result.filter((product) => wishlistIds.includes(product.id))
    } else if (type === 'search') {
      if (search.tooShort) {
        result = []
      } else if (search.normalized) {
        result = result.filter((product) => matchesSearch(product, search.tokens))
      }
    }

    if (type === 'search' && search.normalized && !search.tooShort) {
      return [...result].sort(
        (a, b) =>
          relevance(b, search.normalized) - relevance(a, search.normalized) ||
          b.added - a.added,
      )
    }

    return [...result].sort((a, b) => b.added - a.added)
  }, [products, type, collection, collectionSlug, wishlistIds, search])

  const submitSearch = (event) => {
    event.preventDefault()
    syncSearchUrl(query)
    if (window.matchMedia?.('(pointer: coarse)').matches) {
      event.currentTarget.querySelector('input')?.blur()
    }
  }

  const clearSearch = () => {
    setQuery('')
    syncSearchUrl('')
    searchInputRef.current?.focus({ preventScroll: true })
  }

  if (!copy) {
    return (
      <section className="container">
        <CatalogueState
          status="empty"
          title="Collection not found"
          message="This collection may have moved or been retired."
          action={<a className="btn btn--outline" href="/collections">Explore collections</a>}
        />
      </section>
    )
  }

  return (
    <div className="browse-page">
      <BrandedPageHero
        eyebrow={copy.eyebrow ?? 'BYOC / Collection'}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
      />
      <section className="container browse-page__content">
        {type === 'search' && (
          <form className="browse-search" role="search" onSubmit={submitSearch}>
            <div className="browse-search__field">
              <label className="visually-hidden" htmlFor="catalogue-search">
                Search products
              </label>
              <input
                ref={searchInputRef}
                id="catalogue-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tees, hoodies, colours..."
                autoComplete="off"
                spellCheck="false"
              />
              {query && (
                <button
                  type="button"
                  className="browse-search__clear"
                  aria-label="Clear search"
                  onClick={clearSearch}
                >
                  <Close size={16} />
                </button>
              )}
              <a className="browse-search__close" href="/" aria-label="Close search">
                ×
              </a>
            </div>
            <span id="search-count" role="status" aria-live="polite">
              {search.tooShort
                ? 'Keep typing'
                : `${filtered.length} ${filtered.length === 1 ? 'result' : 'results'}`}
            </span>
          </form>
        )}
        {loading ? (
          <CatalogueState status="loading" message="Loading products..." />
        ) : error ? (
          <CatalogueState
            status="error"
            title="The catalogue is offline"
            message={error}
            onRetry={retry}
          />
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
          <CatalogueState
            status="empty"
            message={
              type === 'wishlist'
                ? 'Your wishlist is empty. Save pieces you love and they’ll be waiting here.'
                : type === 'search'
                  ? search.tooShort
                    ? 'Search needs at least two characters. Try a product name, colour or size.'
                    : `No pieces found for “${query.trim()}”. Try another name, colour or category.`
                  : 'There are no pieces in this collection just yet.'
            }
            action={<a className="btn btn--outline" href="/store">Explore the store</a>}
          />
        )}
      </section>
    </div>
  )
}
