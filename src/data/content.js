const unsplash = (id, width) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`

export const heroSlides = [
  {
    image: unsplash('photo-1523398002811-999ca8dec234', 2000),
    alt: 'Two models wearing BYOK black outerwear against a concrete wall',
  },
  {
    image: unsplash('photo-1529139574466-a303027c1d8b', 2000),
    alt: 'Model in a black hoodie shot on an urban street',
  },
  {
    image: unsplash('photo-1490481651871-ab68de25d43d', 2000),
    alt: 'Streetwear look shot in the city',
  },
  {
    image: unsplash('photo-1539109136881-3be0616acf4b', 2000),
    alt: 'Portrait of a model in dark layered clothing',
  },
]

export const products = [
  {
    id: 'void-graphic-tee',
    name: 'Void Graphic Tee',
    price: '79 TND',
    image: unsplash('photo-1521572163474-6864f9cf17ab', 900),
    alt: 'Black graphic t-shirt',
    badge: 'New',
    colors: ['#d8d8d8', '#6d6d6d', '#2a2a2a'],
    activeColor: 0,
  },
  {
    id: 'essence-hoodie',
    name: 'Essence Hoodie',
    price: '129 TND',
    image: unsplash('photo-1556821840-3a63f95609a7', 900),
    alt: 'Off-white heavyweight hoodie',
    colors: ['#d8d8d8', '#8d8d8d', '#2a2a2a'],
    activeColor: 0,
  },
  {
    id: 'urban-cargo-pants',
    name: 'Urban Cargo Pants',
    price: '149 TND',
    image: unsplash('photo-1594633312681-425c7b97ccd1', 900),
    alt: 'Black cargo pants',
    colors: ['#d8d8d8', '#6d6d6d', '#2a2a2a'],
    activeColor: 0,
  },
  {
    id: 'rebel-tee',
    name: 'Rebel Tee',
    price: '79 TND',
    image: unsplash('photo-1576566588028-4147f3842f27', 900),
    alt: 'Washed black graphic tee',
    colors: ['#d8d8d8', '#6d6d6d', '#2a2a2a'],
    activeColor: 2,
  },
  {
    id: 'core-puffer-jacket',
    name: 'Core Puffer Jacket',
    price: '249 TND',
    image: unsplash('photo-1544923246-77307dd654cb', 900),
    alt: 'Black puffer jacket',
    colors: ['#d8d8d8', '#2a2a2a'],
    activeColor: 0,
  },
]

export const collections = [
  {
    id: 'graphic-tees',
    title: 'Graphic Tees',
    image: unsplash('photo-1523381294911-8d3cead13475', 1200),
    alt: 'Model wearing a graphic tee',
  },
  {
    id: 'hoodies',
    title: 'Hoodies',
    image: unsplash('photo-1620799140408-edc6dcb6d633', 1200),
    alt: 'Model wearing a hoodie',
  },
  {
    id: 'cargo-pants',
    title: 'Cargo Pants',
    image: unsplash('photo-1552902865-b72c031ac5ea', 1200),
    alt: 'Model wearing cargo pants',
  },
  {
    id: 'accessories',
    title: 'Accessories',
    image: unsplash('photo-1509942774463-acf339cf87d5', 1200),
    alt: 'Streetwear accessories',
  },
]

export const collectionsHero = {
  image: unsplash('photo-1529139574466-a303027c1d8b', 2000),
  alt: 'Model in a black BYOK hoodie and sunglasses against a concrete wall',
}

export const collectionTiles = [
  {
    id: 'hoodies',
    title: 'Hoodies',
    count: 12,
    image: unsplash('photo-1620799140408-edc6dcb6d633', 1400),
    alt: 'Black hoodie with a print worn from the back',
  },
  {
    id: 'tshirts',
    title: 'T-Shirts',
    count: 18,
    image: unsplash('photo-1521572163474-6864f9cf17ab', 1400),
    alt: 'Black t-shirts on a clothing rail',
  },
  {
    id: 'jackets',
    title: 'Jackets',
    count: 10,
    image: unsplash('photo-1551028719-00167b16eac5', 1400),
    alt: 'Black jacket with contrast piping',
  },
  {
    id: 'cargo-pants',
    title: 'Cargo Pants',
    count: 8,
    image: unsplash('photo-1594633312681-425c7b97ccd1', 1400),
    alt: 'Black cargo pants',
  },
  {
    id: 'puffer-jackets',
    title: 'Puffer Jackets',
    count: 6,
    image: unsplash('photo-1544923246-77307dd654cb', 1400),
    alt: 'Black puffer jacket',
  },
  {
    id: 'accessories',
    title: 'Accessories',
    count: 7,
    image: unsplash('photo-1588850561407-ed78c282e89b', 1400),
    alt: 'Black cap and bag',
  },
]

export const movementBanner = {
  image: unsplash('photo-1503342217505-b0a15ec3261c', 1200),
  alt: 'Model sitting on concrete steps in black streetwear',
}

export const aboutHero = {
  image: unsplash('photo-1620799140408-edc6dcb6d633', 2000),
  alt: 'Model seen from behind in a black hoodie with a large BYOK print',
}

export const aboutStory = {
  image: unsplash('photo-1487958449943-2429e8be8625', 1400),
  alt: 'Concrete building with BYOK lettering on the facade',
}

export const aboutValues = [
  {
    id: 'premium-quality',
    icon: 'diamond',
    title: 'Premium Quality',
    text: 'Crafted with the best materials for lasting wear.',
  },
  {
    id: 'bold-designs',
    icon: 'bolt',
    title: 'Bold Designs',
    text: 'Stand out with unique and modern styles.',
  },
  {
    id: 'community',
    icon: 'community',
    title: 'A Growing Community',
    text: 'Be part of a movement.',
  },
  {
    id: 'worldwide-vision',
    icon: 'globe',
    title: 'Worldwide Vision',
    text: 'From Tunisia to the world.',
  },
]

export const aboutStats = [
  { id: 'customers', value: '10K+', label: 'Happy Customers' },
  { id: 'products', value: '50+', label: 'Products' },
  { id: 'years', value: '3+', label: 'Years of Experience' },
]

export const aboutJoin = {
  image: unsplash('photo-1552374196-c4e7ffc6e126', 2000),
  alt: 'Model in a black BYOK hoodie and sunglasses standing against concrete',
}

export const storyImage = {
  image: unsplash('photo-1503342217505-b0a15ec3261c', 1200),
  alt: 'BYOK model sitting on concrete stairs',
}

export const mainNav = [
  { label: 'Home', href: '#/' },
  {
    label: 'Shop',
    href: '#/store',
    menu: ['New Arrivals', 'T-Shirts', 'Hoodies', 'Bottoms', 'Outerwear', 'Accessories'],
  },
  {
    label: 'Collections',
    href: '#/collections',
    menu: ['The New Drop', 'Streetwear Essentials', 'Archive', 'Accessories'],
  },
  { label: 'About', href: '#/about' },
  { label: 'Journal', href: '#journal' },
  { label: 'Contact', href: '#footer' },
]

export const footerNav = [
  'Shop',
  'About',
  'Returns & Exchanges',
  'Shipping',
  'FAQ',
  'Contact',
]
