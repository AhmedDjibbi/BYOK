import { useState } from 'react'
import { heroSlides } from '../data/content'
import { ArrowRight, ChevronDown, ChevronUp, Play } from './Icons'
import './Hero.css'

export default function Hero() {
  const [active, setActive] = useState(0)
  const total = heroSlides.length

  const go = (step) => setActive((index) => (index + step + total) % total)

  return (
    <section className="hero" id="top" aria-label="SS25 new drop">
      {heroSlides.map((slide, index) => (
        <div
          key={slide.image}
          className={`hero__bg${index === active ? ' is-active' : ''}`}
          style={{ backgroundImage: `url("${slide.image}")` }}
          role={index === active ? 'img' : undefined}
          aria-label={index === active ? slide.alt : undefined}
          aria-hidden={index === active ? undefined : true}
        />
      ))}
      <div className="hero__scrim" aria-hidden="true" />

      <div className="container hero__inner">
        <div className="hero__content">
          <p className="hero__eyebrow">
            New drop <span>//</span> SS25
          </p>
          <h1 className="hero__title">
            <span>Urban.</span>
            <span>Raw.</span>
            <span className="hero__title-script">Uncompromising.</span>
          </h1>
          <p className="hero__tagline">More than clothing — a mindset.</p>
          <div className="hero__actions">
            <a className="btn btn--lime" href="#new-drop">
              Shop the drop
              <ArrowRight />
            </a>
            <a className="hero__lookbook" href="#story">
              Explore lookbook
              <span className="hero__play">
                <Play size={12} />
              </span>
            </a>
          </div>
        </div>
      </div>

      <div className="hero__slider">
        <button type="button" onClick={() => go(-1)} aria-label="Previous slide">
          <ChevronUp size={18} />
        </button>
        <div className="hero__counter" aria-live="polite">
          <b>{String(active + 1).padStart(2, '0')}</b>
          <i>/</i>
          <span>{String(total).padStart(2, '0')}</span>
        </div>
        <span className="hero__rule" aria-hidden="true" />
        <button type="button" onClick={() => go(1)} aria-label="Next slide">
          <ChevronDown size={18} />
        </button>
      </div>
    </section>
  )
}
