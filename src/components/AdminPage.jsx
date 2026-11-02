import { useCallback, useState } from 'react'
import './AdminPage.css'

async function adminRequest(token, path, options = {}) {
  const response = await fetch(`/api/admin${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Staff request failed.')
  return result
}

export default function AdminPage() {
  const [token, setToken] = useState('')
  const [activeToken, setActiveToken] = useState('')
  const [orders, setOrders] = useState([])
  const [totalOrders, setTotalOrders] = useState(0)
  const [orderPage, setOrderPage] = useState(1)
  const [contacts, setContacts] = useState([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [contactPage, setContactPage] = useState(1)
  const [inventory, setInventory] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [stockChanges, setStockChanges] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadData = useCallback(async (
    staffToken,
    orderStatus = statusFilter,
    requestedPage = orderPage,
    requestedContactPage = contactPage,
  ) => {
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams({ page: String(requestedPage), limit: '25' })
      const contactQuery = new URLSearchParams({
        page: String(requestedContactPage),
        limit: '50',
      })
      if (orderStatus) query.set('status', orderStatus)
      const [orderData, contactData, inventoryData] = await Promise.all([
        adminRequest(staffToken, `/orders?${query}`),
        adminRequest(staffToken, `/contacts?${contactQuery}`),
        adminRequest(staffToken, '/inventory'),
      ])
      setOrders(orderData.orders)
      setTotalOrders(orderData.total)
      setOrderPage(orderData.page)
      setContacts(contactData.messages)
      setTotalContacts(contactData.total)
      setContactPage(contactData.page)
      setInventory(inventoryData.inventory)
      setStockChanges({})
      setActiveToken(staffToken)
      return true
    } catch (requestError) {
      setError(requestError.message)
      if (!activeToken) setActiveToken('')
      return false
    } finally {
      setLoading(false)
    }
  }, [activeToken, contactPage, orderPage, statusFilter])

  const signIn = async (event) => {
    event.preventDefault()
    if (await loadData(token)) setToken('')
  }

  const changeOrderStatus = async (orderId, status) => {
    setError('')
    setNotice('')
    try {
      const result = await adminRequest(activeToken, `/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setNotice(`Order updated to ${status}. Notifications: email ${result.notification.email}, SMS ${result.notification.sms}.`)
      await loadData(activeToken)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const saveStock = async (item) => {
    const key = `${item.productId}::${item.size}`
    const quantity = Number(stockChanges[key] ?? item.quantity)
    setError('')
    setNotice('')
    try {
      const result = await adminRequest(
        activeToken,
        `/inventory/${encodeURIComponent(item.productId)}/${encodeURIComponent(item.size)}`,
        { method: 'PUT', body: JSON.stringify({ quantity, expectedQuantity: item.quantity }) },
      )
      setInventory((current) => current.map((entry) =>
        entry.productId === item.productId && entry.size === item.size
          ? { ...entry, quantity: result.quantity }
          : entry,
      ))
      setStockChanges((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
      setNotice(`${item.name} (${item.colorway}), size ${item.size}: stock set to ${result.quantity}.`)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const filteredInventory = inventory.filter((item) =>
    `${item.name} ${item.colorway} ${item.size}`.toLowerCase().includes(search.toLowerCase()),
  )

  if (!activeToken) {
    return (
      <main className="admin-page">
        <div className="admin-login">
          <a className="admin-logo" href="#/">BYOK</a>
          <p className="admin-eyebrow">Staff access / BYOK</p>
          <h1>Store management</h1>
          <p>Enter the staff API token configured on the server.</p>
          <form onSubmit={signIn}>
            <label htmlFor="admin-token">Staff API token</label>
            <input
              id="admin-token"
              type="password"
              autoComplete="current-password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
            />
            {error && <p className="admin-error" role="alert">{error}</p>}
            <button type="submit" disabled={loading}>{loading ? 'Checking...' : 'Sign in'}</button>
          </form>
          <a className="admin-back" href="#/">Back to BYOK storefront</a>
        </div>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="admin-logo" href="#/">BYOK</a>
        <p>Store management</p>
        <button
          type="button"
          className="admin-refresh"
          disabled={loading}
          onClick={() => loadData(activeToken)}
        >
          Refresh
        </button>
        <button type="button" onClick={() => { setActiveToken(''); setToken('') }}>Sign out</button>
      </header>
      <div className="admin-content">
        <section className="admin-section">
          <div className="admin-section__heading">
            <div>
              <p className="admin-eyebrow">Inbox / {totalContacts} stored</p>
              <h2>Customer messages</h2>
            </div>
          </div>
          {!contacts.length ? (
            <p className="admin-empty">No customer messages found.</p>
          ) : (
            <div className="admin-contacts">
              {contacts.map((message) => (
                <article className="admin-contact" key={message._id}>
                  <div className="admin-contact__heading">
                    <div>
                      <h3>{message.subject}</h3>
                      <p>{message.name} · <a href={`mailto:${encodeURIComponent(message.email)}`}>{message.email}</a></p>
                    </div>
                    <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>
                  </div>
                  <p className="admin-contact__message">{message.message}</p>
                </article>
              ))}
              {totalContacts > 50 && (
                <nav className="admin-pagination" aria-label="Customer message pages">
                  <button
                    type="button"
                    disabled={contactPage <= 1}
                    onClick={() => loadData(activeToken, statusFilter, orderPage, contactPage - 1)}
                  >
                    Previous messages
                  </button>
                  <span>Page {contactPage} of {Math.ceil(totalContacts / 50)}</span>
                  <button
                    type="button"
                    disabled={contactPage >= Math.ceil(totalContacts / 50)}
                    onClick={() => loadData(activeToken, statusFilter, orderPage, contactPage + 1)}
                  >
                    Next messages
                  </button>
                </nav>
              )}
            </div>
          )}
        </section>

        <section className="admin-section">
          <div className="admin-section__heading">
            <div>
              <p className="admin-eyebrow">Orders / {totalOrders} total · {orders.length} shown</p>
              <h1>Order management</h1>
            </div>
            <label>
              Filter
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  loadData(activeToken, event.target.value, 1)
                }}
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>
          {!orders.length ? (
            <p className="admin-empty">No orders found.</p>
          ) : (
            <div className="admin-orders">
              {orders.map((order) => (
                <article className="admin-order" key={order._id}>
                  <div className="admin-order__top">
                    <div>
                      <p className="admin-order__id">#{order._id}</p>
                      <p className="admin-order__date">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={`admin-status admin-status--${order.status}`}>{order.status}</span>
                  </div>
                  <div className="admin-order__customer">
                    <strong>{order.customer.name}</strong>
                    <span>{order.customer.email} · {order.customer.phone}</span>
                    <span>{order.customer.address}, {order.customer.city}</span>
                  </div>
                  <ul>
                    {order.items.map((item, index) => (
                      <li key={`${item.productId}-${item.size}-${index}`}>
                        {item.name} / {item.colorway} / {item.size} × {item.quantity}
                        <span>{item.unitPrice * item.quantity} TND</span>
                      </li>
                    ))}
                  </ul>
                  <div className="admin-order__bottom">
                    <strong>{order.total} TND · Cash on delivery</strong>
                    <div>
                      {order.status === 'pending' && (
                        <button type="button" onClick={() => changeOrderStatus(order._id, 'confirmed')}>Confirm</button>
                      )}
                      {['pending', 'confirmed'].includes(order.status) && (
                        <button type="button" className="admin-button--danger" onClick={() => changeOrderStatus(order._id, 'cancelled')}>Cancel</button>
                      )}
                      {order.status === 'confirmed' && (
                        <button type="button" onClick={() => changeOrderStatus(order._id, 'fulfilled')}>Mark fulfilled</button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {totalOrders > 25 && (
            <nav className="admin-pagination" aria-label="Order pages">
              <button
                type="button"
                disabled={orderPage <= 1}
                onClick={() => loadData(activeToken, statusFilter, orderPage - 1)}
              >
                Previous
              </button>
              <span>Page {orderPage} of {Math.ceil(totalOrders / 25)}</span>
              <button
                type="button"
                disabled={orderPage >= Math.ceil(totalOrders / 25)}
                onClick={() => loadData(activeToken, statusFilter, orderPage + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </section>

        <section className="admin-section">
          <div className="admin-section__heading">
            <div>
              <p className="admin-eyebrow">Stock / {inventory.length} variants</p>
              <h2>Available stock by size</h2>
            </div>
            <input
              className="admin-search"
              type="search"
              aria-label="Filter inventory"
              placeholder="Search products..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="admin-stock-list">
            {filteredInventory.map((item) => {
              const key = `${item.productId}::${item.size}`
              return (
                <form
                  className="admin-stock"
                  key={key}
                  onSubmit={(event) => { event.preventDefault(); saveStock(item) }}
                >
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.colorway} / {item.size}</span>
                  </div>
                  <label>
                    <span className="visually-hidden">Available units</span>
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      step="1"
                      value={stockChanges[key] ?? item.quantity}
                      onChange={(event) => setStockChanges((current) => ({ ...current, [key]: event.target.value }))}
                    />
                  </label>
                  <button type="submit">Save</button>
                </form>
              )
            })}
          </div>
        </section>
        {loading && <p className="admin-loading" role="status">Refreshing...</p>}
        {error && <p className="admin-error" role="alert">{error}</p>}
        {notice && <p className="admin-notice" role="status">{notice}</p>}
      </div>
    </main>
  )
}
