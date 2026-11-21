import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { AccountStatus, Role } from '../../common/enums'
import { AppException } from '../../common/errors'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto'
import { Address, User, UserDocument } from './schemas/user.schema'

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  toAuthUser(user: UserDocument): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      ...(user.phone ? { phone: user.phone } : {}),
      role: user.role,
      // TODO(restaurant-on-register): populate restaurantId once the
      // Restaurant schema/module exists (contract 3.1, role restaurant only).
    }
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null
    return this.userModel.findById(id)
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() })
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+passwordHash')
  }

  async create(data: {
    name: string
    email: string
    passwordHash: string
    phone?: string
    role: Role
  }): Promise<UserDocument> {
    const user = new this.userModel({
      name: data.name.trim(),
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      ...(data.phone ? { phone: data.phone } : {}),
      role: data.role,
      status: AccountStatus.Active,
    })
    return user.save()
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<AuthUser> {
    const user = await this.requireUser(userId)
    if (dto.name !== undefined) user.name = dto.name.trim()
    if (dto.phone !== undefined) {
      const phone = dto.phone.trim()
      if (phone) user.phone = phone
      else delete user.phone
    }
    await user.save()
    return this.toAuthUser(user)
  }

  async listAddresses(userId: string) {
    const user = await this.requireUser(userId)
    return { data: user.addresses }
  }

  async addAddress(userId: string, dto: CreateAddressDto) {
    const user = await this.requireUser(userId)
    user.addresses.push({
      label: dto.label.trim(),
      address: dto.address.trim(),
      phone: dto.phone.trim(),
    })
    await user.save()
    return user.addresses[user.addresses.length - 1]
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const user = await this.requireUser(userId)
    const address = this.addressById(user, addressId)
    if (!address) throw new NotFoundException('Address not found')
    if (dto.label !== undefined) address.label = dto.label.trim()
    if (dto.address !== undefined) address.address = dto.address.trim()
    if (dto.phone !== undefined) address.phone = dto.phone.trim()
    await user.save()
    return address
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const user = await this.requireUser(userId)
    const address = this.addressById(user, addressId)
    if (!address) throw new NotFoundException('Address not found')
    user.addresses.pull(address)
    await user.save()
  }

  private addressById(user: UserDocument, addressId: string): Address | null {
    if (!Types.ObjectId.isValid(addressId)) return null
    return user.addresses.id(addressId) ?? null
  }

  private async requireUser(userId: string): Promise<UserDocument> {
    const user = await this.findById(userId)
    if (!user) throw new AppException(404, ErrorCode.NotFound, 'User not found')
    return user
  }
}
