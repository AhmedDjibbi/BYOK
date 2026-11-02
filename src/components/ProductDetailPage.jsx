import { useEffect, useMemo, useState } from 'react'
import { Heart } from './Icons'
import Garment from './Garment'
import BrandedPageHero from './BrandedPageHero'
import './ProductDetailPage.css'
import './Store.css'

export default function ProductDetailPage({
  productId,
  onAddToCart,
  wishlistIds,
  onToggleWishlist,
}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(productId)
  const [selectedSize, setSelectedSize] = useState('')
  const [added, setAdded] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/products', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('The product could not be loaded.')
        const data = await response.json()
        if (!Array.isArray(data.products)) throw new Error('The product catalogue is unavailable.')
        setProducts(data.products)
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') {
          console.error('Unable to load product details.', loadError)
          setError(loadError.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const product = products.find((item) => item.id === selectedId)
  const variants = useMemo(
    () => (product ? products.filter((item) => item.name === product.name) : []),
    [product, products],
  )

  if (loading) {
    return <p className="container product-detail__status" role="status">Loading product...</p>
  }
  if (error || !product) {
    return (
      <section className="container product-detail__status" role="alert">
        <h1>{error || 'Product not found.'}</h1>
        <a className="btn btn--outline" href="#/store">Back to the store</a>
      </section>
    )
  }

  const activeSize = product.sizes.includes(selectedSize)
    ? selectedSize
    : product.sizes.includes('M')
      ? 'M'
      : product.sizes[0] ?? ''
  const availableSizes = product.stockBySize ?? {}
  const selectedSizeAvailable = (availableSizes[activeSize] ?? 0) > 0
  const wishlisted = wishlistIds.includes(product.id)

  return (
    <div className="product-detail">
      <BrandedPageHero
        eyebrow="BYOK / Product"
        title={product.name}
        subtitle="Made to move differently."
      />
      <div className="container product-detail__layout">
        <div className="product-detail__visual">
          <Garment {...product.garment} />
          <span className="product-detail__color-tag">{product.colorway}</span>
        </div>
        <section className="product-detail__info" aria-labelledby="product-title">
          <p className="section-label">{product.category.replace('-', ' ')}</p>
          <div className="product-detail__title-row">
            <h2 id="product-title">{product.name}</h2>
            <button
              type="button"
              className={`product-detail__wish${wishlisted ? ' is-active' : ''}`}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={wishlisted}
              onClick={() => onToggleWishlist(product.id)}
            >
              <Heart filled={wishlisted} size={22} />
            </button>
          </div>
          <p className="product-detail__price">{product.price} TND</p>
          <p className="product-detail__description">
            A BYOK everyday essential. Expressive streetwear with a comfortable fit, made for your rotation.
          </p>

          <div className="product-detail__option">
            <p>Colour <span>{product.colorway}</span></p>
            <div className="product-detail__colors" role="group" aria-label="Choose colour">
              {variants.map((variant) => (
                <button
                  type="button"
                  key={variant.id}
                  className={`product-detail__color${variant.id === product.id ? ' is-active' : ''}`}
                  style={{ backgroundColor: variant.color }}
                  aria-label={variant.colorway}
                  aria-pressed={variant.id === product.id}
                  onClick={() => {
                    setSelectedId(variant.id)
                    window.history.replaceState(null, '', `#/product/${variant.id}`)
                    setAdded(false)
                  }}
                />
              ))}
            </div>
          </div>

          <div className="product-detail__option">
            <p>Size <span>{activeSize}</span></p>
            <div className="product-detail__sizes" role="group" aria-label="Choose size">
              {product.sizes.map((size) => (
                <button
                  type="button"
                  key={size}
                  className={activeSize === size ? 'is-active' : ''}
                  aria-pressed={activeSize === size}
                  disabled={(availableSizes[size] ?? 0) < 1}
                  aria-label={(availableSizes[size] ?? 0) > 0 ? size : `${size}, out of stock`}
                  onClick={() => {
                    setSelectedSize(size)
                    setAdded(false)
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn btn--lime product-detail__add"
            disabled={!selectedSizeAvailable}
            onClick={() => {
              onAddToCart({ ...product, size: activeSize })
              setAdded(true)
            }}
          >
            {added ? 'Added to your bag' : selectedSizeAvailable ? 'Add to bag' : 'Out of stock'}
          </button>
          {added && <p className="product-detail__feedback" role="status">Added — your bag is ready.</p>}

          <div className="product-detail__notes">
            <p><strong>Cash on delivery</strong><span>Pay when your order arrives.</span></p>
            <p><strong>Need help?</strong><a href="#/faq">Read our FAQs</a></p>
          </div>
        </section>
      </div>
    </div>
  )
}
