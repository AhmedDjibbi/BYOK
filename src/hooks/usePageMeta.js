import { useEffect } from 'react'

const upsertMeta = (attribute, key, content) => {
  if (content == null) return
  let selector = `meta[${attribute}="${key}"]`
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

export function usePageMeta({ title, description, canonical, image } = {}) {
  useEffect(() => {
    if (title) document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title ? title : undefined)
    upsertMeta('property', 'og:description', description)
    if (image) upsertMeta('property', 'og:image', image)
    if (canonical) {
      let link = document.head.querySelector('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', 'canonical')
        document.head.appendChild(link)
      }
      link.setAttribute('href', canonical)
    }
  }, [title, description, canonical, image])
}
