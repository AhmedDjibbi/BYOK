import { useMemo, useState } from 'react'
import Garment from './Garment'
import {
  ChevronDown,
  ChevronRight,
  Heart,
  RotateCcw,
  SlidersHorizontal,
} from './Icons'
import {
  categories,
  colorOptions,
  pageSize,
  priceBounds,
  sizes,
  sortOptions,
  storeCatalogue,
} from '../data/store'
import './Store.css'

const toggleValue = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

export default function Store() {
  const [categoryIds, setCategoryIds] = useState([])
  const [sizeIds, setSizeIds] = useState([])
  const [colorIds, setColorIds] = useState([])
  const [price, setPrice] = useState([priceBounds.min, priceBounds.max])
  const [sort, setSort] = useState('best')
  const [page, setPage] = useState(1)
  const [likedIds, setLikedIds] = useState([])

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

  const toggleLike = (id) => {
    setLikedIds((prev) => toggleValue(prev, id))
  }

  const filtered = useMemo(() => {
    const list = storeCatalogue.filter(
      (product) =>
        (categoryIds.length === 0 || categoryIds.includes(product.category)) &&
        (sizeIds.length === 0 || product.sizes.some((size) => sizeIds.includes(size))) &&
        (colorIds.length === 0 || colorIds.includes(product.color)) &&
        product.price >= price[0] &&
        product.price <= price[1],
    )

    if (sort === 'new') return [...list].sort((a, b) => b.added - a.added)
    if (sort === 'price-asc') return [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') return [...list].sort((a, b) => b.price - a.price)
    return list
  }, [categoryIds, sizeIds, colorIds, price, sort])

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
            <a href="#/">Home</a>
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
              {categories
                .filter((category) => category.id !== 'all')
                .map((category) => (
                  <li key={category.id}>
                    <label className="filter-check">
                      <input
                        type="checkbox"
                        checked={categoryIds.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                      />
                      <span>{category.label}</span>
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
                {startIndex + 1}&ndash;{startIndex + visible.length}
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

          {visible.length > 0 ? (
            <div className="store-grid">
              {visible.map((product) => {
                const liked = likedIds.includes(product.id)
                return (
                  <article className="store-card" key={product.id}>
                    <a className="store-card__media" href="#/store" aria-label={product.name}>
                      <Garment {...product.garment} />
                      {product.badge && (
                        <span className="store-card__badge">{product.badge}</span>
                      )}
                    </a>
                    <button
                      type="button"
                      className={`store-card__wish${liked ? ' is-active' : ''}`}
                      aria-label={
                        liked ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`
                      }
                      aria-pressed={liked}
                      onClick={() => toggleLike(product.id)}
                    >
                      <Heart filled={liked} size={18} />
                    </button>
                    <h3 className="store-card__name">
                      <a href="#/store">{product.name}</a>
                    </h3>
                    <p className="store-card__price">{product.price} TND</p>
                    <ul className="store-card__swatches" aria-label="Available colours">
                      {product.colors.map((color, index) => (
                        <li
                          key={`${product.id}-${index}`}
                          className={`swatch${index === product.activeColor ? ' is-active' : ''}`}
                          style={index === product.activeColor ? { backgroundColor: color } : undefined}
                        />
                      ))}
                    </ul>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="store-empty">
              <p>No products match these filters.</p>
              <button type="button" className="reset-btn" onClick={resetFilters}>
                <RotateCcw size={14} />
                Reset filters
              </button>
            </div>
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
