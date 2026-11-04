import BrandedPageHero from './BrandedPageHero'
import './NotFoundPage.css'

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <BrandedPageHero
        eyebrow="BYOC / 404"
        title="Page"
        accent="Not Found"
        subtitle="The link may be broken, or the piece may have moved."
      />
      <section className="container not-found__body">
        <p>
          Check the address, or pick up where you left off. The store and your wishlist are
          one click away.
        </p>
        <div className="not-found__actions">
          <a className="btn btn--lime" href="/store">Shop the store</a>
          <a className="btn btn--outline" href="/">Back to home</a>
        </div>
      </section>
    </div>
  )
}
