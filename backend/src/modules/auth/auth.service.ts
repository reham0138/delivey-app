import { randomBytes, createHash, randomUUID } from 'crypto'
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import * as bcrypt from 'bcryptjs'
import { AccountStatus, Role } from '../../common/enums'
import { AppException } from '../../common/errors'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { UsersService } from '../users/users.service'
import { User, UserDocument } from '../users/schemas/user.schema'
import {
  Restaurant,
  RestaurantDocument,
} from '../restaurants/schemas/restaurant.schema'
import { Session, SessionDocument } from './schemas/session.schema'
import { LoginDto, LogoutDto, RefreshDto, RegisterDto } from './dto/auth.dto'

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: AuthUser
}

const BCRYPT_ROUNDS = 10

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>,
    @InjectModel(Restaurant.name)
    private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase()
    if (await this.usersService.findByEmail(email)) {
      throw new AppException(409, ErrorCode.EmailAlreadyExists, 'Email already registered')
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
    const user = await this.usersService.create({
      name: dto.name,
      email,
      passwordHash,
      phone: dto.phone,
      role: dto.role,
    })
    let restaurantId: string | undefined
    if (dto.role === Role.Restaurant) {
      try {
        restaurantId = await this.ensureOwnerRestaurant(user)
      } catch (error) {
        // Failed registration: no orphan account or session may remain.
        await this.cleanupFailedRegistration(user)
        throw error
      }
    }
    return this.issueAuthResponse(user, restaurantId)
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailWithPassword(dto.email)
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash))
    if (!ok) {
      throw new AppException(401, ErrorCode.InvalidCredentials, 'Invalid email or password')
    }
    this.assertActive(user)
    return this.issueAuthResponse(user)
  }

  async refresh(dto: RefreshDto): Promise<AuthResponse> {
    const tokenHash = this.hashToken(dto.refresh_token)
    const session = await this.sessionModel.findOne({ tokenHash })

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw new AppException(401, ErrorCode.InvalidRefreshToken, 'Invalid refresh token')
    }
    if (session.revokedAt) {
      // Reuse of a rotated/revoked token: burn the whole family.
      await this.revokeFamily(session.familyId)
      throw new AppException(401, ErrorCode.InvalidRefreshToken, 'Invalid refresh token')
    }

    const user = await this.usersService.findById(String(session.userId))
    if (!user) {
      throw new AppException(401, ErrorCode.InvalidRefreshToken, 'Invalid refresh token')
    }
    this.assertActive(user)

    // Atomic rotation: only the first concurrent caller wins the update.
    const newRefreshToken = this.newRefreshToken()
    const newHash = this.hashToken(newRefreshToken)
    const rotated = await this.sessionModel.findOneAndUpdate(
      { _id: session._id, revokedAt: null },
      { $set: { revokedAt: new Date(), replacedBy: newHash } },
    )
    if (!rotated) {
      await this.revokeFamily(session.familyId)
      throw new AppException(401, ErrorCode.InvalidRefreshToken, 'Invalid refresh token')
    }

    await this.sessionModel.create({
      userId: user._id,
      familyId: session.familyId,
      tokenHash: newHash,
      expiresAt: this.refreshExpiry(),
      userAgent: session.userAgent,
    })

    return {
      access_token: await this.signAccessToken(user),
      refresh_token: newRefreshToken,
      user: await this.withRestaurantId(this.usersService.toAuthUser(user)),
    }
  }

  // Contract 3.1: restaurant owners get restaurantId in auth responses when
  // their restaurant exists; everyone else never does. Read-only lookup —
  // nothing is created here (old owner accounts may have none).
  async withRestaurantId(authUser: AuthUser): Promise<AuthUser> {
    if (authUser.role !== Role.Restaurant) return authUser
    const restaurant = await this.restaurantModel
      .findOne({ ownerId: new Types.ObjectId(authUser.id) })
      .select('_id')
      .lean()
    if (!restaurant) return authUser
    return { ...authUser, restaurantId: String(restaurant._id) }
  }

  // Creates the owner's restaurant on registration (contract section 4):
  // isActive false, isOpen false, name = user name, empty profile fields.
  // Schema defaults fill the rest via Mongoose's setDefaultsOnInsert. The
  // upsert is idempotent through the unique ownerId index; a duplicate-key
  // race resolves to the already-created restaurant.
  private async ensureOwnerRestaurant(user: UserDocument): Promise<string> {
    const ownerId = user._id as Types.ObjectId
    try {
      const restaurant = await this.restaurantModel.findOneAndUpdate(
        { ownerId },
        {
          $setOnInsert: {
            ownerId,
            name: user.name,
            phone: user.phone ?? '',
          },
        },
        { upsert: true, new: true },
      )
      return String(restaurant!._id)
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const existing = await this.restaurantModel
          .findOne({ ownerId })
          .select('_id')
          .lean()
        if (existing) return String(existing._id)
      }
      throw error
    }
  }

  private async cleanupFailedRegistration(user: UserDocument): Promise<void> {
    try {
      await this.sessionModel.deleteMany({ userId: user._id })
      await this.userModel.deleteOne({ _id: user._id })
    } catch {
      // Cleanup is best-effort; the original registration error is rethrown.
    }
  }

  // Always succeeds (204) per contract, even for unknown tokens.
  async logout(dto: LogoutDto): Promise<void> {
    await this.sessionModel.updateOne(
      { tokenHash: this.hashToken(dto.refresh_token), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    )
  }

  async logoutAll(userId: string): Promise<void> {
    await this.revokeAllSessions(userId)
  }

  // Called by the admin module when it suspends a user.
  async revokeAllSessions(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) return
    await this.sessionModel.updateMany(
      { userId: new Types.ObjectId(userId), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    )
  }

  private assertActive(user: UserDocument): void {
    if (user.status === AccountStatus.Suspended) {
      throw new AppException(403, ErrorCode.AccountSuspended, 'Account is suspended')
    }
  }

  private async issueAuthResponse(
    user: UserDocument,
    restaurantId?: string,
  ): Promise<AuthResponse> {
    const refreshToken = this.newRefreshToken()
    const familyId = randomUUID()
    await this.sessionModel.create({
      userId: user._id,
      familyId,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: this.refreshExpiry(),
    })
    const authUser = this.usersService.toAuthUser(user)
    const enriched = restaurantId
      ? { ...authUser, restaurantId }
      : await this.withRestaurantId(authUser)
    return {
      access_token: await this.signAccessToken(user),
      refresh_token: refreshToken,
      user: enriched,
    }
  }

  private signAccessToken(user: UserDocument): Promise<string> {
    return this.jwtService.signAsync({ sub: String(user._id), role: user.role })
  }

  private newRefreshToken(): string {
    return randomBytes(48).toString('hex')
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  private refreshExpiry(): Date {
    const days = this.config.get<number>('REFRESH_TTL_DAYS') ?? 7
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  }

  private revokeFamily(familyId: string): Promise<unknown> {
    return this.sessionModel.updateMany(
      { familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    )
  }
}
