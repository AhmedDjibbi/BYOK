import {
  aboutHero,
  aboutJoin,
  aboutStory,
  collectionTiles,
  collectionsHero,
  heroSlides,
  journalEntries,
  movementBanner,
  storyImage,
} from './content'

export const STORE_BANNER = '/images/store-hero.jpg'

export const bannerFallback = {
  image: STORE_BANNER,
  alt: 'BYOC storefront photographed in black and white',
}

const slotEntry = (slot, label, fallback, hint) => ({ slot, label, fallback, hint })

/**
 * Every editable image on the storefront that does not depend on the catalogue.
 * Dynamic slots (collection cards, product photos) are appended by
 * `buildMediaGroups` once the admin has loaded collections and products.
 */
export const staticMediaGroups = [
  {
    id: 'home',
    label: 'Home page',
    description: 'Hero slideshow and the story section photo.',
    slots: [
      ...heroSlides.map((slide, index) =>
        slotEntry(
          `home.hero.${index + 1}`,
          `Hero slide ${index + 1}`,
          slide,
          'Landscape, 2000×1250 or wider. Dark, high-contrast photos work best.',
        ),
      ),
      slotEntry('home.story', 'Story section photo', storyImage, 'Portrait or square, 1200 px wide.'),
    ],
  },
  {
    id: 'shop',
    label: 'Store & collections',
    description: 'Banners for the shop, the collections index, and the movement band.',
    slots: [
      slotEntry('store.hero', 'Store banner', bannerFallback, 'Landscape, 1920×900 or wider.'),
      slotEntry('collections.hero', 'Collections banner', collectionsHero, 'Landscape, 1920×900 or wider.'),
      slotEntry('collections.movement', 'Wear the movement photo', movementBanner, 'Portrait, 1200×1500.'),
    ],
  },
  {
    id: 'about',
    label: 'About page',
    description: 'About banner, brand story image, and the closing join banner.',
    slots: [
      slotEntry('about.hero', 'About banner', aboutHero, 'Landscape, 1920×900 or wider.'),
      slotEntry('about.story', 'Brand story photo', aboutStory, 'Landscape or square, 1400 px wide.'),
      slotEntry('about.join', 'Join the movement banner', aboutJoin, 'Landscape, 1920×900 or wider.'),
    ],
  },
  {
    id: 'journal',
    label: 'Journal',
    description: 'Article cover photos used on the journal index and article pages.',
    slots: journalEntries.map((entry) =>
      slotEntry(`journal.${entry.id}`, entry.title, entry, 'Landscape, 1600×900.'),
    ),
  },
  {
    id: 'pages',
    label: 'Page banners',
    description: 'Shared banner used by product, search, info, and order pages.',
    slots: [
      slotEntry('page.hero', 'Default page banner', bannerFallback, 'Landscape, 1920×900 or wider.'),
      slotEntry('page.account', 'Account banner', bannerFallback, 'Landscape, 1920×900 or wider.'),
    ],
  },
]

const tileById = new Map(collectionTiles.map((tile) => [tile.id, tile]))

export function collectionMediaSlot(collection) {
  const fallback = tileById.get(collection.slug) ?? movementBanner
  return slotEntry(
    `collection.${collection.slug}`,
    collection.name,
    fallback,
    'Landscape, 1400×700. Shown on the collections grid.',
  )
}

export function productMediaSlot(product) {
  const name = product.colorway ? `${product.name} — ${product.colorway}` : product.name
  return slotEntry(
    `product.${product.productId}`,
    name,
    { image: null, alt: `${name} product photo` },
    'Square, 1200×1200. Replaces the vector garment mockup when set.',
  )
}

export function journalMediaSlot(entry) {
  return slotEntry(`journal.${entry.id}`, entry.title, entry, 'Landscape, 1600×900.')
}

/**
 * Admin-facing slot registry. Dynamic groups only appear once their source
 * data is available, so the console never offers a slot that has no home.
 */
export function buildMediaGroups({ collections = [], products = [] } = {}) {
  const groups = [...staticMediaGroups]
  if (collections.length) {
    groups.splice(3, 0, {
      id: 'collection-cards',
      label: 'Collection cards',
      description: 'One photo per collection, used on the collections grid.',
      slots: collections.map(collectionMediaSlot),
    })
  }
  if (products.length) {
    groups.push({
      id: 'products',
      label: 'Product photos',
      description: 'Optional photos that replace the vector garment illustrations.',
      slots: products.map(productMediaSlot),
    })
  }
  return groups
}

export const mediaSlotCount = staticMediaGroups.reduce((total, group) => total + group.slots.length, 0)
