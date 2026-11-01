import { useRef, useState } from 'react'
import { products } from '../data/content'
import { ArrowRight, ChevronLeft, ChevronRight, Heart } from './Icons'
import './Products.css'

export default function Products() {
  const trackRef = useRef(null)
  const [wishlist, setWishlist] = useState([])

  const toggleWish = (id) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

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
          <a className="link-arrow" href="#new-drop">
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
              const liked = wishlist.includes(product.id)
              return (
                <article className="product" key={product.id}>
                  <span className="product__media">
                    <img src={product.image} alt={product.alt} loading="lazy" />
                    {product.badge && <span className="product__badge">{product.badge}</span>}
                  </span>
                  <button
                    type="button"
                    className={`product__wish${liked ? ' is-active' : ''}`}
                    aria-label={liked ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                    aria-pressed={liked}
                    onClick={() => toggleWish(product.id)}
                  >
                    <Heart filled={liked} size={19} />
                  </button>
                  <h3 className="product__name">
                    <a href="#new-drop">{product.name}</a>
                  </h3>
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
