import mongoose from 'mongoose'

// Global Mongoose plugin applied to every schema:
// - exposes `id` (string) in JSON instead of `_id`, hides `__v`
// - enables timestamps (createdAt/updatedAt) by default
// - keeps `id` virtual so populated/lean paths stay consistent
const toJsonOptions = {
  virtuals: true,
  transform: (_doc: unknown, ret: Record<string, unknown>) => {
    const rawId = ret._id
    if (rawId !== undefined && rawId !== null) {
      ret.id = typeof rawId === 'object' && 'toString' in rawId ? String(rawId) : rawId
    }
    delete ret._id
    delete ret.__v
    return ret
  },
}

export function applyGlobalSchemaDefaults(schema: mongoose.Schema): void {
  if (schema.get('timestamps') === undefined) {
    schema.set('timestamps', true)
  }
  schema.set('toJSON', toJsonOptions)
  schema.set('toObject', toJsonOptions)
}

// Register once at module load so all schemas created afterwards inherit it.
mongoose.plugin(applyGlobalSchemaDefaults)
