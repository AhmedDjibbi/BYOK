import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../lib/api'
import { buildMediaGroups } from '../data/mediaSlots'
import { refreshSiteMedia } from '../hooks/useSiteMedia'
import './AdminPage.css'

const adminRequest = (token, path, options = {}) =>
  apiRequest(`/admin${path}`, { ...options, token })

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'grid', subtitle: 'Store performance at a glance' },
  { id: 'orders', label: 'Orders', icon: 'bag', subtitle: 'Confirm, fulfil, and cancel orders' },
  { id: 'products', label: 'Products', icon: 'tag', subtitle: 'Catalogue, pricing, and visibility' },
  { id: 'inventory', label: 'Inventory', icon: 'box', subtitle: 'Stock by product, colourway, and size' },
  { id: 'collections', label: 'Collections', icon: 'layers', subtitle: 'Group products into storefront collections' },
  { id: 'media', label: 'Media', icon: 'image', subtitle: 'Hero slides, banners, collection and product photos' },
  { id: 'reviews', label: 'Reviews', icon: 'star', subtitle: 'Moderate customer product reviews' },
  { id: 'messages', label: 'Messages', icon: 'mail', subtitle: 'Customer enquiries from the contact form' },
  { id: 'subscribers', label: 'Subscribers', icon: 'users', subtitle: 'Newsletter audience' },
  { id: 'settings', label: 'Settings', icon: 'sliders', subtitle: 'Shipping rules and store configuration' },
  { id: 'audit', label: 'Activity log', icon: 'history', subtitle: 'Recent staff actions' },
]

const ORDER_STATUSES = ['pending', 'confirmed', 'fulfilled', 'cancelled']

const ORDER_TONES = {
  pending: 'pending',
  confirmed: 'confirmed',
  fulfilled: 'fulfilled',
  cancelled: 'cancelled',
}

const CONTACT_TONES = { new: 'pending', open: 'confirmed', resolved: 'fulfilled' }
const REVIEW_TONES = { pending: 'pending', published: 'fulfilled', rejected: 'cancelled' }
const STOCK_TONES = { in: 'fulfilled', low: 'low', out: 'cancelled' }

const ICONS = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </>
  ),
  bag: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  tag: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7" cy="7" r="1.2" />
    </>
  ),
  box: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="m3 8 9 5 9-5" />
      <path d="M12 13v8" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </>
  ),
  star: <path d="m12 2 3.1 6.3L22 9.3l-5 4.9 1.2 7.8L12 18.6 5.8 22 7 14.2l-5-4.9 6.9-1L12 2Z" />,
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.9" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1 14h6M9 8h6M17 16h6" />
    </>
  ),
  history: (
    <>
      <path d="M3 3v5h5" />
      <path d="M3.1 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
  external: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="m20 6-11 11-5-5" />,
  alert: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
}

function Icon({ name, size = 16 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  )
}

function formatMoney(value, currency = 'TND') {
  return `${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortId(value) {
  return String(value || '').slice(-8).toUpperCase()
}

function stockLevel(quantity, threshold) {
  if (quantity <= 0) return 'out'
  if (quantity <= threshold) return 'low'
  return 'in'
}

function describeMetadata(metadata) {
  if (!metadata || !Object.keys(metadata).length) return '—'
  return Object.entries(metadata)
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: ${value.join(', ')}`
      if (value && typeof value === 'object') return `${key}: ${JSON.stringify(value)}`
      return `${key}: ${value}`
    })
    .join(' · ')
}

function Badge({ tone = 'neutral', children }) {
  return <span className={`admin-badge admin-badge--${tone}`}>{children}</span>
}

function Stars({ rating }) {
  return (
    <span className="admin-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <span key={value} aria-hidden="true" className={value <= rating ? 'is-filled' : ''}>
          ★
        </span>
      ))}
    </span>
  )
}

function EmptyState({ icon = 'box', title, description }) {
  return (
    <div className="admin-empty">
      <span className="admin-empty__icon">
        <Icon name={icon} size={20} />
      </span>
      <p className="admin-empty__title">{title}</p>
      {description && <p className="admin-empty__description">{description}</p>}
    </div>
  )
}

function LoadingState({ label = 'Loading' }) {
  return (
    <div className="admin-skeleton" role="status" aria-live="polite">
      <span className="admin-skeleton__row" />
      <span className="admin-skeleton__row" />
      <span className="admin-skeleton__row" />
      <span className="visually-hidden">{label}…</span>
    </div>
  )
}

function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null
  return (
    <nav className="admin-pagination" aria-label="Pagination">
      <button type="button" className="admin-btn admin-btn--sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button
        type="button"
        className="admin-btn admin-btn--sm"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  )
}

function Tabs({ options, value, onChange, ariaLabel }) {
  return (
    <div className="admin-tabs" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="admin-tab"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined && <span className="admin-tab__count">{option.count}</span>}
        </button>
      ))}
    </div>
  )
}

function Modal({ title, description, onClose, children, footer }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="admin-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="admin-modal__head">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </header>
        <div className="admin-modal__body">{children}</div>
        {footer && <footer className="admin-modal__foot">{footer}</footer>}
      </div>
    </div>
  )
}

async function fetchSection(token, id) {
  switch (id) {
    case 'overview': {
      const [stats, orders, inventory, subscribers, products] = await Promise.all([
        adminRequest(token, '/stats'),
        adminRequest(token, '/orders?limit=6'),
        adminRequest(token, '/inventory'),
        adminRequest(token, '/subscribers?limit=1'),
        adminRequest(token, '/products?limit=1&active=true'),
      ])
      return {
        stats,
        orders: orders.orders,
        inventory: inventory.inventory,
        subscribers: subscribers.total,
        liveProducts: products.total,
      }
    }
    case 'orders':
      return adminRequest(token, '/orders?limit=100')
    case 'products': {
      const [products, collections] = await Promise.all([
        adminRequest(token, '/products?limit=100'),
        adminRequest(token, '/collections'),
      ])
      return { products: products.products, total: products.total, collections: collections.collections }
    }
    case 'inventory': {
      const [inventory, stats] = await Promise.all([
        adminRequest(token, '/inventory'),
        adminRequest(token, '/stats'),
      ])
      return { inventory: inventory.inventory, lowStockThreshold: stats.lowStockThreshold }
    }
    case 'collections':
      return adminRequest(token, '/collections')
    case 'media': {
      const [assets, products, collections] = await Promise.all([
        adminRequest(token, '/media'),
        adminRequest(token, '/products?limit=100'),
        adminRequest(token, '/collections'),
      ])
      return {
        assets: assets.assets,
        products: products.products,
        collections: collections.collections,
      }
    }
    case 'reviews':
      return adminRequest(token, '/reviews?limit=100')
    case 'messages':
      return adminRequest(token, '/contacts?limit=100')
    case 'subscribers':
      return adminRequest(token, '/subscribers?limit=100')
    case 'settings':
      return adminRequest(token, '/settings/shipping')
    case 'audit':
      return adminRequest(token, '/audit?limit=100')
    default:
      throw new Error('Unknown admin section.')
  }
}

function OverviewSection({ data, onNavigate }) {
  if (!data) return <LoadingState label="Loading overview" />
  const { stats, orders, inventory, subscribers, liveProducts } = data
  const threshold = stats.lowStockThreshold
  const lowStock = inventory
    .filter((item) => item.quantity <= threshold)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 8)

  return (
    <>
      <div className="admin-stats">
        <article className="admin-stat">
          <span className="admin-stat__label">Net revenue</span>
          <strong className="admin-stat__value">{formatMoney(stats.revenue)}</strong>
          <span className="admin-stat__hint">Confirmed &amp; fulfilled orders</span>
        </article>
        <article className={`admin-stat${stats.pendingOrders ? ' admin-stat--warn' : ''}`}>
          <span className="admin-stat__label">Pending orders</span>
          <strong className="admin-stat__value">{stats.pendingOrders}</strong>
          <span className="admin-stat__hint">Awaiting confirmation</span>
        </article>
        <article className={`admin-stat${stats.lowStockVariants ? ' admin-stat--warn' : ''}`}>
          <span className="admin-stat__label">Low stock</span>
          <strong className="admin-stat__value">{stats.lowStockVariants}</strong>
          <span className="admin-stat__hint">Variants at {threshold} units or fewer</span>
        </article>
        <article className={`admin-stat${stats.newContacts ? ' admin-stat--warn' : ''}`}>
          <span className="admin-stat__label">New messages</span>
          <strong className="admin-stat__value">{stats.newContacts}</strong>
          <span className="admin-stat__hint">Unanswered enquiries</span>
        </article>
        <article className="admin-stat">
          <span className="admin-stat__label">Subscribers</span>
          <strong className="admin-stat__value">{subscribers}</strong>
          <span className="admin-stat__hint">Newsletter audience</span>
        </article>
        <article className="admin-stat">
          <span className="admin-stat__label">Live products</span>
          <strong className="admin-stat__value">{liveProducts}</strong>
          <span className="admin-stat__hint">Visible in the storefront</span>
        </article>
      </div>

      <div className="admin-grid-2">
        <section className="admin-card">
          <header className="admin-card__head">
            <div>
              <h2>Recent orders</h2>
              <p>Latest activity across the store</p>
            </div>
            <button type="button" className="admin-btn admin-btn--sm" onClick={() => onNavigate('orders')}>
              View all
            </button>
          </header>
          {!orders.length ? (
            <EmptyState icon="bag" title="No orders yet" description="New orders will appear here." />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Customer</th>
                    <th scope="col" className="num">
                      Total
                    </th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>
                        <span className="admin-mono">#{shortId(order._id)}</span>
                        <span className="admin-sub">{formatDate(order.createdAt)}</span>
                      </td>
                      <td>
                        <strong>{order.customer.name}</strong>
                        <span className="admin-sub">{order.customer.email}</span>
                      </td>
                      <td className="num">{formatMoney(order.total, order.shippingSnapshot?.currency)}</td>
                      <td>
                        <Badge tone={ORDER_TONES[order.status]}>{order.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-card">
          <header className="admin-card__head">
            <div>
              <h2>Low stock</h2>
              <p>Variants that need restocking first</p>
            </div>
            <button type="button" className="admin-btn admin-btn--sm" onClick={() => onNavigate('inventory')}>
              Manage stock
            </button>
          </header>
          {!lowStock.length ? (
            <EmptyState icon="check" title="Stock levels look healthy" description="Nothing is below the threshold." />
          ) : (
            <ul className="admin-list">
              {lowStock.map((item) => {
                const level = stockLevel(item.quantity, threshold)
                return (
                  <li key={`${item.productId}-${item.size}`}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {item.colorway} · {item.size}
                      </span>
                    </div>
                    <Badge tone={STOCK_TONES[level]}>{item.quantity === 0 ? 'Out' : `${item.quantity} left`}</Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

function OrdersSection({ data, onStatusChange, onExport, busyId }) {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState('')

  const orders = data?.orders ?? []

  const counts = useMemo(() => {
    const next = { '': orders.length }
    ORDER_STATUSES.forEach((value) => {
      next[value] = orders.filter((order) => order.status === value).length
    })
    return next
  }, [orders])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return orders.filter((order) => {
      if (status && order.status !== status) return false
      if (!query) return true
      return (
        order._id.toLowerCase().includes(query) ||
        order.customer.name.toLowerCase().includes(query) ||
        order.customer.email.toLowerCase().includes(query) ||
        order.customer.phone.toLowerCase().includes(query) ||
        order.customer.city.toLowerCase().includes(query)
      )
    })
  }, [orders, search, status])

  const pageSize = 10
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <section className="admin-card">
      <header className="admin-card__head admin-card__head--stack">
        <div>
          <h2>Orders</h2>
          <p>
            {filtered.length} order{filtered.length === 1 ? '' : 's'}
            {data && data.total > orders.length ? ` · showing first ${orders.length} of ${data.total}` : ''}
          </p>
        </div>
        <div className="admin-toolbar">
          <label className="admin-search">
            <Icon name="search" size={14} />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search order, customer, phone"
              aria-label="Search orders"
            />
          </label>
          <button type="button" className="admin-btn" onClick={() => onExport(status)}>
            <Icon name="download" size={14} />
            Export CSV
          </button>
        </div>
      </header>

      <div className="admin-card__filters">
        <Tabs
          ariaLabel="Filter orders by status"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'All', count: counts[''] },
            ...ORDER_STATUSES.map((value) => ({ value, label: value, count: counts[value] })),
          ]}
        />
      </div>

      {!orders.length ? (
        <EmptyState icon="bag" title="No orders yet" description="Orders placed in the storefront appear here." />
      ) : !filtered.length ? (
        <EmptyState icon="search" title="No matching orders" description="Try a different search or status." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--rows">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col" className="num">
                  Items
                </th>
                <th scope="col" className="num">
                  Total
                </th>
                <th scope="col">Status</th>
                <th scope="col" aria-label="Details" />
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => {
                const isOpen = expanded === order._id
                return (
                  <Fragment key={order._id}>
                    <tr
                      className={`admin-row ${isOpen ? 'is-open' : ''}`}
                      onClick={() => setExpanded(isOpen ? '' : order._id)}
                    >
                      <td>
                        <span className="admin-mono">#{shortId(order._id)}</span>
                        <span className="admin-sub">{formatDateTime(order.createdAt)}</span>
                      </td>
                      <td>
                        <strong>{order.customer.name}</strong>
                        <span className="admin-sub">
                          {order.customer.city} · {order.customer.email}
                        </span>
                      </td>
                      <td className="num">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                      <td className="num">{formatMoney(order.total, order.shippingSnapshot?.currency)}</td>
                      <td>
                        <Badge tone={ORDER_TONES[order.status]}>{order.status}</Badge>
                      </td>
                      <td className="admin-cell-end">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          aria-expanded={isOpen}
                          aria-label={isOpen ? 'Hide order details' : 'Show order details'}
                        >
                          <Icon name="chevron" size={16} />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="admin-row--detail">
                        <td colSpan={6}>
                          <div className="admin-order-detail">
                            <div className="admin-order-detail__main">
                              <h3>Items</h3>
                              <table className="admin-table admin-table--compact">
                                <thead>
                                  <tr>
                                    <th scope="col">Product</th>
                                    <th scope="col">Size</th>
                                    <th scope="col" className="num">
                                      Qty
                                    </th>
                                    <th scope="col" className="num">
                                      Line total
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item, index) => (
                                    <tr key={`${item.productId}-${item.size}-${index}`}>
                                      <td>
                                        <strong>{item.name}</strong>
                                        <span className="admin-sub">{item.colorway}</span>
                                      </td>
                                      <td>{item.size}</td>
                                      <td className="num">{item.quantity}</td>
                                      <td className="num">
                                        {formatMoney(item.unitPrice * item.quantity, order.shippingSnapshot?.currency)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <dl className="admin-totals">
                                <div>
                                  <dt>Subtotal</dt>
                                  <dd>{formatMoney(order.subtotal, order.shippingSnapshot?.currency)}</dd>
                                </div>
                                <div>
                                  <dt>Shipping</dt>
                                  <dd>{formatMoney(order.shippingFee, order.shippingSnapshot?.currency)}</dd>
                                </div>
                                <div className="admin-totals__grand">
                                  <dt>Total</dt>
                                  <dd>{formatMoney(order.total, order.shippingSnapshot?.currency)}</dd>
                                </div>
                              </dl>
                              <p className="admin-note">Cash on delivery</p>
                            </div>

                            <div className="admin-order-detail__side">
                              <h3>Customer</h3>
                              <address className="admin-address">
                                <strong>{order.customer.name}</strong>
                                <a href={`mailto:${encodeURIComponent(order.customer.email)}`}>
                                  {order.customer.email}
                                </a>
                                <a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a>
                                <span>
                                  {order.customer.address}, {order.customer.city}
                                </span>
                              </address>

                              <h3>Timeline</h3>
                              <ol className="admin-timeline">
                                {(order.statusHistory ?? []).map((entry, index) => (
                                  <li key={`${entry.status}-${index}`}>
                                    <span className={`admin-dot admin-dot--${ORDER_TONES[entry.status] ?? 'neutral'}`} />
                                    <div>
                                      <strong>{entry.status}</strong>
                                      <span>{formatDateTime(entry.at)}</span>
                                      {entry.note && <em>{entry.note}</em>}
                                    </div>
                                  </li>
                                ))}
                              </ol>

                              {order.status === 'pending' && order.expiresAt && (
                                <p className="admin-note">Stock reserved until {formatDateTime(order.expiresAt)}.</p>
                              )}
                              {order.cancelReason && <p className="admin-note">Cancel reason: {order.cancelReason}</p>}

                              <div className="admin-row-actions">
                                {order.status === 'pending' && (
                                  <button
                                    type="button"
                                    className="admin-btn admin-btn--primary"
                                    disabled={busyId === order._id}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      onStatusChange(order, 'confirmed')
                                    }}
                                  >
                                    <Icon name="check" size={14} />
                                    Confirm order
                                  </button>
                                )}
                                {order.status === 'confirmed' && (
                                  <button
                                    type="button"
                                    className="admin-btn admin-btn--primary"
                                    disabled={busyId === order._id}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      onStatusChange(order, 'fulfilled')
                                    }}
                                  >
                                    <Icon name="check" size={14} />
                                    Mark fulfilled
                                  </button>
                                )}
                                {['pending', 'confirmed'].includes(order.status) && (
                                  <button
                                    type="button"
                                    className="admin-btn admin-btn--danger"
                                    disabled={busyId === order._id}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      onStatusChange(order, 'cancelled')
                                    }}
                                  >
                                    <Icon name="close" size={14} />
                                    Cancel order
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={currentPage} pages={pages} onChange={setPage} />
    </section>
  )
}

function ProductsSection({ data, onCreate, onUpdate, onDeactivate }) {
  const [search, setSearch] = useState('')
  const [visibility, setVisibility] = useState('all')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const products = data?.products ?? []
  const collections = data?.collections ?? []

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((product) => {
      if (visibility === 'active' && !product.active) return false
      if (visibility === 'inactive' && product.active) return false
      if (!query) return true
      return (
        product.name.toLowerCase().includes(query) ||
        product.colorway.toLowerCase().includes(query) ||
        product.productId.toLowerCase().includes(query) ||
        (product.collection?.name ?? '').toLowerCase().includes(query)
      )
    })
  }, [products, search, visibility])

  const openCreate = () => {
    setForm({
      name: '',
      price: '',
      collectionId: collections[0]?.id ?? '',
      colorway: '',
      badge: '',
      sizes: '',
      active: true,
    })
    setFormError('')
    setModal({ mode: 'create', product: null })
  }

  const openEdit = (product) => {
    setForm({
      name: product.name,
      price: String(product.price),
      collectionId: product.collection?.id ?? '',
      colorway: product.colorway,
      badge: product.badge ?? '',
      sizes: product.sizes.join(', '),
      active: product.active,
    })
    setFormError('')
    setModal({ mode: 'edit', product })
  }

  const submit = async (event) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) return setFormError('Product name is required.')
    const price = Number(form.price)
    if (!Number.isFinite(price) || price < 0) return setFormError('Enter a valid price.')
    if (!form.collectionId) return setFormError('Choose a collection.')
    const payload = {
      name,
      price,
      collectionId: form.collectionId,
      colorway: form.colorway.trim() || 'Default',
      badge: form.badge.trim(),
      sizes: form.sizes
        .split(',')
        .map((size) => size.trim())
        .filter(Boolean),
      active: form.active,
    }
    setSaving(true)
    setFormError('')
    try {
      if (modal.mode === 'edit') await onUpdate(modal.product.id, payload)
      else await onCreate(payload)
      setModal(null)
    } catch (requestError) {
      setFormError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-card">
      <header className="admin-card__head admin-card__head--stack">
        <div>
          <h2>Products</h2>
          <p>
            {products.length} product{products.length === 1 ? '' : 's'}
            {data && data.total > products.length ? ` · showing first ${products.length} of ${data.total}` : ''}
          </p>
        </div>
        <div className="admin-toolbar">
          <label className="admin-search">
            <Icon name="search" size={14} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
              aria-label="Search products"
            />
          </label>
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate} disabled={!collections.length}>
            <Icon name="plus" size={14} />
            New product
          </button>
        </div>
      </header>

      <div className="admin-card__filters">
        <Tabs
          ariaLabel="Filter products by visibility"
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </div>

      {!products.length ? (
        <EmptyState icon="tag" title="No products yet" description="Create a product to start selling." />
      ) : !filtered.length ? (
        <EmptyState icon="search" title="No matching products" description="Try a different search or filter." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Collection</th>
                <th scope="col" className="num">
                  Price
                </th>
                <th scope="col">Sizes</th>
                <th scope="col">Status</th>
                <th scope="col" className="admin-cell-end">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                    <span className="admin-sub">
                      {product.colorway} · {product.productId}
                    </span>
                  </td>
                  <td>{product.collection?.name ?? '—'}</td>
                  <td className="num">{formatMoney(product.price)}</td>
                  <td>
                    <span className="admin-chip-row">
                      {product.sizes.length ? (
                        product.sizes.map((size) => (
                          <span className="admin-chip" key={size}>
                            {size}
                          </span>
                        ))
                      ) : (
                        <span className="admin-sub">None</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <Badge tone={product.active ? 'fulfilled' : 'cancelled'}>
                      {product.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="admin-cell-end">
                    <div className="admin-row-actions">
                      <button type="button" className="admin-btn admin-btn--sm" onClick={() => openEdit(product)}>
                        <Icon name="edit" size={13} />
                        Edit
                      </button>
                      {product.active && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--sm admin-btn--danger"
                          onClick={() => onDeactivate(product)}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && form && (
        <Modal
          title={modal.mode === 'edit' ? 'Edit product' : 'New product'}
          description={
            modal.mode === 'edit'
              ? 'Update pricing, visibility, and size run.'
              : 'Add a product to the catalogue. Sizes start with zero stock.'
          }
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="admin-btn" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="submit" form="admin-product-form" className="admin-btn admin-btn--primary" disabled={saving}>
                {saving ? 'Saving…' : modal.mode === 'edit' ? 'Save changes' : 'Create product'}
              </button>
            </>
          }
        >
          <form id="admin-product-form" className="admin-form" onSubmit={submit}>
            <label className="admin-field">
              <span>Name</span>
              <input
                className="admin-input"
                type="text"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <div className="admin-form__row">
              <label className="admin-field">
                <span>Price (TND)</span>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                  required
                />
              </label>
              <label className="admin-field">
                <span>Collection</span>
                <select
                  className="admin-input"
                  value={form.collectionId}
                  onChange={(event) => setForm((current) => ({ ...current, collectionId: event.target.value }))}
                  required
                >
                  <option value="" disabled>
                    Select a collection
                  </option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="admin-form__row">
              <label className="admin-field">
                <span>Colourway</span>
                <input
                  className="admin-input"
                  type="text"
                  value={form.colorway}
                  onChange={(event) => setForm((current) => ({ ...current, colorway: event.target.value }))}
                  placeholder="Default"
                />
              </label>
              <label className="admin-field">
                <span>Badge</span>
                <input
                  className="admin-input"
                  type="text"
                  value={form.badge}
                  onChange={(event) => setForm((current) => ({ ...current, badge: event.target.value }))}
                  placeholder="New drop, Limited…"
                />
              </label>
            </div>
            <label className="admin-field">
              <span>Sizes</span>
              <input
                className="admin-input"
                type="text"
                value={form.sizes}
                onChange={(event) => setForm((current) => ({ ...current, sizes: event.target.value }))}
                placeholder="XS, S, M, L, XL"
              />
              <span className="admin-field__hint">Comma separated. New sizes are added with zero stock.</span>
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
              />
              <span>Visible in the storefront</span>
            </label>
            {formError && (
              <p className="admin-form__error" role="alert">
                {formError}
              </p>
            )}
          </form>
        </Modal>
      )}
    </section>
  )
}

function InventorySection({ data, threshold, onSaveStock }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [drafts, setDrafts] = useState({})
  const [savingKey, setSavingKey] = useState('')

  const inventory = data?.inventory ?? []
  const counts = useMemo(
    () => ({
      all: inventory.length,
      in: inventory.filter((item) => stockLevel(item.quantity, threshold) === 'in').length,
      low: inventory.filter((item) => stockLevel(item.quantity, threshold) === 'low').length,
      out: inventory.filter((item) => stockLevel(item.quantity, threshold) === 'out').length,
    }),
    [inventory, threshold],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return inventory.filter((item) => {
      if (filter !== 'all' && stockLevel(item.quantity, threshold) !== filter) return false
      if (!query) return true
      return `${item.name} ${item.colorway} ${item.size} ${item.productId}`.toLowerCase().includes(query)
    })
  }, [filter, inventory, search, threshold])

  const save = async (item) => {
    const key = `${item.productId}::${item.size}`
    const raw = drafts[key] ?? String(item.quantity)
    if (String(raw).trim() === '') return
    const quantity = Number(raw)
    if (!Number.isInteger(quantity) || quantity < 0) return
    setSavingKey(key)
    const ok = await onSaveStock(item, quantity)
    setSavingKey('')
    if (ok) {
      setDrafts((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    }
  }

  return (
    <section className="admin-card">
      <header className="admin-card__head admin-card__head--stack">
        <div>
          <h2>Inventory</h2>
          <p>
            {counts.all} variants · {counts.low} low · {counts.out} out of stock
          </p>
        </div>
        <label className="admin-search">
          <Icon name="search" size={14} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product, colour, size"
            aria-label="Search inventory"
          />
        </label>
      </header>

      <div className="admin-card__filters">
        <Tabs
          ariaLabel="Filter inventory by stock level"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'in', label: 'In stock', count: counts.in },
            { value: 'low', label: 'Low stock', count: counts.low },
            { value: 'out', label: 'Out of stock', count: counts.out },
          ]}
        />
      </div>

      {!inventory.length ? (
        <EmptyState icon="box" title="No inventory records" description="Add products with sizes to track stock." />
      ) : !filtered.length ? (
        <EmptyState icon="search" title="No matching variants" description="Try a different search or filter." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Colourway</th>
                <th scope="col">Size</th>
                <th scope="col">Status</th>
                <th scope="col" className="num">
                  Units
                </th>
                <th scope="col" className="admin-cell-end">
                  Update
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const key = `${item.productId}::${item.size}`
                const level = stockLevel(item.quantity, threshold)
                const draft = drafts[key] ?? String(item.quantity)
                const dirty = Number(draft) !== item.quantity
                return (
                  <tr key={key}>
                    <td>
                      <strong>{item.name}</strong>
                      <span className="admin-sub">{item.productId}</span>
                    </td>
                    <td>{item.colorway}</td>
                    <td>
                      <span className="admin-chip">{item.size}</span>
                    </td>
                    <td>
                      <Badge tone={STOCK_TONES[level]}>
                        {level === 'out' ? 'Out of stock' : level === 'low' ? 'Low stock' : 'In stock'}
                      </Badge>
                    </td>
                    <td className="num">
                      <input
                        className="admin-input admin-input--qty"
                        type="number"
                        min="0"
                        max="100000"
                        step="1"
                        value={draft}
                        aria-label={`Stock for ${item.name}, ${item.colorway}, size ${item.size}`}
                        onChange={(event) =>
                          setDrafts((current) => ({ ...current, [key]: event.target.value }))
                        }
                      />
                    </td>
                    <td className="admin-cell-end">
                      <button
                        type="button"
                        className="admin-btn admin-btn--sm admin-btn--primary"
                        disabled={!dirty || savingKey === key}
                        onClick={() => save(item)}
                      >
                        {savingKey === key ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="admin-note admin-card__foot">
        Saving checks the previous quantity, so two people editing the same variant cannot overwrite each other.
      </p>
    </section>
  )
}

function CollectionsSection({ data, onCreate, onToggle, onDelete, busy }) {
  const [name, setName] = useState('')

  const collections = data?.collections ?? []

  const submit = async (event) => {
    event.preventDefault()
    const value = name.trim()
    if (!value) return
    const ok = await onCreate(value)
    if (ok) setName('')
  }

  return (
    <section className="admin-card">
      <header className="admin-card__head admin-card__head--stack">
        <div>
          <h2>Collections</h2>
          <p>{collections.length} collections power the storefront navigation</p>
        </div>
        <form className="admin-inline-form" onSubmit={submit}>
          <input
            className="admin-input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New collection name"
            aria-label="New collection name"
            required
          />
          <button type="submit" className="admin-btn admin-btn--primary" disabled={busy || !name.trim()}>
            <Icon name="plus" size={14} />
            Create
          </button>
        </form>
      </header>

      {!collections.length ? (
        <EmptyState icon="layers" title="No collections yet" description="Create one to organise the catalogue." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Slug</th>
                <th scope="col" className="num">
                  Products
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="admin-cell-end">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => (
                <tr key={collection.id}>
                  <td>
                    <strong>{collection.name}</strong>
                    {collection.description && <span className="admin-sub">{collection.description}</span>}
                  </td>
                  <td>
                    <code className="admin-code">{collection.slug}</code>
                  </td>
                  <td className="num">{collection.productCount}</td>
                  <td>
                    <Badge tone={collection.active ? 'fulfilled' : 'cancelled'}>
                      {collection.active ? 'Active' : 'Hidden'}
                    </Badge>
                  </td>
                  <td className="admin-cell-end">
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn--sm"
                        disabled={busy}
                        onClick={() => onToggle(collection)}
                      >
                        {collection.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--sm admin-btn--danger"
                        disabled={busy}
                        onClick={() => onDelete(collection)}
                      >
                        <Icon name="trash" size={13} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="admin-note admin-card__foot">
        Collections with products cannot be deleted. Deactivate them to hide them from the storefront instead.
      </p>
    </section>
  )
}

function ReviewsSection({ data, onModerate, onDelete, busyId }) {
  const [status, setStatus] = useState('pending')
  const reviews = data?.reviews ?? []

  const counts = useMemo(() => {
    const next = { all: reviews.length, pending: 0, published: 0, rejected: 0 }
    reviews.forEach((review) => {
      next[review.status] = (next[review.status] ?? 0) + 1
    })
    return next
  }, [reviews])

  const filtered = status === 'all' ? reviews : reviews.filter((review) => review.status === status)

  return (
    <section className="admin-card">
      <header className="admin-card__head">
        <div>
          <h2>Reviews</h2>
          <p>Publish genuine feedback, reject spam</p>
        </div>
      </header>

      <div className="admin-card__filters">
        <Tabs
          ariaLabel="Filter reviews by status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'pending', label: 'Pending', count: counts.pending },
            { value: 'published', label: 'Published', count: counts.published },
            { value: 'rejected', label: 'Rejected', count: counts.rejected },
            { value: 'all', label: 'All', count: counts.all },
          ]}
        />
      </div>

      {!reviews.length ? (
        <EmptyState icon="star" title="No reviews yet" description="Customer reviews appear here for moderation." />
      ) : !filtered.length ? (
        <EmptyState icon="star" title="Nothing in this queue" description="Switch tabs to see other reviews." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Rating</th>
                <th scope="col">Product</th>
                <th scope="col">Review</th>
                <th scope="col">Customer</th>
                <th scope="col">Status</th>
                <th scope="col" className="admin-cell-end">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((review) => (
                <tr key={review._id}>
                  <td>
                    <Stars rating={review.rating} />
                  </td>
                  <td>
                    <code className="admin-code">{review.productId}</code>
                  </td>
                  <td className="admin-cell-long">
                    {review.title && <strong>{review.title}</strong>}
                    <span className="admin-sub">{review.body || 'No written comment.'}</span>
                  </td>
                  <td>
                    <strong>{review.userId?.name ?? 'Customer'}</strong>
                    <span className="admin-sub">{review.userId?.email ?? '—'}</span>
                    <span className="admin-sub">{formatDate(review.createdAt)}</span>
                  </td>
                  <td>
                    <Badge tone={REVIEW_TONES[review.status]}>{review.status}</Badge>
                  </td>
                  <td className="admin-cell-end">
                    <div className="admin-row-actions">
                      {review.status !== 'published' && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--sm admin-btn--primary"
                          disabled={busyId === review._id}
                          onClick={() => onModerate(review, 'published')}
                        >
                          Publish
                        </button>
                      )}
                      {review.status !== 'rejected' && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--sm"
                          disabled={busyId === review._id}
                          onClick={() => onModerate(review, 'rejected')}
                        >
                          Reject
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-btn admin-btn--sm admin-btn--danger"
                        disabled={busyId === review._id}
                        onClick={() => onDelete(review)}
                        aria-label="Delete review"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function MessagesSection({ data, onStatus, onDelete, busyId }) {
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState('')
  const messages = data?.messages ?? []

  const counts = useMemo(() => {
    const next = { all: messages.length, new: 0, open: 0, resolved: 0 }
    messages.forEach((message) => {
      next[message.status] = (next[message.status] ?? 0) + 1
    })
    return next
  }, [messages])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return messages.filter((message) => {
      if (status !== 'all' && message.status !== status) return false
      if (!query) return true
      return `${message.name} ${message.email} ${message.subject} ${message.message}`
        .toLowerCase()
        .includes(query)
    })
  }, [messages, search, status])

  return (
    <section className="admin-card">
      <header className="admin-card__head admin-card__head--stack">
        <div>
          <h2>Messages</h2>
          <p>{counts.new} new enquiries waiting for a reply</p>
        </div>
        <label className="admin-search">
          <Icon name="search" size={14} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search messages"
            aria-label="Search messages"
          />
        </label>
      </header>

      <div className="admin-card__filters">
        <Tabs
          ariaLabel="Filter messages by status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'new', label: 'New', count: counts.new },
            { value: 'open', label: 'Open', count: counts.open },
            { value: 'resolved', label: 'Resolved', count: counts.resolved },
          ]}
        />
      </div>

      {!messages.length ? (
        <EmptyState icon="mail" title="No messages" description="Contact form submissions land here." />
      ) : !filtered.length ? (
        <EmptyState icon="search" title="No matching messages" description="Try a different search or status." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--rows">
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col">From</th>
                <th scope="col">Received</th>
                <th scope="col">Status</th>
                <th scope="col" className="admin-cell-end">
                  Actions
                </th>
                <th scope="col" aria-label="Details" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((message) => {
                const isOpen = expanded === message._id
                return (
                  <Fragment key={message._id}>
                    <tr
                      className={`admin-row ${isOpen ? 'is-open' : ''}`}
                      onClick={() => setExpanded(isOpen ? '' : message._id)}
                    >
                      <td>
                        <strong>{message.subject}</strong>
                      </td>
                      <td>
                        <strong>{message.name}</strong>
                        <span className="admin-sub">{message.email}</span>
                      </td>
                      <td>{formatDateTime(message.createdAt)}</td>
                      <td>
                        <Badge tone={CONTACT_TONES[message.status]}>{message.status}</Badge>
                      </td>
                      <td className="admin-cell-end">
                        <div className="admin-row-actions">
                          {message.status !== 'resolved' && (
                            <button
                              type="button"
                              className="admin-btn admin-btn--sm admin-btn--primary"
                              disabled={busyId === message._id}
                              onClick={(event) => {
                                event.stopPropagation()
                                onStatus(message, 'resolved')
                              }}
                            >
                              Resolve
                            </button>
                          )}
                          {message.status === 'new' && (
                            <button
                              type="button"
                              className="admin-btn admin-btn--sm"
                              disabled={busyId === message._id}
                              onClick={(event) => {
                                event.stopPropagation()
                                onStatus(message, 'open')
                              }}
                            >
                              Open
                            </button>
                          )}
                          <button
                            type="button"
                            className="admin-btn admin-btn--sm admin-btn--danger"
                            disabled={busyId === message._id}
                            onClick={(event) => {
                              event.stopPropagation()
                              onDelete(message)
                            }}
                            aria-label="Delete message"
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </td>
                      <td className="admin-cell-end">
                        <button
                          type="button"
                          className="admin-icon-btn"
                          aria-expanded={isOpen}
                          aria-label={isOpen ? 'Hide message' : 'Show message'}
                        >
                          <Icon name="chevron" size={16} />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="admin-row--detail">
                        <td colSpan={6}>
                          <div className="admin-message-detail">
                            <p>{message.message}</p>
                            <div className="admin-row-actions">
                              <a className="admin-btn admin-btn--sm" href={`mailto:${encodeURIComponent(message.email)}`}>
                                <Icon name="mail" size={13} />
                                Reply by email
                              </a>
                              {message.handledAt && (
                                <span className="admin-note">Resolved {formatDateTime(message.handledAt)}</span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function SubscribersSection({ data, onExport }) {
  const [search, setSearch] = useState('')
  const subscribers = data?.subscribers ?? []
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return subscribers
    return subscribers.filter((subscriber) => subscriber.email.toLowerCase().includes(query))
  }, [search, subscribers])

  return (
    <section className="admin-card">
      <header className="admin-card__head admin-card__head--stack">
        <div>
          <h2>Subscribers</h2>
          <p>
            {data?.total ?? subscribers.length} total ·{' '}
            {subscribers.filter((subscriber) => subscriber.status === 'subscribed').length} subscribed
          </p>
        </div>
        <div className="admin-toolbar">
          <label className="admin-search">
            <Icon name="search" size={14} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search email"
              aria-label="Search subscribers"
            />
          </label>
          <button type="button" className="admin-btn" onClick={onExport}>
            <Icon name="download" size={14} />
            Export CSV
          </button>
        </div>
      </header>

      {!subscribers.length ? (
        <EmptyState icon="users" title="No subscribers yet" description="Newsletter signups appear here." />
      ) : !filtered.length ? (
        <EmptyState icon="search" title="No matching subscribers" description="Try a different email." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
                <th scope="col">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((subscriber) => (
                <tr key={subscriber._id ?? subscriber.email}>
                  <td>
                    <strong>{subscriber.email}</strong>
                  </td>
                  <td>
                    <Badge tone={subscriber.status === 'subscribed' ? 'fulfilled' : 'cancelled'}>
                      {subscriber.status}
                    </Badge>
                  </td>
                  <td>{formatDate(subscriber.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function SettingsSection({ data, onSave, saving }) {
  const [form, setForm] = useState(() => data?.shipping ?? { mode: 'fixed', value: 0, currency: 'TND' })

  useEffect(() => {
    if (data?.shipping) setForm(data.shipping)
  }, [data])

  const preview =
    form.mode === 'fixed'
      ? formatMoney(form.value, form.currency)
      : `${Number(form.value || 0)}% of subtotal`

  return (
    <div className="admin-grid-2 admin-grid-2--settings">
      <section className="admin-card">
        <header className="admin-card__head">
          <div>
            <h2>Shipping</h2>
            <p>Applied to new orders at checkout</p>
          </div>
        </header>
        <form
          className="admin-form admin-form--padded"
          onSubmit={(event) => {
            event.preventDefault()
            onSave(form)
          }}
        >
          <fieldset className="admin-fieldset">
            <legend>Charging mode</legend>
            <label className="admin-check">
              <input
                type="radio"
                name="shipping-mode"
                checked={form.mode === 'fixed'}
                onChange={() => setForm((current) => ({ ...current, mode: 'fixed' }))}
              />
              <span>
                Fixed amount
                <em>Same fee on every order</em>
              </span>
            </label>
            <label className="admin-check">
              <input
                type="radio"
                name="shipping-mode"
                checked={form.mode === 'percentage'}
                onChange={() => setForm((current) => ({ ...current, mode: 'percentage' }))}
              />
              <span>
                Percentage of subtotal
                <em>Fee scales with the cart value</em>
              </span>
            </label>
          </fieldset>

          <div className="admin-form__row">
            <label className="admin-field">
              <span>{form.mode === 'fixed' ? 'Amount' : 'Percentage'}</span>
              <input
                className="admin-input"
                type="number"
                min="0"
                step={form.mode === 'fixed' ? '0.01' : '1'}
                value={form.value}
                onChange={(event) =>
                  setForm((current) => ({ ...current, value: Number(event.target.value) }))
                }
              />
            </label>
            <label className="admin-field">
              <span>Currency</span>
              <input
                className="admin-input"
                type="text"
                maxLength="3"
                value={form.currency}
                onChange={(event) =>
                  setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))
                }
              />
            </label>
          </div>

          <div className="admin-callout">
            <span className="admin-callout__label">Checkout preview</span>
            <strong>A 100 {form.currency} cart pays {preview} shipping.</strong>
          </div>

          <div className="admin-form__actions">
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save shipping settings'}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <header className="admin-card__head">
          <div>
            <h2>Environment</h2>
            <p>Configured on the server, not editable here</p>
          </div>
        </header>
        <ul className="admin-list admin-list--plain">
          <li>
            <div>
              <strong>Database</strong>
              <span>MongoDB connection and credentials</span>
            </div>
            <code className="admin-code">MONGODB_URI</code>
          </li>
          <li>
            <div>
              <strong>Staff API token</strong>
              <span>Required for this console</span>
            </div>
            <code className="admin-code">ADMIN_API_TOKEN</code>
          </li>
          <li>
            <div>
              <strong>Rate limiting</strong>
              <span>Shared limits across instances</span>
            </div>
            <code className="admin-code">REDIS_URL</code>
          </li>
          <li>
            <div>
              <strong>Low stock threshold</strong>
              <span>Used by inventory alerts</span>
            </div>
            <code className="admin-code">LOW_STOCK_THRESHOLD</code>
          </li>
        </ul>
        <p className="admin-note admin-card__foot">
          Change these values in your hosting provider&apos;s environment settings, then redeploy.
        </p>
      </section>
    </div>
  )
}

function MediaSection({ data, onSave, onReset, busySlot }) {
  const [group, setGroup] = useState('')
  const [modalSlot, setModalSlot] = useState(null)
  const [form, setForm] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  const collections = data?.collections ?? []
  const products = data?.products ?? []
  const assets = data?.assets ?? []
  const groups = useMemo(() => buildMediaGroups({ collections, products }), [collections, products])

  useEffect(() => {
    if (!group && groups.length) setGroup(groups[0].id)
    if (group && !groups.some((entry) => entry.id === group) && groups.length) {
      setGroup(groups[0].id)
    }
  }, [groups, group])

  const activeGroup = groups.find((entry) => entry.id === group) ?? groups[0]

  const assetBySlot = useMemo(() => {
    const map = new Map()
    assets.forEach((asset) => map.set(asset.slot, asset))
    return map
  }, [assets])

  const openEdit = (slotEntry) => {
    const asset = assetBySlot.get(slotEntry.slot)
    setForm({
      slot: slotEntry.slot,
      mode: asset?.kind === 'external' ? 'url' : 'upload',
      dataUrl: '',
      url: asset?.kind === 'external' ? asset.url : '',
      alt: asset?.alt ?? slotEntry.fallback?.alt ?? '',
    })
    setFormError('')
    setModalSlot(slotEntry)
  }

  const close = () => {
    setModalSlot(null)
    setForm(null)
    setFormError('')
  }

  const onFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFormError('Choose an image file.')
      return
    }
    if (file.size > 2_500_000) {
      setFormError('Image must be smaller than 2.5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm((current) => ({ ...current, dataUrl: reader.result, url: '' }))
    reader.readAsDataURL(file)
    setFormError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form || !modalSlot) return
    const payload = { alt: form.alt }
    if (form.mode === 'upload') {
      if (!form.dataUrl) {
        setFormError('Choose an image file.')
        return
      }
      payload.dataUrl = form.dataUrl
    } else {
      if (!form.url.trim()) {
        setFormError('Enter an image URL.')
        return
      }
      payload.url = form.url.trim()
    }
    setSaving(true)
    setFormError('')
    try {
      await onSave(modalSlot.slot, payload)
      close()
    } catch (requestError) {
      setFormError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-card">
      <header className="admin-card__head admin-card__head--stack">
        <div>
          <h2>Media library</h2>
          <p>
            {assets.length} custom override{assets.length === 1 ? '' : 's'} across{' '}
            {groups.reduce((total, entry) => total + entry.slots.length, 0)} editable slots
          </p>
        </div>
        <div className="admin-tabs" role="group" aria-label="Media group">
          {groups.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="admin-tab"
              aria-pressed={activeGroup?.id === entry.id}
              onClick={() => setGroup(entry.id)}
            >
              {entry.label}
              <span className="admin-tab__count">{entry.slots.length}</span>
            </button>
          ))}
        </div>
      </header>

      {activeGroup && (
        <>
          <p className="admin-note" style={{ padding: '10px 18px 0' }}>
            {activeGroup.description}
          </p>
          <div className="admin-media-grid">
            {activeGroup.slots.map((slotEntry) => {
              const asset = assetBySlot.get(slotEntry.slot)
              const preview = asset?.url || slotEntry.fallback?.image
              const overridden = Boolean(asset)
              return (
                <article className="admin-media-card" key={slotEntry.slot}>
                  <div className="admin-media-card__preview">
                    {preview ? (
                      <img src={preview} alt={asset?.alt || slotEntry.fallback?.alt || ''} loading="lazy" />
                    ) : (
                      <div className="admin-media-card__placeholder">
                        <Icon name="image" size={20} />
                        <span>No photo</span>
                      </div>
                    )}
                    {overridden && (
                      <span className="admin-badge admin-badge--pending admin-media-card__badge">Custom</span>
                    )}
                  </div>
                  <div className="admin-media-card__body">
                    <strong>{slotEntry.label}</strong>
                    <code className="admin-code">{slotEntry.slot}</code>
                    {slotEntry.hint && <span className="admin-note">{slotEntry.hint}</span>}
                    {asset?.alt && <span className="admin-sub">Alt: {asset.alt}</span>}
                  </div>
                  <div className="admin-media-card__actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--sm admin-btn--primary"
                      onClick={() => openEdit(slotEntry)}
                    >
                      <Icon name="edit" size={13} /> Replace
                    </button>
                    {overridden && (
                      <button
                        type="button"
                        className="admin-btn admin-btn--sm admin-btn--danger"
                        disabled={busySlot === slotEntry.slot}
                        onClick={() => onReset(slotEntry.slot)}
                      >
                        <Icon name="trash" size={13} /> Reset
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}

      {modalSlot && form && (
        <Modal
          title={`Replace ${modalSlot.label}`}
          description="Upload an image (max 2.5 MB) or paste an external URL."
          onClose={close}
          footer={
            <>
              <button type="button" className="admin-btn" onClick={close}>
                Cancel
              </button>
              <button
                type="submit"
                form="admin-media-form"
                className="admin-btn admin-btn--primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save media'}
              </button>
            </>
          }
        >
          <form id="admin-media-form" className="admin-form" onSubmit={submit}>
            <fieldset className="admin-fieldset">
              <legend>Source</legend>
              <label className="admin-check">
                <input
                  type="radio"
                  name="media-mode"
                  checked={form.mode === 'upload'}
                  onChange={() => setForm((current) => ({ ...current, mode: 'upload' }))}
                />
                <span>
                  Upload file
                  <em>JPEG, PNG, WebP, AVIF or GIF</em>
                </span>
              </label>
              <label className="admin-check">
                <input
                  type="radio"
                  name="media-mode"
                  checked={form.mode === 'url'}
                  onChange={() => setForm((current) => ({ ...current, mode: 'url' }))}
                />
                <span>
                  External URL
                  <em>Paste a hosted image link</em>
                </span>
              </label>
            </fieldset>

            {form.mode === 'upload' ? (
              <label className="admin-field">
                <span>Image file</span>
                <input type="file" accept="image/*" onChange={onFileChange} />
                {form.dataUrl && (
                  <img className="admin-media-preview" src={form.dataUrl} alt="Preview of the selected image" />
                )}
              </label>
            ) : (
              <label className="admin-field">
                <span>Image URL</span>
                <input
                  className="admin-input"
                  type="url"
                  value={form.url}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, url: event.target.value }))
                  }
                  placeholder="https://…"
                />
              </label>
            )}

            <label className="admin-field">
              <span>Alt text</span>
              <input
                className="admin-input"
                type="text"
                maxLength={200}
                value={form.alt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, alt: event.target.value }))
                }
                placeholder="Describe the image for accessibility"
              />
            </label>

            {formError && (
              <p className="admin-form__error" role="alert">
                {formError}
              </p>
            )}
          </form>
        </Modal>
      )}
    </section>
  )
}

function AuditSection({ data }) {
  const entries = data?.entries ?? []
  return (
    <section className="admin-card">
      <header className="admin-card__head">
        <div>
          <h2>Activity log</h2>
          <p>Recent staff and system actions</p>
        </div>
      </header>
      {!entries.length ? (
        <EmptyState icon="history" title="No activity yet" description="Actions in this console are recorded here." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Action</th>
                <th scope="col">Target</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry._id}>
                  <td>{formatDateTime(entry.createdAt)}</td>
                  <td>
                    <code className="admin-code">{entry.action}</code>
                  </td>
                  <td>{entry.targetType ?? '—'}</td>
                  <td className="admin-cell-long">
                    <span className="admin-sub">{describeMetadata(entry.metadata)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function AdminPage() {
  const [token, setToken] = useState('')
  const [activeToken, setActiveToken] = useState('')
  const [section, setSection] = useState('overview')
  const [data, setData] = useState({})
  const [loadingSection, setLoadingSection] = useState('')
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [syncedAt, setSyncedAt] = useState(null)
  const [signingIn, setSigningIn] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [mediaBusySlot, setMediaBusySlot] = useState('')
  const [collectionBusy, setCollectionBusy] = useState(false)
  const [shippingSaving, setShippingSaving] = useState(false)

  const themeRef = useRef(section)
  themeRef.current = section

  const loadSection = useCallback(async (staffToken, id) => {
    setLoadingSection(id)
    setLoadError('')
    try {
      const payload = await fetchSection(staffToken, id)
      setData((current) => ({ ...current, [id]: payload }))
      setSyncedAt(new Date())
    } catch (requestError) {
      setLoadError(requestError.message)
    } finally {
      setLoadingSection('')
    }
  }, [])

  useEffect(() => {
    if (!activeToken) return
    loadSection(activeToken, themeRef.current)
  }, [activeToken, section, loadSection])

  useEffect(() => {
    if (!error && !notice) return undefined
    const timer = setTimeout(() => {
      setError('')
      setNotice('')
    }, 6000)
    return () => clearTimeout(timer)
  }, [error, notice])

  const signIn = async (event) => {
    event.preventDefault()
    const candidate = token.trim()
    if (!candidate) return
    setSigningIn(true)
    setError('')
    try {
      await adminRequest(candidate, '/stats')
      setActiveToken(candidate)
      setToken('')
      setSection('overview')
    } catch (requestError) {
      setError(
        requestError.status === 401
          ? 'That staff token was rejected. Check the token configured on the server.'
          : requestError.message,
      )
    } finally {
      setSigningIn(false)
    }
  }

  const signOut = () => {
    setActiveToken('')
    setToken('')
    setData({})
    setNotice('')
    setError('')
    setSyncedAt(null)
    setSection('overview')
  }

  const navigate = (id) => {
    setSection(id)
    setError('')
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const refresh = () => loadSection(activeToken, section)

  const changeOrderStatus = async (order, status) => {
    if (status === 'cancelled' && !window.confirm(`Cancel order #${shortId(order._id)}? Stock will be returned to inventory.`)) {
      return
    }
    setBusyId(order._id)
    setError('')
    setNotice('')
    try {
      const result = await adminRequest(activeToken, `/orders/${order._id}/status`, {
        method: 'PATCH',
        body: { status },
      })
      setNotice(
        `Order #${shortId(order._id)} moved to ${status}. Email: ${result.notification?.email ?? 'n/a'}, SMS: ${
          result.notification?.sms ?? 'n/a'
        }.`,
      )
      await loadSection(activeToken, 'orders')
      if (data.overview) await loadSection(activeToken, 'overview')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId('')
    }
  }

  const exportCsv = async (path, filename) => {
    setError('')
    try {
      const response = await fetch(`/api/admin${path}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
      if (!response.ok) throw new Error('The export could not be generated. Try again.')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setNotice('Export downloaded.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const saveStock = async (item, quantity) => {
    setError('')
    setNotice('')
    try {
      const result = await adminRequest(
        activeToken,
        `/inventory/${encodeURIComponent(item.productId)}/${encodeURIComponent(item.size)}`,
        { method: 'PUT', body: { quantity, expectedQuantity: item.quantity } },
      )
      setData((current) => {
        const inventory = current.inventory
        if (!inventory) return current
        return {
          ...current,
          inventory: {
            ...inventory,
            inventory: inventory.inventory.map((entry) =>
              entry.productId === item.productId && entry.size === item.size
                ? { ...entry, quantity: result.quantity }
                : entry,
            ),
          },
        }
      })
      setNotice(`${item.name} · ${item.colorway} · ${item.size}: ${result.quantity} units in stock.`)
      if (data.overview) await loadSection(activeToken, 'overview')
      return true
    } catch (requestError) {
      setError(requestError.message)
      return false
    }
  }

  const createCollection = async (name) => {
    setCollectionBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await adminRequest(activeToken, '/collections', { method: 'POST', body: { name } })
      setNotice(`Collection created: ${result.collection.name}.`)
      await loadSection(activeToken, 'collections')
      if (data.products) await loadSection(activeToken, 'products')
      return true
    } catch (requestError) {
      setError(requestError.message)
      return false
    } finally {
      setCollectionBusy(false)
    }
  }

  const toggleCollection = async (collection) => {
    setCollectionBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await adminRequest(activeToken, `/collections/${collection.id}`, {
        method: 'PATCH',
        body: { active: !collection.active },
      })
      setNotice(`${result.collection.name} is now ${result.collection.active ? 'active' : 'hidden'}.`)
      await loadSection(activeToken, 'collections')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCollectionBusy(false)
    }
  }

  const deleteCollection = async (collection) => {
    if (!window.confirm(`Delete the “${collection.name}” collection? This cannot be undone.`)) return
    setCollectionBusy(true)
    setError('')
    setNotice('')
    try {
      await adminRequest(activeToken, `/collections/${collection.id}`, { method: 'DELETE' })
      setNotice(`Collection deleted: ${collection.name}.`)
      await loadSection(activeToken, 'collections')
      if (data.products) await loadSection(activeToken, 'products')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCollectionBusy(false)
    }
  }

  const saveMedia = async (slot, payload) => {
    setMediaBusySlot(slot)
    setError('')
    setNotice('')
    try {
      const result = await adminRequest(activeToken, `/media/${encodeURIComponent(slot)}`, {
        method: 'PUT',
        body: payload,
      })
      setNotice(`Media updated: ${slot}.`)
      setData((current) => {
        const media = current.media
        if (!media) return current
        const assets = media.assets.filter((asset) => asset.slot !== slot)
        assets.push(result.asset)
        return { ...current, media: { ...media, assets } }
      })
      await loadSection(activeToken, 'media')
      await refreshSiteMedia()
    } catch (requestError) {
      setError(requestError.message)
      throw requestError
    } finally {
      setMediaBusySlot('')
    }
  }

  const resetMedia = async (slot) => {
    if (!window.confirm(`Reset “${slot}” to its default image?`)) return
    setMediaBusySlot(slot)
    setError('')
    setNotice('')
    try {
      await adminRequest(activeToken, `/media/${encodeURIComponent(slot)}`, { method: 'DELETE' })
      setNotice(`Media reset: ${slot}.`)
      setData((current) => {
        const media = current.media
        if (!media) return current
        return { ...current, media: { ...media, assets: media.assets.filter((asset) => asset.slot !== slot) } }
      })
      await loadSection(activeToken, 'media')
      await refreshSiteMedia()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setMediaBusySlot('')
    }
  }

  const createProduct = async (payload) => {
    await adminRequest(activeToken, '/products', { method: 'POST', body: payload })
    setNotice('Product created.')
    await loadSection(activeToken, 'products')
    if (data.overview) await loadSection(activeToken, 'overview')
  }

  const updateProduct = async (id, payload) => {
    await adminRequest(activeToken, `/products/${id}`, { method: 'PATCH', body: payload })
    setNotice('Product updated.')
    await loadSection(activeToken, 'products')
  }

  const deactivateProduct = async (product) => {
    if (!window.confirm(`Deactivate “${product.name}”? It will be hidden from the storefront.`)) return
    setError('')
    setNotice('')
    try {
      await adminRequest(activeToken, `/products/${product.id}`, { method: 'DELETE' })
      setNotice(`${product.name} deactivated.`)
      await loadSection(activeToken, 'products')
      if (data.overview) await loadSection(activeToken, 'overview')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const moderateReview = async (review, status) => {
    setBusyId(review._id)
    setError('')
    setNotice('')
    try {
      await adminRequest(activeToken, `/reviews/${review._id}`, { method: 'PATCH', body: { status } })
      setNotice(`Review ${status}.`)
      await loadSection(activeToken, 'reviews')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId('')
    }
  }

  const deleteReview = async (review) => {
    if (!window.confirm('Delete this review permanently?')) return
    setBusyId(review._id)
    setError('')
    setNotice('')
    try {
      await adminRequest(activeToken, `/reviews/${review._id}`, { method: 'DELETE' })
      setNotice('Review deleted.')
      await loadSection(activeToken, 'reviews')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId('')
    }
  }

  const setContactStatus = async (message, status) => {
    setBusyId(message._id)
    setError('')
    setNotice('')
    try {
      await adminRequest(activeToken, `/contacts/${message._id}`, { method: 'PATCH', body: { status } })
      setNotice(`Message marked ${status}.`)
      await loadSection(activeToken, 'messages')
      if (data.overview) await loadSection(activeToken, 'overview')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId('')
    }
  }

  const deleteContact = async (message) => {
    if (!window.confirm('Delete this message permanently?')) return
    setBusyId(message._id)
    setError('')
    setNotice('')
    try {
      await adminRequest(activeToken, `/contacts/${message._id}`, { method: 'DELETE' })
      setNotice('Message deleted.')
      await loadSection(activeToken, 'messages')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId('')
    }
  }

  const saveShipping = async (form) => {
    setShippingSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await adminRequest(activeToken, '/settings/shipping', {
        method: 'PUT',
        body: { shipping: form },
      })
      setData((current) => ({ ...current, settings: { shipping: result.shipping } }))
      setNotice('Shipping settings saved.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setShippingSaving(false)
    }
  }

  if (!activeToken) {
    return (
      <main className="admin-login-shell">
        <section className="admin-login-card">
          <div className="admin-login-brand">
            <a className="admin-logo" href="/">
              BYOC
            </a>
            <p className="admin-eyebrow">Staff console</p>
            <h1>Run the store</h1>
            <p>Orders, stock, catalogue, and customer messages in one place.</p>
          </div>
          <div className="admin-login-panel">
            <h2>Sign in</h2>
            <p>Enter the staff API token configured on the server.</p>
            <form className="admin-form" onSubmit={signIn}>
              <label className="admin-field" htmlFor="admin-token">
                <span>Staff API token</span>
                <input
                  id="admin-token"
                  className="admin-input"
                  type="password"
                  autoComplete="current-password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  required
                />
              </label>
              {error && (
                <p className="admin-form__error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="admin-btn admin-btn--primary admin-btn--block" disabled={signingIn}>
                {signingIn ? 'Checking…' : 'Sign in'}
              </button>
            </form>
            <a className="admin-back" href="/">
              ← Back to the storefront
            </a>
          </div>
        </section>
      </main>
    )
  }

  const current = SECTIONS.find((entry) => entry.id === section) ?? SECTIONS[0]
  const sectionData = data[section]
  const busy = loadingSection === section
  const threshold = data.overview?.stats.lowStockThreshold ?? data.inventory?.lowStockThreshold ?? 5

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <a className="admin-logo" href="/">
            BYOC
          </a>
          <span>Commerce</span>
        </div>

        <nav className="admin-nav" aria-label="Admin sections">
          {SECTIONS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-current={section === entry.id ? 'page' : undefined}
              onClick={() => navigate(entry.id)}
            >
              <Icon name={entry.icon} size={17} />
              <span>{entry.label}</span>
              {entry.id === 'orders' && data.overview?.stats.pendingOrders > 0 && (
                <span className="admin-nav__count">{data.overview.stats.pendingOrders}</span>
              )}
              {entry.id === 'messages' && data.overview?.stats.newContacts > 0 && (
                <span className="admin-nav__count">{data.overview.stats.newContacts}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <span className="admin-sync">
            {syncedAt ? `Synced ${syncedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Not synced yet'}
          </span>
          <a className="admin-sidebar__link" href="/">
            <Icon name="external" size={14} />
            View storefront
          </a>
          <button type="button" className="admin-sidebar__link" onClick={signOut}>
            <Icon name="logout" size={14} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__title">
            <h1>{current.label}</h1>
            <p>{current.subtitle}</p>
          </div>
          <div className="admin-topbar__actions">
            <a className="admin-btn admin-btn--ghost admin-btn--sm admin-topbar__store" href="/">
              <Icon name="external" size={14} />
              Storefront
            </a>
            <button type="button" className="admin-btn admin-btn--sm" onClick={refresh} disabled={busy}>
              <Icon name="refresh" size={14} />
              {busy ? 'Refreshing…' : 'Refresh'}
            </button>
            <button type="button" className="admin-btn admin-btn--sm admin-btn--danger" onClick={signOut}>
              <Icon name="logout" size={14} />
              Sign out
            </button>
          </div>
        </header>

        <main className="admin-content">
          {loadError && (
            <div className="admin-alert" role="alert">
              <Icon name="alert" size={16} />
              <p>{loadError}</p>
              <button type="button" className="admin-btn admin-btn--sm" onClick={refresh}>
                Retry
              </button>
            </div>
          )}

          {busy && !sectionData ? <LoadingState label={`Loading ${current.label.toLowerCase()}`} /> : null}

          {section === 'overview' && (
            <OverviewSection data={sectionData} onNavigate={navigate} />
          )}

          {section === 'orders' && (
            <OrdersSection
              data={sectionData}
              onStatusChange={changeOrderStatus}
              onExport={(status) =>
                exportCsv(`/orders/export${status ? `?status=${status}` : ''}`, 'orders.csv')
              }
              busyId={busyId}
            />
          )}

          {section === 'products' && (
            <ProductsSection
              data={sectionData}
              onCreate={createProduct}
              onUpdate={updateProduct}
              onDeactivate={deactivateProduct}
            />
          )}

          {section === 'inventory' && (
            <InventorySection data={sectionData} threshold={threshold} onSaveStock={saveStock} />
          )}

          {section === 'collections' && (
            <CollectionsSection
              data={sectionData}
              onCreate={createCollection}
              onToggle={toggleCollection}
              onDelete={deleteCollection}
              busy={collectionBusy}
            />
          )}

          {section === 'media' && (
            <MediaSection
              data={sectionData}
              onSave={saveMedia}
              onReset={resetMedia}
              busySlot={mediaBusySlot}
            />
          )}

          {section === 'reviews' && (
            <ReviewsSection
              data={sectionData}
              onModerate={moderateReview}
              onDelete={deleteReview}
              busyId={busyId}
            />
          )}

          {section === 'messages' && (
            <MessagesSection
              data={sectionData}
              onStatus={setContactStatus}
              onDelete={deleteContact}
              busyId={busyId}
            />
          )}

          {section === 'subscribers' && (
            <SubscribersSection
              data={sectionData}
              onExport={() => exportCsv('/subscribers/export', 'newsletter-subscribers.csv')}
            />
          )}

          {section === 'settings' && (
            <SettingsSection data={sectionData} onSave={saveShipping} saving={shippingSaving} />
          )}

          {section === 'audit' && <AuditSection data={sectionData} />}
        </main>
      </div>

      {(error || notice) && (
        <div className={`admin-toast${error ? ' admin-toast--error' : ''}`} role="status" aria-live="polite">
          <Icon name={error ? 'alert' : 'check'} size={16} />
          <p>{error || notice}</p>
          <button
            type="button"
            className="admin-icon-btn"
            aria-label="Dismiss notification"
            onClick={() => {
              setError('')
              setNotice('')
            }}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
