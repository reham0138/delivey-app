import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose'
import { User } from '../../users/schemas/user.schema'

export type SessionDocument = HydratedDocument<Session>

@Schema()
export class Session {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true, index: true })
  userId: Types.ObjectId

  // All rotations of one login chain share a familyId, so a reused
  // (already-rotated) refresh token can nuke the whole chain.
  @Prop({ required: true, index: true })
  familyId: string

  // SHA-256 of the opaque refresh token; the raw token is never stored.
  @Prop({ required: true, unique: true })
  tokenHash: string

  @Prop({ required: true })
  expiresAt: Date

  @Prop()
  revokedAt?: Date

  // tokenHash of the session that replaced this one (rotation link).
  @Prop()
  replacedBy?: string

  @Prop()
  userAgent?: string
}

export const SessionSchema = SchemaFactory.createForClass(Session)
// TTL index: Mongo deletes documents once expiresAt passes.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
