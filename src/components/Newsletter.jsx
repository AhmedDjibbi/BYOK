import { useState } from 'react'
import { ArrowRight, Envelope, Instagram, TikTok, XLogo, YouTube } from './Icons'
import './Newsletter.css'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!email.trim()) return
    setSent(true)
    setEmail('')
  }

  return (
    <section className="newsletter" aria-label="Newsletter">
      <div className="container newsletter__inner">
        <div className="newsletter__intro">
          <Envelope size={26} className="newsletter__icon" />
          <div>
            <p className="newsletter__title">Join the movement</p>
            <p className="newsletter__sub">Get exclusive drops, updates and special offers.</p>
          </div>
        </div>

        {sent ? (
          <p className="newsletter__success" role="status">
            You&rsquo;re in. Watch your inbox for the next drop.
          </p>
        ) : (
          <form className="newsletter__form" onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              name="email"
              placeholder="Your email address"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" className="btn btn--lime newsletter__submit">
              Subscribe
              <ArrowRight />
            </button>
          </form>
        )}

        <ul className="socials" aria-label="BYOK on social media">
          <li>
            <a href="#footer" aria-label="Instagram">
              <Instagram size={15} />
            </a>
          </li>
          <li>
            <a href="#footer" aria-label="TikTok">
              <TikTok size={14} />
            </a>
          </li>
          <li>
            <a href="#footer" aria-label="YouTube">
              <YouTube size={16} />
            </a>
          </li>
          <li>
            <a href="#footer" aria-label="X">
              <XLogo size={13} />
            </a>
          </li>
        </ul>
      </div>
    </section>
  )
}
