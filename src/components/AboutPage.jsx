import {
  aboutHero,
  aboutJoin,
  aboutStats,
  aboutStory,
  aboutValues,
} from '../data/content'
import {
  ArrowRight,
  Bolt,
  ChevronRight,
  Community,
  Crown,
  Diamond,
  Globe,
} from './Icons'
import './AboutPage.css'

const valueIcons = {
  diamond: Diamond,
  bolt: Bolt,
  community: Community,
  globe: Globe,
}

export default function AboutPage() {
  return (
    <div className="about-page">
      <header className="about-hero">
        <div
          className="about-hero__photo"
          style={{ backgroundImage: `url("${aboutHero.image}")` }}
          role="img"
          aria-label={aboutHero.alt}
        />
        <div className="about-hero__scrim" aria-hidden="true" />

        <div className="container about-hero__inner">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href="#/">Home</a>
            <ChevronRight size={10} strokeWidth={2} />
            <span aria-current="page">About</span>
          </nav>
          <h1 className="about-hero__title">About us</h1>
          <p className="about-hero__tag">More than clothing &mdash; a movement.</p>
        </div>
      </header>

      <div className="container">
        <section className="about-story" aria-labelledby="about-story-title">
          <div className="about-story__media">
            <img src={aboutStory.image} alt={aboutStory.alt} loading="lazy" />
          </div>

          <div className="about-story__body">
            <p className="about-eyebrow">Our story</p>
            <h2 className="about-story__title" id="about-story-title">
              Born from
              <span>Passion.</span>
            </h2>
            <div className="about-story__text">
              <p>
                BYOK was created for those who never settle.
                <br />
                For the dreamers, the builders, the ones who move different.
              </p>
              <p>
                We blend streetwear with a bold mindset &mdash; inspired by
                culture, creativity and the future.
              </p>
              <p>More than just clothes, BYOK is a lifestyle.</p>
            </div>
          </div>
        </section>

        <section className="about-why" aria-labelledby="about-why-title">
          <p className="about-eyebrow about-eyebrow--center">Why BYOK?</p>
          <h2 className="about-why__title" id="about-why-title">
            More than just fashion
          </h2>

          <ul className="about-values">
            {aboutValues.map((value) => {
              const Icon = valueIcons[value.icon]
              return (
                <li className="about-value" key={value.id}>
                  <Icon size={30} strokeWidth={1.4} />
                  <h3 className="about-value__title">{value.title}</h3>
                  <p className="about-value__text">{value.text}</p>
                </li>
              )
            })}
          </ul>

          <div className="about-stats">
            <ul className="about-stats__list">
              {aboutStats.map((stat) => (
                <li className="about-stat" key={stat.id}>
                  <span className="about-stat__value">{stat.value}</span>
                  <span className="about-stat__label">{stat.label}</span>
                </li>
              ))}
              <li className="about-stat about-stat--script">
                <Crown size={30} strokeWidth={1.5} />
                <span className="about-stat__script">And counting&hellip;</span>
              </li>
            </ul>
          </div>
        </section>
      </div>

      <section className="about-join" aria-labelledby="about-join-title">
        <img
          className="about-join__photo"
          src={aboutJoin.image}
          alt={aboutJoin.alt}
          loading="lazy"
        />
        <div className="about-join__scrim" aria-hidden="true" />

        <div className="container about-join__inner">
          <h2 className="about-join__title" id="about-join-title">
            Join the
            <span className="about-join__script">Movement</span>
          </h2>
          <p className="about-join__tag">Wear BYOK. Be different.</p>
          <a className="btn btn--lime" href="#/store">
            Shop now
            <ArrowRight />
          </a>
        </div>
      </section>
    </div>
  )
}
