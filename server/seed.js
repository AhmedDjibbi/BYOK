import mongoose from 'mongoose'
import { storeCatalogue } from '../src/data/store.js'
import Collection from './models/Collection.js'
import Inventory from './models/Inventory.js'
import Product from './models/Product.js'
import { config } from './config.js'

if (!config.mongoUri) {
  console.error('MONGODB_URI is required. Copy .env.example to .env and configure it.')
  process.exit(1)
}

const seedReset = process.env.SEED_RESET === '1'

try {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 })

  const collectionDefinitions = [
    { name: 'T-Shirts', slug: 'tshirts', category: 'tshirts' },
    { name: 'Hoodies', slug: 'hoodies', category: 'hoodies' },
    { name: 'Pants', slug: 'pants', category: 'pants' },
    { name: 'Jackets', slug: 'jackets', category: 'jackets' },
    { name: 'Accessories', slug: 'accessories', category: 'accessories' },
  ]
  const collectionsByCategory = new Map()
  for (const [index, definition] of collectionDefinitions.entries()) {
    const collection = await Collection.findOneAndUpdate(
      { slug: definition.slug },
      {
        $setOnInsert: {
          name: definition.name,
          slug: definition.slug,
          description: `${definition.name} from the BYOC catalogue.`,
          active: true,
          sortOrder: index,
        },
      },
      { upsert: true, new: true },
    )
    collectionsByCategory.set(definition.category, collection._id)
  }

  const operations = storeCatalogue.map((product) => ({
    updateOne: {
      filter: { productId: product.id },
      update: seedReset
        ? {
            $set: {
              productId: product.id,
              name: product.name,
              price: product.price,
              category: product.category,
              badge: product.badge,
              garment: product.garment,
              colors: product.colors,
              activeColor: product.activeColor,
              sizes: product.sizes,
              color: product.color,
              colorway: product.colorway,
              added: product.added,
              collectionId: collectionsByCategory.get(product.category),
            },
          }
        : {
            $setOnInsert: {
              productId: product.id,
              name: product.name,
              price: product.price,
              category: product.category,
              badge: product.badge,
              garment: product.garment,
              colors: product.colors,
              activeColor: product.activeColor,
              sizes: product.sizes,
              color: product.color,
              colorway: product.colorway,
              added: product.added,
              collectionId: collectionsByCategory.get(product.category),
            },
          },
      upsert: true,
    },
  }))

  await Product.bulkWrite(operations)
  if (seedReset) {
    await Product.deleteMany({
      productId: { $nin: storeCatalogue.map((product) => product.id) },
    })
  }

  const inventoryOperations = storeCatalogue.flatMap((product) =>
    product.sizes.map((size) => ({
      updateOne: {
        filter: { productId: product.id, size },
        update: { $setOnInsert: { productId: product.id, size, quantity: 0 } },
        upsert: true,
      },
    })),
  )
  await Inventory.bulkWrite(inventoryOperations)
  if (seedReset) {
    await Inventory.deleteMany({
      productId: { $nin: storeCatalogue.map((product) => product.id) },
    })
  }

  for (const [category, collectionId] of collectionsByCategory) {
    await Product.updateMany(
      { category },
      { $set: { collectionId } },
    )
  }

  const unassigned = await Product.countDocuments({ collectionId: null })
  if (unassigned > 0) {
    throw new Error(`${unassigned} products could not be assigned to a collection.`)
  }

  console.log(`Seeded ${storeCatalogue.length} products across ${collectionsByCategory.size} collections.`)
} catch (error) {
  console.error(`Could not seed MongoDB products: ${error.message}`)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
