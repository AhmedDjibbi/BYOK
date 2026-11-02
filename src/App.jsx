import { useCallback, useEffect, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import Products from './components/Products'
import Collections from './components/Collections'
import Story from './components/Story'
import Store from './components/Store'
import CollectionsPage from './components/CollectionsPage'
import AboutPage from './components/AboutPage'
import Newsletter from './components/Newsletter'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import ProductDetailPage from './components/ProductDetailPage'
import BrowsePage from './components/BrowsePage'
import JournalPage from './components/JournalPage'
import InfoPage from './components/InfoPage'
import AdminPage from './components/AdminPage'

const routeFromHash = (hash) => {
  const path = hash.toLowerCase().split('?')[0]
  if (path.startsWith('#/product/')) return 'product'
  if (path.startsWith('#/store')) return 'store'
  if (path === '#/collections') return 'collections'
  if (path.startsWith('#/collections/')) return 'collection'
  if (path.startsWith('#/about')) return 'about'
  if (path.startsWith('#/search')) return 'search'
  if (path.startsWith('#/wishlist')) return 'wishlist'
  if (path.startsWith('#/journal')) return 'journal'
  if (path.startsWith('#/contact')) return 'contact'
  if (path.startsWith('#/faq')) return 'faq'
  if (path.startsWith('#/shipping')) return 'shipping'
  if (path.startsWith('#/returns')) return 'returns'
  if (path.startsWith('#/admin')) return 'admin'
  return 'home'
}

export default function App() {
  const [locationHash, setLocationHash] = useState(window.location.hash || '#/')
  const page = routeFromHash(locationHash)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [wishlistIds, setWishlistIds] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('byok-wishlist') || '[]')
      return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []
    } catch (error) {
      console.error('Unable to read the saved wishlist.', error)
      return []
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem('byok-wishlist', JSON.stringify(wishlistIds))
    } catch (error) {
      console.error('Unable to save the wishlist.', error)
    }
  }, [wishlistIds])

  useEffect(() => {
    const sync = () => {
      const target = window.location.hash.replace(/^#\/?/, '')
      setLocationHash(window.location.hash || '#/')
      const next = routeFromHash(window.location.hash)

      if (next !== 'home') {
        window.scrollTo({ top: 0 })
        return
      }

      if (!target || target === 'top') {
        window.scrollTo({ top: 0 })
        return
      }

      window.setTimeout(() => {
        document.getElementById(target)?.scrollIntoView()
      }, 40)
    }

    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const toggleWishlist = useCallback((id) => {
    setWishlistIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    )
  }, [])

  const addToCart = useCallback((product) => {
    const cartKey = `${product.id}::${product.size ?? ''}`
    setCart((items) => {
      const existing = items.find((item) => item.cartKey === cartKey)
      if (existing) {
        if (existing.quantity >= 10) return items
        return items.map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }

      return [...items, { ...product, cartKey, quantity: 1 }]
    })
    setCartOpen(true)
  }, [])

  const updateCartQuantity = useCallback((id, quantity) => {
    setCart((items) =>
      quantity === 0
        ? items.filter((item) => item.cartKey !== id)
        : quantity <= 10
          ? items.map((item) => (item.cartKey === id ? { ...item, quantity } : item))
          : items,
    )
  }, [])

  const removeFromCart = useCallback((id) => {
    setCart((items) => items.filter((item) => item.cartKey !== id))
  }, [])

  const closeCart = useCallback(() => setCartOpen(false), [])
  const clearCart = useCallback(() => setCart([]), [])
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const query = new URLSearchParams(locationHash.split('?')[1] ?? '')
  const collectionSlug = locationHash.split('?')[0].split('/')[2] ?? ''

  if (page === 'admin') return <AdminPage />

  return (
    <>
      <Header
        page={page}
        cartCount={cartCount}
        wishlistCount={wishlistIds.length}
        onOpenCart={() => setCartOpen(true)}
        onToggleWishlist={toggleWishlist}
      />
      {page === 'store' ? (
        <main>
          <Store
            key={locationHash}
            initialCategory={query.get('category') ?? ''}
            initialSort={query.get('sort') ?? 'best'}
            featuredOnly={query.get('featured') === '1'}
            onAddToCart={addToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={toggleWishlist}
          />
        </main>
      ) : page === 'collections' ? (
        <main>
          <CollectionsPage />
        </main>
      ) : page === 'collection' ? (
        <main>
          <BrowsePage
            key={locationHash}
            type="collection"
            collectionSlug={collectionSlug}
            onAddToCart={addToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={toggleWishlist}
          />
        </main>
      ) : page === 'product' ? (
        <main>
          <ProductDetailPage
            key={locationHash}
            productId={locationHash.split('?')[0].split('/').pop()}
            onAddToCart={addToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={toggleWishlist}
          />
        </main>
      ) : page === 'about' ? (
        <main>
          <AboutPage />
        </main>
      ) : page === 'search' || page === 'wishlist' ? (
        <main>
          <BrowsePage
            key={locationHash}
            type={page}
            initialQuery={query.get('q') ?? ''}
            onAddToCart={addToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={toggleWishlist}
          />
        </main>
      ) : page === 'journal' ? (
        <main>
          <JournalPage entryId={locationHash.split('?')[0].split('/')[2]} />
        </main>
      ) : page === 'contact' || page === 'faq' || page === 'shipping' || page === 'returns' ? (
        <main><InfoPage type={page} /></main>
      ) : (
        <main>
          <Hero />
          <Products
            onAddToCart={addToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={toggleWishlist}
          />
          <Collections />
          <Story />
        </main>
      )}
      <Newsletter />
      <Footer />
      {cartOpen && (
        <CartDrawer
          items={cart}
          onClose={closeCart}
          onQuantityChange={updateCartQuantity}
          onRemove={removeFromCart}
          onOrderComplete={clearCart}
        />
      )}
    </>
  )
}
