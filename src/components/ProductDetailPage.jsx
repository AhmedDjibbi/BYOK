import { useEffect, useMemo, useState } from 'react'
import { Heart } from './Icons'
import Garment from './Garment'
import BrandedPageHero from './BrandedPageHero'
import CatalogueState from './CatalogueState'
import { usePageMeta } from '../hooks/usePageMeta.js'
import { apiRequest, fetchProducts } from '../lib/api'
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
  const [reload, setReload] = useState(0)
  const [selectedId, setSelectedId] = useState(productId)
  const [selectedSize, setSelectedSize] = useState('')
  const [added, setAdded] = useState(false)
  const [reviews, setReviews] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchProducts({ signal: controller.signal })
      .then(setProducts)
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
  }, [reload])

  const retry = () => {
    setLoading(true)
    setError('')
    setReload((value) => value + 1)
  }

  const product = products.find((item) => item.id === selectedId)
  const variants = useMemo(
    () => (product ? products.filter((item) => item.name === product.name) : []),
    [product, products],
  )
  useEffect(() => {
    if (!product) return undefined
    const controller = new AbortController()
    apiRequest(`/products/${encodeURIComponent(product.id)}/reviews`, { signal: controller.signal })
      .then((data) => setReviews(data.reviews ?? []))
      .catch(() => setReviews([]))
    return () => controller.abort()
  }, [product])

  useEffect(() => {
    apiRequest('/auth/me', { credentials: 'include' })
      .then((data) => setCurrentUser(data.user ?? null))
      .catch(() => setCurrentUser(null))
  }, [])

  const submitReview = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    try {
      await apiRequest('/reviews', {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-csrf-token': (document.cookie.match(/(?:^|; )csrf_token=([^;]+)/) || [])[1] ?? '' },
        body: {
          productId: product.id,
          rating: Number(new FormData(form).get('rating')),
          title: new FormData(form).get('title'),
          body: new FormData(form).get('body'),
        },
      })
      setReviews((await apiRequest(`/products/${encodeURIComponent(product.id)}/reviews`)).reviews ?? [])
      form.reset()
    } catch (submissionError) {
      alert(submissionError.message)
    }
  }


  usePageMeta({
    title: product ? `${product.name} | BYOC` : 'Product | BYOC',
    description: product
      ? `${product.name} by BYOC in ${product.colorway}.`
      : 'Product details from BYOC.',
  })

  useEffect(() => {
    if (!product) {
      document.getElementById('byok-product-jsonld')?.remove()
      return
    }
    let script = document.getElementById('byok-product-jsonld')
    if (!script) {
      script = document.createElement('script')
      script.id = 'byok-product-jsonld'
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: 'TND',
        availability: Object.values(product.stockBySize ?? {}).some((value) => value > 0)
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
    })
    return () => {
      document.getElementById('byok-product-jsonld')?.remove()
    }
  }, [product])

  if (loading) {
    return (
      <section className="container">
        <CatalogueState status="loading" message="Loading product..." />
      </section>
    )
  }
  if (error) {
    return (
      <section className="container">
        <CatalogueState
          status="error"
          title="This product could not load"
          message={error}
          onRetry={retry}
          action={<a className="btn btn--outline" href="/store">Back to the store</a>}
        />
      </section>
    )
  }
  if (!product) {
    return (
      <section className="container">
        <CatalogueState
          status="empty"
          title="Product not found"
          message="This piece may have sold out or moved."
          action={<a className="btn btn--outline" href="/store">Back to the store</a>}
        />
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
        eyebrow="BYOC / Product"
        title={product.name}
        subtitle="Made to move differently."
      />
      <div className="container product-detail__layout">
        <div className="product-detail__visual">
          <Garment {...product.garment} />
          <span className="product-detail__color-tag">{product.colorway}</span>
        </div>
        <section className="product-detail__info" aria-labelledby="product-title">
          <p className="section-label">
            {product.collection ? (
              <a href={`/collections/${product.collection.slug}`}>{product.collection.name}</a>
            ) : (
              product.category.replace('-', ' ')
            )}
          </p>
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
            A BYOC everyday essential. Expressive streetwear with a comfortable fit, made for your rotation.
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
                    window.history.replaceState(null, '', `/product/${variant.id}`)
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

          <div className="product-detail__reviews">
            <h3>
              Reviews
              {product.ratingCount ? ` (${product.ratingCount}, ${product.ratingAverage} stars)` : ''}
            </h3>
            {!reviews.length && <p>No published reviews yet.</p>}
            <ul>
              {reviews.map((review) => (
                <li key={review.id}>
                  <strong>{review.author}</strong> {'·'} {review.rating}/5
                  {review.verifiedPurchase && <span> · verified purchase</span>}
                  {review.title && <p>{review.title}</p>}
                  <p>{review.body}</p>
                </li>
              ))}
            </ul>
            {currentUser ? (
              <form className="cart-checkout" onSubmit={submitReview}>
                <label>
                  Rating
                  <select name="rating" defaultValue="5">
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </label>
                <label>
                  Title
                  <input name="title" maxLength="120" />
                </label>
                <label>
                  Review
                  <textarea name="body" rows="3" maxLength="2000" required />
                </label>
                <button type="submit" className="btn btn--lime">Submit review</button>
              </form>
            ) : (
              <a href="/account">Sign in to leave a review</a>
            )}
          </div>

          <div className="product-detail__notes">
            <p><strong>Cash on delivery</strong><span>Pay when your order arrives.</span></p>
            <p><strong>Need help?</strong><a href="/faq">Read our FAQs</a></p>
          </div>
        </section>
      </div>
    </div>
  )
}
