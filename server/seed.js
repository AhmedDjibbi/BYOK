import 'dotenv/config'
import mongoose from 'mongoose'
import { storeCatalogue } from '../src/data/store.js'
import Inventory from './models/Inventory.js'
import Product from './models/Product.js'

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required. Copy .env.example to .env and configure it.')
  process.exit(1)
}

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  const operations = storeCatalogue.map((product) => ({
    updateOne: {
      filter: { productId: product.id },
      update: {
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
        },
      },
      upsert: true,
    },
  }))

  await Product.bulkWrite(operations)
  await Product.deleteMany({
    productId: { $nin: storeCatalogue.map((product) => product.id) },
  })
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
  await Inventory.deleteMany({
    productId: { $nin: storeCatalogue.map((product) => product.id) },
  })
  console.log(`Seeded ${storeCatalogue.length} products.`)
} catch (error) {
  console.error(`Could not seed MongoDB products: ${error.message}`)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
