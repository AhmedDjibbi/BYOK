import { collections } from '../data/content'
import { ArrowRight } from './Icons'
import './Collections.css'

export default function Collections() {
  return (
    <section className="section collections" id="collections">
      <div className="container">
        <div className="section-head">
          <div>
            <p className="section-label">Shop by collection</p>
            <h2 className="section-title">Find Your Style</h2>
          </div>
        </div>

        <div className="collections__grid">
          {collections.map((collection) => (
            <a className="collection" key={collection.id} href="#/collections">
              <img src={collection.image} alt={collection.alt} loading="lazy" />
              <span className="collection__body">
                <span className="collection__title">{collection.title}</span>
                <span className="collection__cta">
                  Shop now
                  <ArrowRight />
                </span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
