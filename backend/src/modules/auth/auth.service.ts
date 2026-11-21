import { randomBytes, createHash, randomUUID } from 'crypto'
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import * as bcrypt from 'bcryptjs'
import { AccountStatus } from '../../common/enums'
import { AppException } from '../../common/errors'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { UsersService } from '../users/users.service'
import { UserDocument } from '../users/schemas/user.schema'
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
    // TODO(restaurant-on-register): contract section 4 requires creating a
    // Restaurant (isActive:false, isOpen:false, name=user.name, empty fields)
    // when role === 'restaurant'. The Restaurant schema is owned by another
    // module and does not exist yet — wire it here when it lands.
    return this.issueAuthResponse(user)
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
      user: this.usersService.toAuthUser(user),
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

  private async issueAuthResponse(user: UserDocument): Promise<AuthResponse> {
    const refreshToken = this.newRefreshToken()
    const familyId = randomUUID()
    await this.sessionModel.create({
      userId: user._id,
      familyId,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: this.refreshExpiry(),
    })
    return {
      access_token: await this.signAccessToken(user),
      refresh_token: refreshToken,
      user: this.usersService.toAuthUser(user),
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
