import mongoose from 'mongoose'

const mediaAssetSchema = new mongoose.Schema(
  {
    slot: { type: String, required: true, unique: true, index: true, trim: true, maxlength: 120 },
    alt: { type: String, trim: true, maxlength: 200, default: '' },
    mimeType: { type: String, trim: true },
    size: { type: Number, min: 0 },
    data: { type: Buffer },
    externalUrl: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
)

export default mongoose.model('MediaAsset', mediaAssetSchema)
