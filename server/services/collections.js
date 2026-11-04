import Collection from '../models/Collection.js'
import Product from '../models/Product.js'

const collectionDefinitions = [
  { name: 'T-Shirts', slug: 'tshirts', category: 'tshirts' },
  { name: 'Hoodies', slug: 'hoodies', category: 'hoodies' },
  { name: 'Pants', slug: 'pants', category: 'pants' },
  { name: 'Jackets', slug: 'jackets', category: 'jackets' },
  { name: 'Accessories', slug: 'accessories', category: 'accessories' },
]

export async function ensureCollections() {
  const byCategory = new Map()

  for (const definition of collectionDefinitions) {
    let collection = await Collection.findOne({ slug: definition.slug })
    if (!collection) {
      collection = await Collection.create({
        name: definition.name,
        slug: definition.slug,
        description: `${definition.name} from the BYOC catalogue.`,
        active: true,
        sortOrder: collectionDefinitions.indexOf(definition),
      })
    }
    byCategory.set(definition.category, collection._id)
  }

  for (const definition of collectionDefinitions) {
    await Product.updateMany(
      { category: definition.category, collectionId: null },
      { $set: { collectionId: byCategory.get(definition.category) } },
    )
  }

  await Product.updateMany(
    { active: { $exists: false } },
    { $set: { active: true } },
  )

  return byCategory
}
