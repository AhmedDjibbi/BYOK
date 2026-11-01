import { useState } from 'react'
import { footerNav } from '../data/content'
import { ChevronDown, Truck } from './Icons'
import './Footer.css'

const languages = ['عربى', 'English', 'Français']

const footerHrefs = { Shop: '#/store', About: '#/about' }

export default function Footer() {
  const [language, setLanguage] = useState('عربى')
  const [open, setOpen] = useState(false)

  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer__top">
          <a className="logo footer__logo" href="#/" aria-label="BYOK home">
            BYOK
          </a>

          <nav className="footer__nav" aria-label="Footer navigation">
            {footerNav.map((item) => (
              <a key={item} href={footerHrefs[item] ?? '#footer'}>
                {item}
              </a>
            ))}
          </nav>

          <div className="footer__extras">
            <span className="cod" title="Cash on delivery">
              COD
            </span>
            <span className="delivery">
              <Truck size={21} />
              <span>
                Fast Delivery
                <br />
                Across Tunisia
              </span>
            </span>

            <div
              className="lang"
              onMouseLeave={() => setOpen(false)}
            >
              <button
                type="button"
                className="lang__button"
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={() => setOpen((value) => !value)}
              >
                {language}
                <ChevronDown size={11} />
              </button>
              <ul className={`lang__menu${open ? ' is-open' : ''}`} role="listbox">
                {languages.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={language === item}
                      onClick={() => {
                        setLanguage(item)
                        setOpen(false)
                      }}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container">
          <p>© 2025 BYOK. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
