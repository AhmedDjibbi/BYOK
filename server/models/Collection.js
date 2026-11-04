import mongoose from 'mongoose'

const collectionSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    image: { type: String, trim: true, default: null },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
)

collectionSchema.pre('validate', function applySlug() {
  if (!this.slug && this.name) {
    this.slug = Collection.slugify(this.name)
  } else if (this.slug) {
    this.slug = Collection.slugify(String(this.slug))
  }
})

const Collection = mongoose.model('Collection', collectionSchema)

Collection.slugify = function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default Collection
