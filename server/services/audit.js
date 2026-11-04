import AuditLog from '../models/AuditLog.js'

export function recordAudit(request, { action, targetType, targetId, metadata = {} }) {
  if (!action || !targetType) return Promise.resolve()
  const actor = request?.get?.('x-staff-name')?.trim() || 'staff'
  return AuditLog.create({
    action,
    targetType,
    targetId: targetId == null ? '' : String(targetId),
    metadata,
    actor,
  }).catch((error) => {
    console.error(`Audit log write failed: ${error.message}`)
  })
}
