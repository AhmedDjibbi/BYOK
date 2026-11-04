import { useEffect, useMemo, useState } from 'react'
import ProductCard from './ProductCard'
import CatalogueState from './CatalogueState'
import { ChevronDown, ChevronRight, RotateCcw, SlidersHorizontal } from './Icons'
import {
  colorOptions,
  pageSize,
  priceBounds,
  sizes,
  sortOptions,
} from '../data/store'
import { fetchCollections, fetchProducts } from '../lib/api'
import './Store.css'

const validSortIds = new Set(sortOptions.map((option) => option.id))

const parseCategoryParam = (value, validIds = new Set()) =>
  String(value || '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => validIds.has(id))

const parseSortParam = (value) => (validSortIds.has(value) ? value : 'best')

const toggleValue = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

export default function Store({
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
  initialCategory = '',
  initialSort = 'best',
  featuredOnly = false,
}) {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [catalogueError, setCatalogueError] = useState(false)
  const [reload, setReload] = useState(0)
  const [availableCollections, setAvailableCollections] = useState([])
  const [categoryIds, setCategoryIds] = useState(() => [])
  const [sizeIds, setSizeIds] = useState([])
  const [colorIds, setColorIds] = useState([])
  const [price, setPrice] = useState([priceBounds.min, priceBounds.max])
  const [sort, setSort] = useState(() => parseSortParam(initialSort))
  const [page, setPage] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    fetchCollections({ signal: controller.signal })
      .then(setAvailableCollections)
      .catch(() => setAvailableCollections([]))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const valid = new Set(availableCollections.map((collection) => collection.slug))
    const parsed = parseCategoryParam(initialCategory, valid)
    if (valid.size > 0) setCategoryIds(parsed)
    else if (!availableCollections.length) setCategoryIds(parseCategoryParam(initialCategory))
  }, [availableCollections, initialCategory])

  useEffect(() => {
    const controller = new AbortController()

    const loadProducts = async () => {
      try {
        const list = await fetchProducts({ signal: controller.signal })
        setProducts(list)
        setCatalogueError(false)
      } catch (error) {
        if (error.name === 'AbortError') return
        console.error('Unable to load the product catalogue.', error)
        setCatalogueError(true)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadProducts()
    return () => controller.abort()
  }, [reload])

  // Keep the address bar in sync so filtered views survive a refresh and can be shared.
  useEffect(() => {
    const params = new URLSearchParams()
    if (categoryIds.length) params.set('category', categoryIds.join(','))
    if (sort !== 'best') params.set('sort', sort)
    if (featuredOnly) params.set('featured', '1')
    const query = params.toString()
    const nextHash = `/store${query ? `?${query}` : ''}`
    if (window.location.pathname + window.location.search !== nextHash) {
      window.history.replaceState(null, '', nextHash)
    }
  }, [categoryIds, sort, featuredOnly])

  const resetPage = () => setPage(1)

  const toggleCategory = (id) => {
    resetPage()
    setCategoryIds((prev) => toggleValue(prev, id))
  }

  const toggleSize = (id) => {
    resetPage()
    setSizeIds((prev) => toggleValue(prev, id))
  }

  const toggleColor = (id) => {
    resetPage()
    setColorIds((prev) => toggleValue(prev, id))
  }

  const updatePrice = (which, value) => {
    resetPage()
    setPrice(([low, high]) =>
      which === 'min'
        ? [Math.min(value, high - 10), high]
        : [low, Math.max(value, low + 10)],
    )
  }

  const resetFilters = () => {
    setCategoryIds([])
    setSizeIds([])
    setColorIds([])
    setPrice([priceBounds.min, priceBounds.max])
    setSort('best')
    setPage(1)
  }

  const filtered = useMemo(() => {
    const list = products.filter(
      (product) =>
        (!featuredOnly || Boolean(product.badge)) &&
        (categoryIds.length === 0 || categoryIds.includes(product.collection?.slug ?? product.category)) &&
        (sizeIds.length === 0 || product.sizes.some((size) => sizeIds.includes(size))) &&
        (colorIds.length === 0 || colorIds.includes(product.color)) &&
        product.price >= price[0] &&
        product.price <= price[1],
    )

    if (sort === 'new') return [...list].sort((a, b) => b.added - a.added)
    if (sort === 'price-asc') return [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') return [...list].sort((a, b) => b.price - a.price)
    return list
  }, [products, categoryIds, sizeIds, colorIds, price, sort, featuredOnly])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const startIndex = (currentPage - 1) * pageSize
  const visible = filtered.slice(startIndex, startIndex + pageSize)

  const rangeMin = ((price[0] - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100
  const rangeMax = ((price[1] - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100

  return (
    <div className="store-page">
      <header className="store-hero">
        <div
          className="store-hero__photo"
          style={{ backgroundImage: "url('/images/store-hero.jpg')" }}
          aria-hidden="true"
        />
        <div className="store-hero__scrim" aria-hidden="true" />

        <div className="container store-hero__inner">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <ChevronRight size={10} strokeWidth={2} />
            <span aria-current="page">Shop</span>
          </nav>
          <h1 className="store-hero__title">Store</h1>
          <p className="store-hero__tag">Wear the movement.</p>
        </div>
      </header>

      <div className="container store-layout">
        <aside className="store-filters" aria-label="Product filters">
          <div className="filters-head">
            <h2>Filters</h2>
            <SlidersHorizontal size={20} />
          </div>

          <div className="filter-group">
            <h3>Category</h3>
            <ul className="filter-list">
              <li>
                <label className="filter-check">
                  <input
                    type="checkbox"
                    checked={categoryIds.length === 0}
                    onChange={() => {
                      resetPage()
                      setCategoryIds([])
                    }}
                  />
                  <span>All Products</span>
                </label>
              </li>
              {availableCollections.map((collection) => (
                <li key={collection.slug}>
                  <label className="filter-check">
                    <input
                      type="checkbox"
                      checked={categoryIds.includes(collection.slug)}
                      onChange={() => toggleCategory(collection.slug)}
                    />
                    <span>{collection.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="filter-group">
            <h3>Size</h3>
            <ul className="filter-list">
              {sizes.map((size) => (
                <li key={size}>
                  <label className="filter-check">
                    <input
                      type="checkbox"
                      checked={sizeIds.includes(size)}
                      onChange={() => toggleSize(size)}
                    />
                    <span>{size}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="filter-group">
            <h3>Color</h3>
            <div className="swatches" role="group" aria-label="Filter by colour">
              {colorOptions.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className={`swatch-btn${colorIds.includes(color.hex) ? ' is-active' : ''}`}
                  style={{ backgroundColor: color.hex }}
                  aria-label={color.label}
                  aria-pressed={colorIds.includes(color.hex)}
                  onClick={() => toggleColor(color.hex)}
                />
              ))}
            </div>
          </div>

          <div className="filter-group filter-group--price">
            <h3>Price Range</h3>
            <div className="price-range">
              <span className="price-range__rail" aria-hidden="true" />
              <span
                className="price-range__fill"
                style={{ left: `${rangeMin}%`, right: `${100 - rangeMax}%` }}
                aria-hidden="true"
              />
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={10}
                value={price[0]}
                aria-label="Minimum price"
                onChange={(event) => updatePrice('min', Number(event.target.value))}
              />
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={10}
                value={price[1]}
                aria-label="Maximum price"
                onChange={(event) => updatePrice('max', Number(event.target.value))}
              />
            </div>
            <p className="price-label">
              {price[0]} DT &mdash; {price[1]} DT
            </p>
          </div>

          <button type="button" className="reset-btn" onClick={resetFilters}>
            <RotateCcw size={14} />
            Reset filters
          </button>
        </aside>

        <section className="store-main" aria-label="Products">
          <div className="store-topbar">
            <p className="store-count">
              Showing{' '}
              <strong>
                {filtered.length ? `${startIndex + 1}–${startIndex + visible.length}` : '0'}
              </strong>{' '}
              of <strong>{filtered.length}</strong> products
            </p>

            <label className="sort-select">
              <span>Sort by:</span>
              <select
                value={sort}
                aria-label="Sort products"
                onChange={(event) => {
                  setSort(event.target.value)
                  resetPage()
                }}
              >
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} strokeWidth={2} />
            </label>
          </div>

          {isLoading ? (
            <CatalogueState status="loading" message="Loading products..." />
          ) : catalogueError ? (
            <CatalogueState
              status="error"
              title="The catalogue is offline"
              message="Products are unavailable. Check that the API is running and the catalogue is seeded."
              onRetry={() => {
                setIsLoading(true)
                setReload((value) => value + 1)
              }}
            />
          ) : visible.length > 0 ? (
            <div className="store-grid">
              {visible.map((product) => (
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
              message="No products match these filters."
              action={
                <button type="button" className="reset-btn" onClick={resetFilters}>
                  <RotateCcw size={14} />
                  Reset filters
                </button>
              }
            />
          )}

          {pageCount > 1 && (
            <nav className="pagination" aria-label="Pagination">
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button
                  key={number}
                  type="button"
                  className={`page-btn${number === currentPage ? ' is-active' : ''}`}
                  aria-label={`Page ${number}`}
                  aria-current={number === currentPage ? 'page' : undefined}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              ))}
              <button
                type="button"
                className="page-btn page-btn--next"
                aria-label="Next page"
                disabled={currentPage >= pageCount}
                onClick={() => setPage(Math.min(currentPage + 1, pageCount))}
              >
                <ChevronRight size={15} />
              </button>
            </nav>
          )}
        </section>
      </div>
    </div>
  )
}
