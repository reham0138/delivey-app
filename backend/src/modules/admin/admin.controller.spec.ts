import 'reflect-metadata'
import { ROLES_KEY } from '../../common/decorators/roles.decorator'
import { Role } from '../../common/enums'
import { AdminController } from './admin.controller'

describe('AdminController access', () => {
  it('requires the admin role at controller level', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminController)
    expect(roles).toEqual([Role.Admin])
  })

  it('exposes stats, users list and status endpoints', () => {
    expect(typeof AdminController.prototype.stats).toBe('function')
    expect(typeof AdminController.prototype.findAllUsers).toBe('function')
    expect(typeof AdminController.prototype.updateUserStatus).toBe('function')
  })
})
