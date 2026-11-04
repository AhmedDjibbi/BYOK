import { useEffect, useRef, useState } from 'react'
import { fetchCollections } from '../lib/api'
import { ArrowRight, ChevronLeft, ChevronRight } from './Icons'
import CatalogueState from './CatalogueState'
import './Collections.css'

export default function Collections() {
  const trackRef = useRef(null)
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const scrollByCard = (direction) => {
    const track = trackRef.current
    if (!track) return
    const card = track.firstElementChild
    const step = card ? card.getBoundingClientRect().width + 16 : 300
    track.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  return (
    <section className="section collections" id="collections">
      <div className="container">
        <div className="section-head">
          <div>
            <p className="section-label">Shop by collection</p>
            <h2 className="section-title">Find Your Style</h2>
          </div>
        </div>

        {loading ? (
          <CatalogueState status="loading" message="Loading collections..." />
        ) : error ? (
          <CatalogueState status="error" title="Collections are offline" message={error} />
        ) : (
          <div className="collections__carousel">
            <button
              type="button"
              className="carousel-btn carousel-btn--prev"
              aria-label="Previous collections"
              onClick={() => scrollByCard(-1)}
            >
              <ChevronLeft size={18} />
            </button>

            <div className="collections__track" ref={trackRef}>
              {collections.map((collection) => (
                <a
                  className="collection"
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                >
                  <span className="collection__body">
                    <span className="collection__title">{collection.name}</span>
                    <span className="collection__cta">
                      {collection.productCount} pieces
                      <ArrowRight />
                    </span>
                  </span>
                </a>
              ))}
            </div>

            <button
              type="button"
              className="carousel-btn carousel-btn--next"
              aria-label="Next collections"
              onClick={() => scrollByCard(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
