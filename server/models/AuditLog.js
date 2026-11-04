import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    actor: { type: String, trim: true },
  },
  { timestamps: true },
)

auditLogSchema.index({ createdAt: -1 })

export default mongoose.model('AuditLog', auditLogSchema)
