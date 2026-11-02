import { useEffect, useRef, useState } from 'react'
import { products } from '../data/content'
import { storeCatalogue } from '../data/store'
import { ArrowRight, ChevronLeft, ChevronRight, Heart } from './Icons'
import QuickAddButton from './QuickAddButton'
import './Products.css'

export default function Products({ onAddToCart, wishlistIds = [], onToggleWishlist }) {
  const trackRef = useRef(null)
  const [catalogue, setCatalogue] = useState([])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/products', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load current product stock.')
        const data = await response.json()
        if (!Array.isArray(data.products)) throw new Error('The product catalogue is unavailable.')
        setCatalogue(data.products)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') console.error('Unable to load featured product stock.', error)
      })
    return () => controller.abort()
  }, [])

  const scrollByCard = (direction) => {
    const track = trackRef.current
    if (!track) return
    const card = track.firstElementChild
    const step = card ? card.getBoundingClientRect().width + 20 : 320
    track.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  return (
    <section className="section products" id="new-drop">
      <div className="container">
        <div className="section-head">
          <div>
            <p className="section-label">Featured collection</p>
            <h2 className="section-title">The New Drop</h2>
          </div>
          <a className="link-arrow" href="#/store?sort=new">
            View all products
            <ArrowRight />
          </a>
        </div>

        <div className="products__carousel">
          <button
            type="button"
            className="carousel-btn carousel-btn--prev"
            aria-label="Previous products"
            onClick={() => scrollByCard(-1)}
          >
            <ChevronLeft size={18} />
          </button>

          <div className="products__track" ref={trackRef}>
            {products.map((product) => {
              const fallbackProduct = storeCatalogue.find((item) =>
                item.id.startsWith(`${product.id}-`),
              )
              const storeProduct =
                catalogue.find((item) => item.name === product.name) ?? fallbackProduct
              const defaultSize =
                storeProduct?.sizes.find((size) => (storeProduct.stockBySize?.[size] ?? 0) > 0) ??
                (storeProduct?.sizes.includes('M') ? 'M' : storeProduct?.sizes[0])
              const available = Boolean(
                catalogue.length &&
                  storeProduct &&
                  (storeProduct.stockBySize?.[defaultSize] ?? 0) > 0,
              )
              const liked = storeProduct && wishlistIds.includes(storeProduct.id)
              return (
                <article className="product" key={product.id}>
                  <span className="product__media">
                    <img src={product.image} alt={product.alt} loading="lazy" />
                    {product.badge && <span className="product__badge">{product.badge}</span>}
                  </span>
                  <button
                    type="button"
                    className={`product__wish${liked ? ' is-active' : ''}`}
                    aria-label={
                      liked
                        ? `Remove ${product.name} from wishlist`
                        : `Add ${product.name} to wishlist`
                    }
                    aria-pressed={liked}
                    disabled={!storeProduct}
                    onClick={() => storeProduct && onToggleWishlist(storeProduct.id)}
                  >
                    <Heart filled={liked} size={19} />
                  </button>
                  <div className="product__info-row">
                    <h3 className="product__name">
                      <a href={storeProduct ? `#/product/${storeProduct.id}` : '#new-drop'}>
                        {product.name}
                      </a>
                    </h3>
                    <QuickAddButton
                      productName={product.name}
                      disabled={!available}
                      onClick={() =>
                        available &&
                        onAddToCart({ ...storeProduct, size: defaultSize, image: product.image })
                      }
                    />
                  </div>
                  <p className="product__price">{product.price}</p>
                  <ul className="product__colors" aria-label="Available colours">
                    {product.colors.map((color, index) => (
                      <li
                        key={color}
                        className={`swatch${index === product.activeColor ? ' is-active' : ''}`}
                        style={index === product.activeColor ? { backgroundColor: color } : undefined}
                      />
                    ))}
                  </ul>
                </article>
              )
            })}
          </div>

          <button
            type="button"
            className="carousel-btn carousel-btn--next"
            aria-label="Next products"
            onClick={() => scrollByCard(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  )
}
