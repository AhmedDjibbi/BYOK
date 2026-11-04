import { useEffect, useState } from 'react'
import { mainNav } from '../data/content'
import {
  Cart,
  ChevronDown,
  Close,
  Heart,
  Menu,
  Search,
  User,
} from './Icons'
import './Header.css'

export default function Header({
  page = 'home',
  currentUser = null,
  cartCount = 0,
  wishlistCount = 0,
  onOpenCart,
}) {
  const activeLabel =
    {
      home: 'Home',
      store: 'Shop',
      collections: 'Collections',
      about: 'About',
      order: 'Track Order',
    }[page] ?? ''
  const navItems = currentUser
    ? [
        ...mainNav.slice(0, -1),
        { label: 'Track Order', href: '/order' },
        mainNav[mainNav.length - 1],
      ]
    : mainNav
  const [stuck, setStuck] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 30)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return undefined

    const close = () => setMenuOpen(false)
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close()
    }
    const onResize = () => {
      if (window.innerWidth > 1020) close()
    }

    window.addEventListener('hashchange', close)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('hashchange', close)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [menuOpen])

  return (
    <header className={`site-header${stuck ? ' is-stuck' : ''}`}>
      <div className="container header__inner">
        <a className="logo" href="/" aria-label="BYOC home">
          BYOC
        </a>

        <nav className="nav" aria-label="Main navigation">
          <ul className="nav__list">
            {navItems.map((item) => (
              <li
                key={item.label}
                className={`nav__item${item.menu ? ' has-menu' : ''}`}
              >
                <a
                  className={`nav__link${item.label === activeLabel ? ' is-active' : ''}`}
                  aria-current={item.label === activeLabel ? 'page' : undefined}
                  href={item.href}
                >
                  {item.label}
                  {item.menu && <ChevronDown size={11} strokeWidth={2} />}
                </a>
                {item.menu && (
                  <ul className="nav__menu">
                    {item.menu.map((sub) => (
                      <li key={sub.label}>
                        <a href={sub.href}>{sub.label}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="header__actions">
          <a className="icon-btn" href="/search" aria-label="Search">
            <Search />
          </a>
          <a
            className="icon-btn header__wish"
            href="/wishlist"
            aria-label={`Wishlist, ${wishlistCount} saved ${wishlistCount === 1 ? 'item' : 'items'}`}
          >
            <Heart />
          </a>
          <a className="icon-btn header__account" href="/account" aria-label="Your BYOC account">
            <User />
          </a>
          <button
            type="button"
            className="icon-btn cart"
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
            onClick={onOpenCart}
          >
            <Cart />
            <span className="cart__count">{cartCount}</span>
          </button>
          <button
            type="button"
            className="icon-btn header__burger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <Close size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <div id="mobile-navigation" className={`mobile-nav${menuOpen ? ' is-open' : ''}`}>
        <nav aria-label="Mobile navigation">
          <ul className="mobile-nav__list">
            {navItems.map((item) => (
              <li key={item.label}>
                <a href={item.href} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </a>
                {item.menu && (
                  <ul className="mobile-nav__sublist">
                    {item.menu.map((sub) => (
                      <li key={sub.label}>
                        <a href={sub.href} onClick={() => setMenuOpen(false)}>
                          {sub.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="mobile-nav__foot">
            <a href="/account" onClick={() => setMenuOpen(false)}>
              {currentUser ? 'Your account' : 'Sign in'}
            </a>
            <a href="/returns" onClick={() => setMenuOpen(false)}>
              Returns &amp; Exchanges
            </a>
            <a href="/shipping" onClick={() => setMenuOpen(false)}>
              Shipping
            </a>
            <a href="/contact" onClick={() => setMenuOpen(false)}>
              Contact
            </a>
          </div>
        </nav>
      </div>
    </header>
  )
}
