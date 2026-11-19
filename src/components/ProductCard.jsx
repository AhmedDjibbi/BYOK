import { Heart } from './Icons'
import Garment from './Garment'
import QuickAddButton from './QuickAddButton'
import { mediaSource, useSiteMedia } from '../hooks/useSiteMedia'

export default function ProductCard({
  product,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
}) {
  const defaultSize =
    product.sizes.find((size) => (product.stockBySize?.[size] ?? 0) > 0) ??
    (product.sizes.includes('M') ? 'M' : product.sizes[0])
  const available = (product.stockBySize?.[defaultSize] ?? 0) > 0
  const media = useSiteMedia()
  const photo = mediaSource(media, `product.${product.id}`, {
    image: null,
    alt: `${product.name} — ${product.colorway}`,
  })

  return (
    <article className="store-card">
      <a className="store-card__media" href={`/product/${product.id}`} aria-label={product.name}>
        {photo.image ? (
          <img src={photo.image} alt={photo.alt || product.name} loading="lazy" />
        ) : (
          <Garment {...product.garment} />
        )}
        {product.badge && <span className="store-card__badge">{product.badge}</span>}
      </a>
      <button
        type="button"
        className={`store-card__wish${isWishlisted ? ' is-active' : ''}`}
        aria-label={
          isWishlisted
            ? `Remove ${product.name} (${product.colorway}) from wishlist`
            : `Add ${product.name} (${product.colorway}) to wishlist`
        }
        aria-pressed={isWishlisted}
        onClick={() => onToggleWishlist(product.id)}
      >
        <Heart filled={isWishlisted} size={18} />
      </button>
      <div className="store-card__info-row">
        <h3 className="store-card__name">
          <a href={`/product/${product.id}`}>{product.name}</a>
        </h3>
        <QuickAddButton
          productName={product.name}
          disabled={!available}
          onClick={() => onAddToCart({ ...product, size: defaultSize })}
        />
      </div>
      <p className="store-card__price">{product.price} TND</p>
      {product.ratingCount > 0 && (
        <p className="store-card__rating">
          {product.ratingAverage} ★ · {product.ratingCount} review
          {product.ratingCount === 1 ? '' : 's'}
        </p>
      )}
      {!available && <p className="store-card__stock">Out of stock</p>}
      {product.collection?.name && (
        <span className="store-card__collection">{product.collection.name}</span>
      )}
      <ul className="store-card__swatches" aria-label={`Colour: ${product.colorway}`}>
        <li
          className="swatch is-active"
          style={{ backgroundColor: product.color }}
          aria-label={product.colorway}
        />
      </ul>
    </article>
  )
}
