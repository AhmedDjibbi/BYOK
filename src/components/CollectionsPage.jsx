import { useEffect, useState } from 'react'
import { ArrowRight, ChevronRight } from './Icons'
import { fetchCollections } from '../lib/api'
import { mediaSource, useSiteMedia } from '../hooks/useSiteMedia'
import { collectionsHero, movementBanner, collectionTiles } from '../data/content'
import CatalogueState from './CatalogueState'
import './CollectionsPage.css'

export default function CollectionsPage() {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const media = useSiteMedia()
  const hero = mediaSource(media, 'collections.hero', collectionsHero)
  const movement = mediaSource(media, 'collections.movement', movementBanner)

  const collectionImageFor = (collection) => {
    if (collection.image) return { image: collection.image, alt: collection.name }
    const fallback = collectionTiles.find((tile) => tile.id === collection.slug)
    return mediaSource(media, `collection.${collection.slug}`, fallback ?? movementBanner)
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchCollections({ signal: controller.signal })
      .then(setCollections)
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setError(loadError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  return (
    <div className="collection-page">
      <header className="collection-hero">
        <div
          className="collection-hero__photo"
          style={{ backgroundImage: `url("${hero.image}")` }}
          role="img"
          aria-label={hero.alt}
        />
        <div className="collection-hero__scrim" aria-hidden="true" />

        <div className="container collection-hero__inner">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <ChevronRight size={10} strokeWidth={2} />
            <span aria-current="page">Collections</span>
          </nav>
          <h1 className="collection-hero__title">Collections</h1>
          <p className="collection-hero__tag">Explore our live collections.</p>
        </div>
      </header>

      <div className="container">
        {loading ? (
          <CatalogueState status="loading" message="Loading collections..." />
        ) : error ? (
          <CatalogueState
            status="error"
            title="Collections are offline"
            message={error}
            onRetry={() => {
              setLoading(true)
              setError('')
              fetchCollections().then(setCollections).catch(() => setError('Unable to load collections.')).finally(() => setLoading(false))
            }}
          />
        ) : collections.length === 0 ? (
          <CatalogueState status="empty" message="No collections are available yet." />
        ) : (
          <div className="collection-grid">
            {collections.map((collection) => (
              <a
                className="collection-tile"
                href={`/collections/${collection.slug}`}
                key={collection.id}
              >
                <span className="collection-tile__scrim" aria-hidden="true" />
                <img src={collectionImageFor(collection).image} alt={collectionImageFor(collection).alt} loading="lazy" />
                <span className="collection-tile__body">
                  <span className="collection-tile__title">{collection.name}</span>
                  <span className="collection-tile__meta">
                    {collection.productCount} products
                    <ArrowRight size={18} strokeWidth={1.8} />
                  </span>
                </span>
              </a>
            ))}
          </div>
        )}

        <section className="movement" aria-label="Wear the movement">
          <div className="movement__media">
            <img src={movement.image} alt={movement.alt} loading="lazy" />
          </div>
          <div className="movement__body">
            <span className="movement__watermark" aria-hidden="true">
              BYOC
            </span>
            <h2 className="movement__title">
              Wear the
              <span className="movement__script">Movement</span>
            </h2>
            <p className="movement__tag">Be part of BYOC.</p>
            <a className="movement__cta" href="/store">
              Shop now
              <ArrowRight size={14} />
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
