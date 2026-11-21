import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
import { AccountStatus, Role } from '../../../common/enums'

export type UserDocument = HydratedDocument<User>

@Schema({ _id: true })
export class Address {
  // Mongoose adds _id automatically; declared here for typing only.
  _id?: Types.ObjectId

  @Prop({ required: true })
  label: string

  @Prop({ required: true })
  address: string

  @Prop({ required: true })
  phone: string
}

export const AddressSchema = SchemaFactory.createForClass(Address)

@Schema()
export class User {
  @Prop({ required: true })
  name: string

  @Prop({ required: true, unique: true, lowercase: true })
  email: string

  // select:false keeps it out of every query unless explicitly requested.
  @Prop({ required: true, select: false })
  passwordHash: string

  @Prop()
  phone?: string

  @Prop({ required: true, enum: Role })
  role: Role

  @Prop({ enum: AccountStatus, default: AccountStatus.Active })
  status: AccountStatus

  @Prop({ type: [AddressSchema], default: [] })
  addresses: Types.DocumentArray<Address>

  // Timestamps (createdAt/updatedAt) and the id-instead-of-_id transform
  // come from the global Mongoose plugin in src/database/mongoose.plugin.ts.
}

export const UserSchema = SchemaFactory.createForClass(User)
