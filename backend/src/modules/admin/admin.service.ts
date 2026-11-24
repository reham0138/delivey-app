import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import type { FilterQuery } from 'mongoose'
import { AppException } from '../../common/errors'
import { ErrorCode } from '../../common/errors/error-codes.enum'
import { paginate } from '../../common/utils/pagination.util'
import type { PaginatedResponse } from '../../common/dto/paginated-response.interface'
import { AccountStatus, Role } from '../../common/enums'
import type { AuthUser } from '../../common/interfaces/auth-user.interface'
import { AuthService } from '../auth/auth.service'
import { User, UserDocument } from '../users/schemas/user.schema'
import type { AdminUsersQueryDto } from './dto/admin-users-query.dto'
import type { AdminUserRow } from './admin.types'
import { escapeRegex } from './utils/escape-regex'

const USER_SELECT = 'name email phone role status createdAt'

// Shape of a lean user row (createdAt comes from the global timestamps plugin).
interface UserRow {
  _id: Types.ObjectId
  name: string
  email: string
  phone?: string | null
  role: Role
  status: AccountStatus
  createdAt: Date
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly authService: AuthService,
  ) {}

  async findAllUsers(query: AdminUsersQueryDto): Promise<PaginatedResponse<AdminUserRow>> {
    const filter: FilterQuery<UserDocument> = {}
    const search = query.search?.trim()
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i')
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }]
    }
    if (query.role) filter.role = query.role
    if (query.status) filter.status = query.status

    const [rows, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select(USER_SELECT)
        .sort({ createdAt: -1, _id: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      this.userModel.countDocuments(filter),
    ])
    return paginate((rows as unknown as UserRow[]).map(toAdminUserRow), total, query)
  }

  async updateUserStatus(
    id: string,
    status: AccountStatus,
    caller: AuthUser,
  ): Promise<AdminUserRow> {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppException(404, ErrorCode.NotFound, 'User not found')
    }
    const user = (await this.userModel.findById(id).select(USER_SELECT).lean()) as
      | UserRow
      | null
    if (!user) {
      throw new AppException(404, ErrorCode.NotFound, 'User not found')
    }
    if (user.role === Role.Admin) {
      throw new AppException(403, ErrorCode.Forbidden, 'Admin accounts cannot be modified')
    }
    if (String(user._id) === caller.id) {
      throw new AppException(403, ErrorCode.Forbidden, 'You cannot modify your own account')
    }
    if (user.status === status) {
      return toAdminUserRow(user)
    }
    await this.userModel.updateOne({ _id: user._id }, { $set: { status } })
    if (status === AccountStatus.Suspended) {
      await this.authService.revokeAllSessions(String(user._id))
    }
    return toAdminUserRow({ ...user, status })
  }
}

export function toAdminUserRow(user: UserRow): AdminUserRow {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  }
}
