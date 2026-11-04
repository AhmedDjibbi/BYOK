import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
import TrackOrderPage from './components/TrackOrderPage'
import UnsubscribePage from './components/UnsubscribePage'
import AccountPage from './components/AccountPage'
import RegisterPage from './components/RegisterPage'
import VerifyPage from './components/VerifyPage'
import NotFoundPage from './components/NotFoundPage'
import { apiRequest, fetchProducts } from './lib/api'
import {
  CART_STORAGE_KEY,
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
  cartKeyFor,
  describeCartChanges,
  loadCart,
  reconcileCart,
  storeCart,
} from './lib/cart'
import { usePageMeta } from './hooks/usePageMeta'

const routeFromPath = (pathname) => {
  const path = (pathname || '/').toLowerCase()
  if (path === '/' || path === '') return 'home'
  if (!path.startsWith('/')) return 'home'
  if (path.startsWith('/product/')) return 'product'
  if (path.startsWith('/store')) return 'store'
  if (path === '/collections') return 'collections'
  if (path.startsWith('/collections/')) return 'collection'
  if (path.startsWith('/about')) return 'about'
  if (path.startsWith('/search')) return 'search'
  if (path.startsWith('/wishlist')) return 'wishlist'
  if (path.startsWith('/journal')) return 'journal'
  if (path.startsWith('/contact')) return 'contact'
  if (path.startsWith('/faq')) return 'faq'
  if (path.startsWith('/shipping')) return 'shipping'
  if (path.startsWith('/returns')) return 'returns'
  if (path.startsWith('/admin')) return 'admin'
  if (path === '/order' || path.startsWith('/order/')) return 'order'
  if (path === '/unsubscribe') return 'unsubscribe'
  if (path === '/account') return 'account'
  if (path === '/register') return 'register'
  if (path === '/verify') return 'verify'
  return 'notfound'
}

const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const pageMetaByPage = {
  home: { title: 'BYOC', description: 'BYOC storefront and catalogue.' },
  store: { title: 'Store | BYOC', description: 'Shop the BYOC catalogue.' },
  collections: { title: 'Collections | BYOC', description: 'Explore the BYOC collections.' },
  collection: { title: 'Collection | BYOC', description: 'Pieces from this BYOC collection.' },
  product: { title: 'Product | BYOC', description: 'Product details from BYOC.' },
  about: { title: 'About | BYOC', description: 'About BYOC.' },
  search: { title: 'Search | BYOC', description: 'Search the BYOC catalogue.' },
  wishlist: { title: 'Wishlist | BYOC', description: 'Your saved BYOC pieces.' },
  journal: { title: 'Journal | BYOC', description: 'BYOC journal.' },
  contact: { title: 'Contact | BYOC', description: 'Contact BYOC.' },
  faq: { title: 'FAQ | BYOC', description: 'Frequently asked questions.' },
  shipping: { title: 'Shipping | BYOC', description: 'Shipping information.' },
  returns: { title: 'Returns | BYOC', description: 'Returns and exchanges.' },
  order: { title: 'Track Order | BYOC', description: 'Track a BYOC order.' },
  account: { title: 'Account | BYOC', description: 'Sign in to your BYOC account.' },
  register: { title: 'Create account | BYOC', description: 'Create your BYOC account.' },
  unsubscribe: { title: 'Unsubscribe | BYOC', description: 'Unsubscribe from BYOC emails.' },
  notfound: { title: 'Page not found | BYOC', description: 'The requested page was not found.' },
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const page = routeFromPath(location.pathname)
  const [cart, setCart] = useState(() => loadCart().lines)
  const [cartOpen, setCartOpen] = useState(false)
  const [cartNotice, setCartNotice] = useState(() => loadCart().notice)
  const [isCheckingStock, setIsCheckingStock] = useState(false)
  const cartRef = useRef(cart)
  const stockRequestRef = useRef(null)
  const [wishlistIds, setWishlistIds] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('byok-wishlist') || '[]')
      return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []
    } catch (error) {
      console.error('Unable to read the saved wishlist.', error)
      return []
    }
  })
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const wishlistRef = useRef(wishlistIds)
  const wishlistSyncRef = useRef(Promise.resolve())
  const authUserRef = useRef(null)

  usePageMeta(pageMetaByPage[page] || pageMetaByPage.home)

  const persistWishlist = useCallback((ids) => {
    wishlistSyncRef.current = wishlistSyncRef.current
      .catch(() => {})
      .then(() =>
        apiRequest('/account/wishlist', {
          method: 'PUT',
          body: { wishlist: ids },
          credentials: 'include',
          headers: { 'x-csrf-token': getCsrfToken() },
        }),
      )
      .then((data) => {
        const saved = Array.isArray(data.wishlist) ? data.wishlist : ids
        setCurrentUser((previous) =>
          previous ? { ...previous, wishlist: saved } : previous,
        )
      })
      .catch((error) => {
        if (error.status !== 401) {
          console.error('Unable to sync your wishlist.', error)
        }
      })
    return wishlistSyncRef.current
  }, [])

  const handleAuthChange = useCallback(
    (user) => {
      const previousId = authUserRef.current?.id ?? null
      const nextId = user?.id ?? null
      authUserRef.current = user ?? null

      if (!user) {
        setCurrentUser(null)
        return
      }

      if (previousId && previousId === nextId) {
        setCurrentUser({ ...user, wishlist: wishlistRef.current })
        return
      }

      const serverWishlist = Array.isArray(user.wishlist) ? user.wishlist : []
      const merged = [...new Set([...serverWishlist, ...wishlistRef.current])]
      wishlistRef.current = merged
      setWishlistIds(merged)
      setCurrentUser({ ...user, wishlist: merged })
      if (merged.length !== serverWishlist.length) persistWishlist(merged)
    },
    [persistWishlist],
  )

  useEffect(() => {
    const controller = new AbortController()
    apiRequest('/auth/me', { credentials: 'include', signal: controller.signal })
      .then((data) => handleAuthChange(data.user ?? null))
      .catch((error) => {
        if (error.name !== 'AbortError') handleAuthChange(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setAuthLoading(false)
      })
    return () => controller.abort()
  }, [handleAuthChange])

  useEffect(() => {
    wishlistRef.current = wishlistIds
    try {
      window.localStorage.setItem('byok-wishlist', JSON.stringify(wishlistIds))
    } catch (error) {
      console.error('Unable to save the wishlist.', error)
    }
  }, [wishlistIds])

  useEffect(() => {
    if (window.location.hash && window.location.hash.startsWith('#/')) {
      const path = window.location.hash.slice(1)
      window.history.replaceState(null, '', path)
      navigate(path, { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    cartRef.current = cart
  }, [cart])

  useEffect(() => {
    storeCart(cart)
  }, [cart])

  useEffect(() => {
    const syncCart = (event) => {
      if (event.key !== CART_STORAGE_KEY && event.key !== null) return
      const { lines, notice } = loadCart()
      setCart(lines)
      if (notice) setCartNotice(notice)
    }
    window.addEventListener('storage', syncCart)
    return () => window.removeEventListener('storage', syncCart)
  }, [])

  const refreshCartStock = useCallback(async () => {
    if (!cartRef.current.length) return
    if (stockRequestRef.current) return stockRequestRef.current

    const request = (async () => {
      setIsCheckingStock(true)
      try {
        const products = await fetchProducts()
        const result = reconcileCart(cartRef.current, products)
        setCart(result.lines)
        const notice = describeCartChanges(result)
        if (notice) setCartNotice(notice)
      } catch (error) {
        console.error('Unable to re-check bag stock.', error)
        setCartNotice(
          'We could not check live stock just now. Stock is confirmed when you place the order.',
        )
      } finally {
        setIsCheckingStock(false)
        stockRequestRef.current = null
      }
    })()
    stockRequestRef.current = request
    return request
  }, [])

  useEffect(() => {
    if (cartRef.current.length) refreshCartStock()
  }, [refreshCartStock])

  useEffect(() => {
    if (cartOpen) refreshCartStock()
  }, [cartOpen, refreshCartStock])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname, location.search])

  const toggleWishlist = useCallback(
    (id) => {
      const previous = wishlistRef.current
      const next = previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
      wishlistRef.current = next
      setWishlistIds(next)
      setCurrentUser((user) => (user ? { ...user, wishlist: next } : user))
      if (authUserRef.current) persistWishlist(next)
    },
    [persistWishlist],
  )

  const addToCart = useCallback((product) => {
    // (unchanged logic from Phase 1)
    const size = product.size ?? ''
    const cartKey = cartKeyFor(product.id, size)
    const available =
      Number.parseInt(product.stockBySize?.[size] ?? product.stock ?? 0, 10) || 0
    const label = size ? `${product.name} (${size})` : product.name
    const current = cartRef.current
    const existing = current.find((item) => item.cartKey === cartKey)
    const limit = Math.min(available, MAX_LINE_QUANTITY)

    if (available < 1) {
      setCartNotice(`${label} is out of stock right now.`)
      setCartOpen(true)
      return
    }
    if (existing && existing.quantity >= limit) {
      setCartNotice(`Only ${limit} of ${label} can be added to one order.`)
      setCartOpen(true)
      return
    }
    if (!existing && current.length >= MAX_CART_LINES) {
      setCartNotice(`Your bag is limited to ${MAX_CART_LINES} different items.`)
      setCartOpen(true)
      return
    }

    setCart((items) => {
      const match = items.find((item) => item.cartKey === cartKey)
      if (match) {
        return items.map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: Math.min(item.quantity + 1, limit) }
            : item,
        )
      }
      return [
        ...items,
        {
          cartKey,
          id: product.id,
          size,
          quantity: 1,
          name: product.name,
          price: product.price,
          colorway: product.colorway,
          stock: available,
          shippingOverride:
            product.shippingOverride === undefined ? null : product.shippingOverride,
        },
      ]
    })
    setCartOpen(true)
  }, [])

  const updateCartQuantity = useCallback((cartKey, quantity) => {
    setCart((items) =>
      items.flatMap((item) => {
        if (item.cartKey !== cartKey) return [item]
        if (quantity <= 0) return []
        const limit = Math.min(item.stock ?? MAX_LINE_QUANTITY, MAX_LINE_QUANTITY)
        return [{ ...item, quantity: Math.min(quantity, limit) }]
      }),
    )
  }, [])

  const removeFromCart = useCallback((cartKey) => {
    setCart((items) => items.filter((item) => item.cartKey !== cartKey))
  }, [])

  const closeCart = useCallback(() => setCartOpen(false), [])
  const clearCart = useCallback(() => {
    setCart([])
    setCartNotice('')
  }, [])
  const dismissCartNotice = useCallback(() => setCartNotice(''), [])

  const openCart = useCallback(() => setCartOpen(true), [])
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)

  const collectionSlug =
    page === 'collection' ? decodeURIComponent(location.pathname.split('/')[2] ?? '') : ''
  const productId =
    page === 'product' ? decodeURIComponent(location.pathname.split('/').pop() ?? '') : ''
  const entryId =
    page === 'journal' ? decodeURIComponent(location.pathname.split('/')[2] ?? '') : ''
  const orderIdFromRoute =
    page === 'order' ? decodeURIComponent(location.pathname.split('/').slice(2).join('/')) : ''
  const unsubscribeToken = new URLSearchParams(location.search).get('token') ?? ''
  const orderQueryEmail = new URLSearchParams(location.search).get('email') ?? ''
  const lastOrder = (() => {
    try {
      return JSON.parse(window.localStorage.getItem('byok-last-order') || 'null')
    } catch {
      return null
    }
  })()
  const orderInitialEmail =
    page === 'order'
      ? orderQueryEmail || (lastOrder?.orderId === orderIdFromRoute ? lastOrder?.email : '')
      : ''
  const query = new URLSearchParams(location.search)

  if (page === 'admin') return <AdminPage />

  return (
    <>
      <Header
        page={page}
        currentUser={currentUser}
        cartCount={cartCount}
        wishlistCount={wishlistIds.length}
        onOpenCart={openCart}
        onToggleWishlist={toggleWishlist}
      />
      {page === 'store' ? (
        <main>
          <Store
            key={location.pathname + location.search}
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
            key={location.pathname + location.search}
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
            key={location.pathname + location.search}
            productId={productId}
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
            key={location.pathname + location.search}
            type={page}
            initialQuery={query.get('q') ?? ''}
            onAddToCart={addToCart}
            wishlistIds={wishlistIds}
            onToggleWishlist={toggleWishlist}
          />
        </main>
      ) : page === 'journal' ? (
        <main>
          <JournalPage entryId={entryId} />
        </main>
      ) : page === 'contact' || page === 'faq' || page === 'shipping' || page === 'returns' ? (
        <main><InfoPage type={page} /></main>
      ) : page === 'notfound' ? (
        <main><NotFoundPage /></main>
      ) : page === 'order' ? (
        <main>
          <TrackOrderPage
            key={location.pathname + location.search}
            initialOrderId={orderIdFromRoute}
            initialEmail={orderInitialEmail}
          />
        </main>
      ) : page === 'unsubscribe' ? (
        <main>
          <UnsubscribePage key={location.pathname + location.search} initialToken={unsubscribeToken} />
        </main>
      ) : page === 'account' ? (
        <main>
          <AccountPage
            currentUser={currentUser}
            authLoading={authLoading}
            wishlistCount={wishlistIds.length}
            onAuthChange={handleAuthChange}
          />
        </main>
      ) : page === 'register' ? (
        <main>
          <RegisterPage currentUser={currentUser} onAuthChange={handleAuthChange} />
        </main>
      ) : page === 'verify' ? (
        <main>
          <VerifyPage key={location.pathname + location.search} initialToken={new URLSearchParams(location.search).get('token') ?? ''} />
        </main>
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
          notice={cartNotice}
          isCheckingStock={isCheckingStock}
          onDismissNotice={dismissCartNotice}
          onClose={closeCart}
          onQuantityChange={updateCartQuantity}
          onRemove={removeFromCart}
          onClear={clearCart}
          onStockConflict={refreshCartStock}
          onOrderComplete={clearCart}
        />
      )}
    </>
  )
}
