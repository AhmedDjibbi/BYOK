import { collectionTiles, collectionsHero, movementBanner } from '../data/content'
import { ArrowRight, ChevronRight } from './Icons'
import './CollectionsPage.css'

export default function CollectionsPage() {
  return (
    <div className="collection-page">
      <header className="collection-hero">
        <div
          className="collection-hero__photo"
          style={{ backgroundImage: `url("${collectionsHero.image}")` }}
          role="img"
          aria-label={collectionsHero.alt}
        />
        <div className="collection-hero__scrim" aria-hidden="true" />

        <div className="container collection-hero__inner">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href="#/">Home</a>
            <ChevronRight size={10} strokeWidth={2} />
            <span aria-current="page">Collections</span>
          </nav>
          <h1 className="collection-hero__title">Collections</h1>
          <p className="collection-hero__tag">Explore our signature collections.</p>
        </div>
      </header>

      <div className="container">
        <div className="collection-grid">
          {collectionTiles.map((tile) => (
            <a
              className="collection-tile"
              href={`#/store?category=${tile.id === 'tshirts' ? 'tshirts' : tile.id === 'cargo-pants' ? 'pants' : tile.id.startsWith('puffer') ? 'jackets' : tile.id}`}
              key={tile.id}
            >
              <img src={tile.image} alt={tile.alt} loading="lazy" />
              <span className="collection-tile__scrim" aria-hidden="true" />
              <span className="collection-tile__body">
                <span className="collection-tile__title">{tile.title}</span>
                <span className="collection-tile__meta">
                  {tile.count} products
                  <ArrowRight size={18} strokeWidth={1.8} />
                </span>
              </span>
            </a>
          ))}
        </div>

        <section className="movement" aria-label="Wear the movement">
          <div className="movement__media">
            <img src={movementBanner.image} alt={movementBanner.alt} loading="lazy" />
          </div>

          <div className="movement__body">
            <span className="movement__watermark" aria-hidden="true">
              BYOK
            </span>
            <h2 className="movement__title">
              Wear the
              <span className="movement__script">Movement</span>
            </h2>
            <p className="movement__tag">Be part of BYOK.</p>
            <a className="movement__cta" href="#/collections/essentials">
              Shop now
              <ArrowRight size={14} />
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
