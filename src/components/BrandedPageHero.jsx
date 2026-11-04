import { ChevronRight } from './Icons'
import './BrandedPageHero.css'

export default function BrandedPageHero({ eyebrow = 'BYOC / The movement', title, accent, subtitle }) {
  return (
    <header className="branded-hero">
      <div className="branded-hero__photo" aria-hidden="true" />
      <div className="branded-hero__scrim" aria-hidden="true" />
      <div className="container branded-hero__inner">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <ChevronRight size={10} strokeWidth={2} />
          <span aria-current="page">{title}</span>
        </nav>
        <p className="branded-hero__eyebrow">{eyebrow}</p>
        <h1 className="branded-hero__title">
          {title}
          {accent && <span>{accent}</span>}
        </h1>
        {subtitle && <p className="branded-hero__subtitle">{subtitle}</p>}
      </div>
    </header>
  )
}
