import { useState } from 'react'
import { apiRequest } from '../lib/api'

export default function UnsubscribePage({ initialToken = '' }) {
  const [token, setToken] = useState(initialToken)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await apiRequest('/newsletter/unsubscribe', {
        method: 'POST',
        body: { token: token.trim() },
      })
      setDone(true)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="info-page">
      <div className="container info-page__content">
        <div className="info-accordions">
          <p className="section-label">Newsletter</p>
          <h2>Unsubscribe</h2>
          {done ? (
            <p role="status">You have been unsubscribed. No further newsletter emails will be sent.</p>
          ) : (
            <form className="cart-checkout" onSubmit={handleSubmit}>
              <label>
                Unsubscribe token
                <input
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  required
                  autoComplete="off"
                />
              </label>
              {error && <p className="cart-checkout__error" role="alert">{error}</p>}
              <button type="submit" className="btn btn--lime" disabled={loading}>
                {loading ? 'Processing...' : 'Unsubscribe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
