import { useEffect, useState } from 'react'
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

const routeFromHash = () => {
  const hash = window.location.hash.toLowerCase()
  if (hash.startsWith('#/store')) return 'store'
  if (hash.startsWith('#/collections')) return 'collections'
  if (hash.startsWith('#/about')) return 'about'
  return 'home'
}

export default function App() {
  const [page, setPage] = useState(routeFromHash)

  useEffect(() => {
    const sync = () => {
      const next = routeFromHash()
      const target = window.location.hash.replace(/^#\/?/, '')

      setPage(next)

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

  return (
    <>
      <Header page={page} />
      {page === 'store' ? (
        <main>
          <Store />
        </main>
      ) : page === 'collections' ? (
        <main>
          <CollectionsPage />
        </main>
      ) : page === 'about' ? (
        <main>
          <AboutPage />
        </main>
      ) : (
        <main>
          <Hero />
          <Products />
          <Collections />
          <Story />
        </main>
      )}
      <Newsletter />
      <Footer />
    </>
  )
}
