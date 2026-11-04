import { useCallback, useState } from 'react'
import { apiRequest } from '../lib/api'
import './AdminPage.css'

const adminRequest = (token, path, options = {}) =>
  apiRequest(`/admin${path}`, { ...options, token })

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
  const [collectionSaving, setCollectionSaving] = useState(false)
  const [shippingSettings, setShippingSettings] = useState({
    mode: 'fixed',
    value: 0,
    currency: 'TND',
  })
  const [shippingSaving, setShippingSaving] = useState(false)
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
      const [orderData, contactData, inventoryData, shippingData, collectionData, subscriberData] = await Promise.all([
        adminRequest(staffToken, `/orders?${query}`),
        adminRequest(staffToken, `/contacts?${contactQuery}`),
        adminRequest(staffToken, '/inventory'),
        adminRequest(staffToken, '/settings/shipping'),
        adminRequest(staffToken, '/collections'),
        adminRequest(staffToken, '/subscribers'),
      ])
      setOrders(orderData.orders)
      setTotalOrders(orderData.total)
      setOrderPage(orderData.page)
      setContacts(contactData.messages)
      setTotalContacts(contactData.total)
      setContactPage(contactData.page)
      setInventory(inventoryData.inventory)
      setShippingSettings(shippingData.shipping)
      setCollections(collectionData.collections)
      setSubscribers(subscriberData.subscribers)
      setTotalSubscribers(subscriberData.total)
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
        body: { status },
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
        { method: 'PUT', body: { quantity, expectedQuantity: item.quantity } },
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

  const saveShipping = async (event) => {
    event.preventDefault()
    setShippingSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await adminRequest(activeToken, '/settings/shipping', {
        method: 'PUT',
        body: { shipping: shippingSettings },
      })
      setShippingSettings(result.shipping)
      setNotice('Shipping settings saved.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setShippingSaving(false)
    }
  }

  const deleteCollection = async (collection) => {
    if (!window.confirm(`Delete collection “${collection.name}”?`)) return
    setError('')
    setNotice('')
    try {
      await adminRequest(activeToken, `/collections/${collection.id}`, { method: 'DELETE' })
      await loadData(activeToken)
      setNotice(`Collection deleted: ${collection.name}`)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const toggleCollection = async (collection) => {
    setCollectionSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await adminRequest(activeToken, `/collections/${collection.id}`, {
        method: 'PATCH',
        body: { active: !collection.active },
      })
      setNotice(`Collection ${result.collection.active ? 'activated' : 'deactivated'}: ${result.collection.name}`)
      await loadData(activeToken)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCollectionSaving(false)
    }
  }

  const createCollection = async (event) => {
    event.preventDefault()
    const name = newCollectionName.trim()
    if (!name) return
    setCollectionSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await adminRequest(activeToken, '/collections', {
        method: 'POST',
        body: { name },
      })
      setNewCollectionName('')
      setNotice(`Collection created: ${result.collection.name}`)
      await loadData(activeToken)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCollectionSaving(false)
    }
  }

  const exportSubscribers = async () => {
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/subscribers/export', {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
      if (!response.ok) throw new Error('Unable to export subscribers.')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'newsletter-subscribers.csv'
      link.click()
      URL.revokeObjectURL(url)
      setNotice('Subscriber list exported.')
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
          <a className="admin-logo" href="/">BYOC</a>
          <p className="admin-eyebrow">Staff access / BYOC</p>
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
          <a className="admin-back" href="/">Back to BYOC storefront</a>
        </div>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="admin-logo" href="/">BYOC</a>
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
                  {(order.status === 'pending' && order.expiresAt) || order.cancelReason ? (
                    <div className="admin-order__expiry">
                      {order.status === 'pending' && order.expiresAt && (
                        <span>Reserved until {new Date(order.expiresAt).toLocaleString()}</span>
                      )}
                      {order.cancelReason && (
                        <span>Cancel reason: {order.cancelReason}</span>
                      )}
                    </div>
                  ) : null}
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
              <p className="admin-eyebrow">Settings / Shipping</p>
              <h2>Shipping rules</h2>
            </div>
          </div>
          <form className="admin-shipping" onSubmit={saveShipping}>
            <label>
              Mode
              <select
                value={shippingSettings.mode}
                onChange={(event) =>
                  setShippingSettings((current) => ({
                    ...current,
                    mode: event.target.value,
                  }))
                }
              >
                <option value="fixed">Fixed amount</option>
                <option value="percentage">Percentage of subtotal</option>
              </select>
            </label>
            <label>
              {shippingSettings.mode === 'fixed' ? 'Amount (TND)' : 'Percent (%)'}
              <input
                type="number"
                min="0"
                step={shippingSettings.mode === 'fixed' ? '0.01' : '1'}
                value={shippingSettings.value}
                onChange={(event) =>
                  setShippingSettings((current) => ({
                    ...current,
                    value: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              Currency
              <input
                type="text"
                maxLength="3"
                value={shippingSettings.currency}
                onChange={(event) =>
                  setShippingSettings((current) => ({
                    ...current,
                    currency: event.target.value,
                  }))
                }
              />
            </label>
            <button type="submit" disabled={shippingSaving}>
              {shippingSaving ? 'Saving…' : 'Save shipping'}
            </button>
            <p className="admin-shipping__example">
              Example: a 100 TND cart pays{' '}
              {shippingSettings.mode === 'fixed'
                ? `${Number(shippingSettings.value || 0)} ${shippingSettings.currency}`
                : `${Math.round((100 * Number(shippingSettings.value || 0)) / 100)} ${shippingSettings.currency}`}
              {' '}shipping.
            </p>
          </form>
        </section>

        <section className="admin-section">
          <div className="admin-section__heading">
            <div>
              <p className="admin-eyebrow">Collections / {collections.length}</p>
              <h2>Collection management</h2>
            </div>
          </div>
          <form className="admin-collection-create" onSubmit={createCollection}>
            <input
              type="text"
              value={newCollectionName}
              onChange={(event) => setNewCollectionName(event.target.value)}
              placeholder="New collection name"
              required
            />
            <button type="submit" disabled={collectionSaving}>
              {collectionSaving ? 'Saving…' : 'Create'}
            </button>
          </form>
          <div className="admin-collection-list">
            {collections.map((collection) => (
              <article className="admin-collection" key={collection.id}>
                <div>
                  <strong>{collection.name}</strong>
                  <span>{collection.slug} · {collection.productCount} products</span>
                </div>
                <button type="button" onClick={() => toggleCollection(collection)} disabled={collectionSaving}>
                  {collection.active ? 'Deactivate' : 'Reactivate'}
                </button>
                <button
                  type="button"
                  className="admin-button--danger"
                  onClick={() => deleteCollection(collection)}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section__heading">
            <div>
              <p className="admin-eyebrow">Newsletter / {totalSubscribers} subscribers</p>
              <h2>Subscribers</h2>
            </div>
            <button type="button" onClick={exportSubscribers}>Export CSV</button>
          </div>
          <div className="admin-subscriber-list">
            {subscribers.map((subscriber) => (
              <p key={subscriber._id ?? subscriber.email}>
                {subscriber.email} · {subscriber.status}
              </p>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section__heading">
            <div>
              <p className="admin-eyebrow">Newsletter / {totalSubscribers} subscribers</p>
              <h2>Subscribers</h2>
            </div>
            <button type="button" onClick={exportSubscribers}>Export CSV</button>
          </div>
          <div className="admin-subscriber-list">
            {subscribers.map((subscriber) => (
              <p key={subscriber._id ?? subscriber.email}>
                {subscriber.email} · {subscriber.status}
              </p>
            ))}
          </div>
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
