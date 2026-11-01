import { storyImage } from '../data/content'
import { ArrowRight } from './Icons'
import './Story.css'

export default function Story() {
  return (
    <section className="story" id="story">
      <div className="story__media">
        <img src={storyImage.image} alt={storyImage.alt} loading="lazy" />
      </div>

      <div className="story__body">
        <span className="story__watermark" aria-hidden="true">
          BYOK
        </span>

        <div className="story__content">
          <p className="section-label">Our story</p>
          <h2 className="story__title">
            Built for
            <span className="story__script">Dreamers</span>
          </h2>
          <p className="story__text">
            BYOK is more than a brand. It&rsquo;s a movement for the bold, the
            creative, and the unstoppable.
          </p>
          <a className="btn btn--outline" href="#/about">
            Discover our story
            <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  )
}
