/* ==========================================================================
   BYOC — store catalogue data
   12 core designs, each released in four colourways → 48 products.
   ========================================================================== */

export const categories = [
  { id: 'all', label: 'All Products' },
  { id: 'tshirts', label: 'T-Shirts' },
  { id: 'hoodies', label: 'Hoodies' },
  { id: 'pants', label: 'Pants' },
  { id: 'jackets', label: 'Jackets' },
  { id: 'accessories', label: 'Accessories' },
]

export const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const palette = [
  { id: 'white', label: 'White', hex: '#f2f2f2', body: '#e9e4d9', trim: '#f8f4ea', light: true },
  { id: 'black', label: 'Black', hex: '#1c1c1c', body: '#151515', trim: '#3f3f3f' },
  { id: 'lime', label: 'Lime', hex: '#ccff00', body: '#b9e600', trim: '#d9ff4d' },
  { id: 'red', label: 'Red', hex: '#c81f1f', body: '#8f1a1a', trim: '#c33b3b' },
  { id: 'sand', label: 'Sand', hex: '#d9cbb4', body: '#d9cbb4', trim: '#efe6d4', light: true },
  { id: 'tan', label: 'Tan', hex: '#d7b98f', body: '#d7b98f', trim: '#e7d1b0', light: true },
  { id: 'slate', label: 'Slate', hex: '#5b6a7a', body: '#4c5a68', trim: '#6d7d8d' },
]

export const colorOptions = palette.map(({ id, label, hex }) => ({ id, label, hex }))

export const priceBounds = { min: 0, max: 300 }

const baseProducts = [
  {
    slug: 'void-graphic-tee',
    name: 'Void Graphic Tee',
    price: 79,
    category: 'tshirts',
    badge: 'New',
    primary: 'black',
    garment: { type: 'tee', body: '#131313', trim: '#3a3a3a', print: 'logo' },
    colors: ['#d8d8d8', '#6d6d6d', '#2a2a2a'],
    activeColor: 0,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    slug: 'essence-hoodie',
    name: 'Essence Hoodie',
    price: 129,
    category: 'hoodies',
    primary: 'white',
    garment: { type: 'hoodie', body: '#d8d3c6', trim: '#efeadd', print: 'word' },
    colors: ['#e6e1d4', '#8d8d8d', '#2a2a2a'],
    activeColor: 0,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  },
  {
    slug: 'urban-cargo-pants',
    name: 'Urban Cargo Pants',
    price: 149,
    category: 'pants',
    primary: 'black',
    garment: { type: 'pants', body: '#171717', trim: '#4a4a4a' },
    colors: ['#d8d8d8', '#6d6d6d', '#2a2a2a'],
    activeColor: 0,
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    slug: 'rebel-tee',
    name: 'Rebel Tee',
    price: 79,
    category: 'tshirts',
    primary: 'black',
    garment: { type: 'tee', body: '#1c1c1c', trim: '#464646', print: 'star' },
    colors: ['#d8d8d8', '#6d6d6d', '#d02020'],
    activeColor: 2,
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    slug: 'core-puffer-jacket',
    name: 'Core Puffer Jacket',
    price: 249,
    category: 'jackets',
    primary: 'black',
    garment: { type: 'puffer', body: '#121212', trim: '#3d3d3d' },
    colors: ['#d8d8d8', '#2a2a2a'],
    activeColor: 0,
    sizes: ['M', 'L', 'XL'],
  },
  {
    slug: 'signal-hoodie',
    name: 'Signal Hoodie',
    price: 129,
    category: 'hoodies',
    primary: 'black',
    garment: { type: 'hoodie', body: '#101010', trim: '#3a3a3a', print: 'logo', back: true },
    colors: ['#d8d8d8', '#6d6d6d', '#2a2a2a'],
    activeColor: 0,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  },
  {
    slug: 'shadow-cargo-pants',
    name: 'Shadow Cargo Pants',
    price: 149,
    category: 'pants',
    primary: 'black',
    garment: { type: 'pants', body: '#2b2b2b', trim: '#5c5c5c' },
    colors: ['#d8d8d8', '#6d6d6d'],
    activeColor: 0,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    slug: 'minimal-tee',
    name: 'Minimal Tee',
    price: 69,
    category: 'tshirts',
    primary: 'black',
    garment: { type: 'tee', body: '#171717', trim: '#404040', print: 'brand' },
    colors: ['#d8d8d8', '#6d6d6d'],
    activeColor: 0,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  },
  {
    slug: 'rogue-jacket',
    name: 'Rogue Jacket',
    price: 199,
    category: 'jackets',
    primary: 'black',
    garment: { type: 'jacket', body: '#111111', trim: '#d8d8d8' },
    colors: ['#d8d8d8', '#6d6d6d', '#2a2a2a'],
    activeColor: 0,
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    slug: 'orbit-tee',
    name: 'Orbit Tee',
    price: 69,
    category: 'tshirts',
    primary: 'white',
    garment: { type: 'tee', body: '#e8e4dc', trim: '#fbfaf6', print: 'star' },
    colors: ['#d8d8d8', '#6d6d6d'],
    activeColor: 0,
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    slug: 'motion-pants',
    name: 'Motion Pants',
    price: 119,
    category: 'pants',
    primary: 'black',
    garment: { type: 'pants', body: '#1a1a1a', trim: '#4f4f4f', print: 'logo' },
    colors: ['#d8d8d8', '#6d6d6d', '#2a2a2a'],
    activeColor: 0,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  },
  {
    slug: 'phantom-hoodie',
    name: 'Phantom Hoodie',
    price: 129,
    category: 'hoodies',
    primary: 'black',
    garment: { type: 'hoodie', body: '#141414', trim: '#414141', print: 'logo', back: true },
    colors: ['#d8d8d8', '#6d6d6d', '#2a2a2a'],
    activeColor: 0,
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    slug: 'signal-cap',
    name: 'Signal Logo Cap',
    price: 59,
    category: 'accessories',
    primary: 'black',
    garment: { type: 'cap', body: '#151515', trim: '#4a4a4a', print: 'logo' },
    colors: ['#d8d8d8', '#6d6d6d', '#2a2a2a'],
    activeColor: 0,
    sizes: ['ONE SIZE'],
  },
  {
    slug: 'utility-crossbody',
    name: 'Utility Crossbody Bag',
    price: 89,
    category: 'accessories',
    primary: 'black',
    garment: { type: 'bag', body: '#171717', trim: '#555555', print: 'brand' },
    colors: ['#d8d8d8', '#6d6d6d', '#2a2a2a'],
    activeColor: 0,
    sizes: ['ONE SIZE'],
  },
]

const paletteIndex = new Map(palette.map((entry, index) => [entry.id, index]))

const lightPrint = (garment) => {
  if (!garment.print) return garment
  const print = garment.print === 'star' ? 'star' : 'word'
  return { ...garment, print }
}

const makeItem = (base, baseIndex, way) => {
  const primaryIndex = paletteIndex.get(base.primary)
  const color = palette[(primaryIndex + [0, 1, 3, 5][way]) % palette.length]

  const garment = way === 0
    ? base.garment
    : {
        ...(color.light ? lightPrint(base.garment) : base.garment),
        body: color.body,
        trim: color.trim,
      }

  return {
    id: `${base.slug}-${color.id}`,
    name: base.name,
    price: base.price,
    category: base.category,
    badge: way === 0 ? base.badge ?? null : null,
    garment,
    colors: base.colors,
    activeColor: base.activeColor,
    sizes: base.sizes,
    color: color.hex,
    colorway: color.label,
    added: baseIndex * 4 + way,
  }
}

export const storeCatalogue = [0, 1, 2, 3].flatMap((way) =>
  baseProducts.map((base, baseIndex) => makeItem(base, baseIndex, way)),
)

export const totalCatalogueCount = storeCatalogue.length
export const pageSize = 12

export const sortOptions = [
  { id: 'best', label: 'Best Selling' },
  { id: 'new', label: 'Newest' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
]
