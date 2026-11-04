import { useEffect, useState } from 'react'
import { apiRequest } from '../lib/api'
import { useNavigate } from 'react-router-dom'

export default function VerifyPage({ initialToken = '' }) {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Verifying…')
  const [error, setError] = useState('')

  useEffect(() => {
    const token = initialToken || new URLSearchParams(window.location.search).get('token') || ''
    if (!token) {
      setError('Missing sign-in token.')
      return
    }
    let cancelled = false
    apiRequest('/auth/verify', { method: 'POST', body: { token }, credentials: 'include' })
      .then(() => {
        if (!cancelled) {
          setMessage('Signed in. Redirecting to your account…')
          window.location.replace('/account')
        }
      })
      .catch((verifyError) => {
        if (!cancelled) setError(verifyError.message)
      })
    return () => {
      cancelled = true
    }
  }, [initialToken])

  return (
    <main className="account-page">
      <div className="container">
        {error ? <p role="alert">{error}</p> : <p role="status">{message}</p>}
      </div>
    </main>
  )
}
