import { journalEntries } from '../data/content'
import { ArrowRight, ChevronRight } from './Icons'
import BrandedPageHero from './BrandedPageHero'
import './JournalPage.css'

export default function JournalPage({ entryId }) {
  const entry = journalEntries.find((item) => item.id === entryId)

  if (entryId) {
    if (!entry) {
      return (
        <div className="container journal-article__missing">
          <h1>Story not found.</h1>
          <a className="btn btn--outline" href="/journal">Back to the journal</a>
        </div>
      )
    }

    return (
      <article className="journal-article">
        <BrandedPageHero
          eyebrow={`BYOC Journal / ${entry.category}`}
          title={entry.title}
          subtitle="Ideas, details and notes from the movement."
        />
        <div className="container journal-article__body">
          <a className="link-arrow" href="/journal">
            <ChevronRight className="journal-article__back-icon" size={13} />
            Back to journal
          </a>
          <img src={entry.image} alt={entry.alt} />
          <p>{entry.body}</p>
          <a className="btn btn--outline" href="/collections/essentials">
            Find your fit <ArrowRight />
          </a>
        </div>
      </article>
    )
  }

  return (
    <div className="journal-page">
      <BrandedPageHero
        eyebrow="BYOC / Journal"
        title="The BYOC"
        accent="Journal"
        subtitle="Style notes, stories and thoughts from the movement."
      />
      <div className="container journal-grid">
        {journalEntries.map((item, index) => (
          <article className="journal-card" key={item.id}>
            <a className="journal-card__image" href={`/journal/${item.id}`}>
              <img src={item.image} alt={item.alt} loading="lazy" />
              <span>0{index + 1}</span>
            </a>
            <p className="journal-card__category">{item.category}</p>
            <h2><a href={`/journal/${item.id}`}>{item.title}</a></h2>
            <p className="journal-card__excerpt">{item.excerpt}</p>
            <a className="link-arrow" href={`/journal/${item.id}`}>
              Read story <ArrowRight />
            </a>
          </article>
        ))}
      </div>
    </div>
  )
}
