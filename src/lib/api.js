const API_BASE = '/api'

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

/**
 * Single entry point for every browser -> API request.
 * Keeps JSON parsing, error messages, and auth headers consistent.
 */
export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers, token, signal, ...rest } = options
  const requestHeaders = { Accept: 'application/json', ...headers }
  let payload

  if (body !== undefined && body !== null) {
    if (typeof body === 'string' || body instanceof FormData) {
      payload = body
    } else {
      requestHeaders['Content-Type'] = requestHeaders['Content-Type'] ?? 'application/json'
      payload = JSON.stringify(body)
    }
  }

  if (token) requestHeaders.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
      method,
      headers: requestHeaders,
      body: payload,
      signal,
      ...rest,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('We could not reach the store. Check your connection and try again.')
  }

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    throw new ApiError(
      data?.error || `The store could not complete this request (${response.status}).`,
      response.status,
      data,
    )
  }

  return data
}

export async function fetchProducts({ signal } = {}) {
  const data = await apiRequest('/products', { signal })
  if (!Array.isArray(data?.products)) {
    throw new ApiError('The product catalogue is unavailable.', 502, data)
  }
  return data.products
}

export async function fetchCollections({ signal } = {}) {
  const data = await apiRequest('/collections', { signal })
  if (!Array.isArray(data?.collections)) {
    throw new ApiError('The collection list is unavailable.', 502, data)
  }
  return data.collections
}

