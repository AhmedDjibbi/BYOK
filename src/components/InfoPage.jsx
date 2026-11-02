import { useState } from 'react'
import BrandedPageHero from './BrandedPageHero'
import { ArrowRight } from './Icons'
import './InfoPage.css'

const pageContent = {
  faq: {
    title: 'Frequently',
    accent: 'Asked',
    subtitle: 'A few useful answers before your next BYOK order.',
  },
  shipping: {
    title: 'Shipping',
    accent: 'Info',
    subtitle: 'Delivery across Tunisia. We will confirm timing with you after checkout.',
  },
  returns: {
    title: 'Returns',
    accent: 'And exchanges',
    subtitle: 'Need a different fit? Contact us with your order reference so we can help.',
  },
  contact: {
    title: 'Get in',
    accent: 'Touch',
    subtitle: 'Questions about a piece or an order? Send the BYOK team a message.',
  },
}

const questions = [
  {
    question: 'How do I place an order?',
    answer: 'Choose a piece, select your colour and size on its product page, then add it to your bag. Enter your delivery details to submit the order.',
  },
  {
    question: 'Which payment methods are available?',
    answer: 'The current checkout is cash on delivery. Submitting an order does not process an online payment.',
  },
  {
    question: 'How do I find the right size?',
    answer: 'Available sizes are shown on each product page. If you are unsure, send us a message before ordering and include the product name.',
  },
  {
    question: 'How can I ask about a return or exchange?',
    answer: 'Contact the BYOK team with your order reference and the item you want to discuss. We will confirm the available options with you.',
  },
]

const information = {
  shipping: [
    {
      title: 'Where we deliver',
      text: 'BYOK offers delivery across Tunisia. Add your address and city at checkout so the team can confirm service for your location.',
    },
    {
      title: 'Delivery timing',
      text: 'Delivery timing and any applicable fee are confirmed by the team after your order is submitted. No shipping charge is added automatically at checkout yet.',
    },
    {
      title: 'Order updates',
      text: 'Orders are submitted as pending cash-on-delivery requests. The team will confirm the order and delivery details with you.',
    },
  ],
  returns: [
    {
      title: 'Start a return or exchange request',
      text: 'Contact BYOK with your order reference, the item name and whether you are requesting a return or a different size. Please wait for confirmation before sending an item back.',
    },
    {
      title: 'Eligibility and timing',
      text: 'Return windows and item condition requirements have not been published yet. Contact the team before ordering if you need to confirm whether an item is eligible.',
    },
    {
      title: 'Need help?',
      text: 'Use the contact form and include your order reference. The team will confirm the next steps directly.',
    },
  ],
}

export default function InfoPage({ type }) {
  const content = pageContent[type]
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState(null)

  const submitContact = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotification(null)
    const formData = new FormData(event.currentTarget)
    const message = Object.fromEntries(
      ['name', 'email', 'subject', 'message', 'website'].map((field) => [field, formData.get(field)]),
    )
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to send your message.')
      setSubmitted(true)
      setNotification(result.notification)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="info-page">
      <BrandedPageHero
        eyebrow={`BYOK / ${type}`}
        title={content.title}
        accent={content.accent}
        subtitle={content.subtitle}
      />
      <div className="container info-page__content">
        {type === 'faq' ? (
          <div className="info-faq">
            {questions.map((item, index) => (
              <details className="info-faq__item" key={item.question}>
                <summary>
                  <span className="info-faq__number">0{index + 1}</span>
                  {item.question}
                  <span className="info-faq__plus" aria-hidden="true">+</span>
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
            <a className="btn btn--outline" href="#/contact">Still have a question? Contact us <ArrowRight /></a>
          </div>
        ) : type === 'contact' ? (
          <div className="contact-layout">
            <div className="contact-layout__copy">
              <p className="section-label">Talk to the team</p>
              <h2>We’re listening<span>Let’s talk.</span></h2>
              <p>Send us your question and the BYOK team will get back to you.</p>
              <p className="contact-layout__response">
                Use the form to reach the team. We’ll reply to the email address you provide.
              </p>
            </div>
            {submitted ? (
              <div className="contact-success" role="status">
                <span>BYOK</span>
                <h2>Message received.</h2>
                <p>Your message is saved. The team will follow up using the email you provided.</p>
                {notification && (
                  <p className="contact-success__notifications">
                    Staff notifications: email {notification.email}, SMS {notification.sms}.
                  </p>
                )}
                <button type="button" className="btn btn--outline" onClick={() => setSubmitted(false)}>
                  Send another message
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={submitContact}>
                <label className="contact-form__trap" aria-hidden="true">
                  Leave this field empty
                  <input name="website" tabIndex="-1" autoComplete="off" />
                </label>
                <label>Full name<input name="name" autoComplete="name" minLength="2" maxLength="100" required /></label>
                <label>Email<input name="email" type="email" autoComplete="email" maxLength="254" required /></label>
                <label>Subject<input name="subject" minLength="3" maxLength="120" required /></label>
                <label>Message<textarea name="message" rows="5" minLength="10" maxLength="2000" required /></label>
                {error && <p className="contact-form__error" role="alert">{error}</p>}
                <button type="submit" className="btn btn--lime" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send message'} {!submitting && <ArrowRight />}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="info-accordions">
            {information[type].map((item, index) => (
              <article className="info-panel" key={item.title}>
                <span>0{index + 1}</span>
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
            <a className="btn btn--outline" href="#/contact">Ask the BYOK team <ArrowRight /></a>
          </div>
        )}
      </div>
    </div>
  )
}
