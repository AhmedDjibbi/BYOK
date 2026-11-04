import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from './Icons'
import { fetchProducts } from '../lib/api'
import ProductCard from './ProductCard'
import './Products.css'

export default function Products({ onAddToCart, wishlistIds = [], onToggleWishlist }) {
  const trackRef = useRef(null)
  const [catalogue, setCatalogue] = useState([])
  const [catalogueError, setCatalogueError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetchProducts({ signal: controller.signal })
      .then((list) => {
        setCatalogue(list)
        setCatalogueError(false)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Unable to load featured product stock.', error)
          setCatalogueError(true)
        }
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
          <a className="link-arrow" href="/store?sort=new">
            View all products
            <ChevronRight size={18} />
          </a>
        </div>

        {catalogueError && (
          <p className="products__notice" role="alert">
            Live stock is unavailable right now. Refresh the page to try again.
          </p>
        )}

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
            {catalogue.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                isWishlisted={wishlistIds.includes(product.id)}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
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

