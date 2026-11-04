import './CatalogueState.css'

export default function CatalogueState({
  status = 'empty',
  title,
  message,
  action,
  onRetry,
  retryLabel = 'Try again',
}) {
  const role = status === 'error' ? 'alert' : 'status'

  if (status === 'loading') {
    return (
      <div className="catalogue-state catalogue-state--loading" role="status">
        <p className="catalogue-state__message">{message ?? 'Loading products...'}</p>
      </div>
    )
  }

  return (
    <div className={`catalogue-state catalogue-state--${status}`} role={role}>
      {title && <h2 className="catalogue-state__title">{title}</h2>}
      {message && <p className="catalogue-state__message">{message}</p>}
      <div className="catalogue-state__actions">
        {onRetry && (
          <button type="button" className="btn btn--outline" onClick={onRetry}>
            {retryLabel}
          </button>
        )}
        {action}
      </div>
    </div>
  )
}
