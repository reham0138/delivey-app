import { Controller, Get, type INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UsersService } from '../users/users.service'
import { CategoriesController } from '../categories/categories.controller'
import { CategoriesService } from '../categories/categories.service'
import { MenuItemsController } from '../menu-items/menu-items.controller'
import { MenuItemsService } from '../menu-items/menu-items.service'
import { RestaurantsController } from './restaurants.controller'
import { RestaurantsService } from './restaurants.service'

@Controller('private-control')
class PrivateControlController {
  @Get()
  get() {
    return { ok: true }
  }
}

const emptyPage = { data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 1 } }
const oneItem = { id: '1' }

describe('Public catalog endpoints answer without a token', () => {
  let app: INestApplication
  let baseUrl: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      controllers: [
        CategoriesController,
        RestaurantsController,
        MenuItemsController,
        PrivateControlController,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: UsersService, useValue: { findById: jest.fn(), toAuthUser: jest.fn() } },
        {
          provide: CategoriesService,
          useValue: { findAll: jest.fn().mockResolvedValue(emptyPage) },
        },
        {
          provide: RestaurantsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue(emptyPage),
            findOne: jest.fn().mockResolvedValue(oneItem),
          },
        },
        {
          provide: MenuItemsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue(emptyPage),
            findForRestaurant: jest.fn().mockResolvedValue(emptyPage),
            findOne: jest.fn().mockResolvedValue(oneItem),
          },
        },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.listen(0)
    baseUrl = (await app.getUrl()).replace('[::1]', 'localhost')
  })

  afterAll(async () => {
    await app.close()
  })

  const status = async (path: string) => (await fetch(`${baseUrl}${path}`)).status

  it('control: a route without @Public() really is protected', async () => {
    expect(await status('/private-control')).toBe(401)
  })

  it.each([
    '/categories',
    '/restaurants',
    '/restaurants/64b7f0c2a1b2c3d4e5f60718',
    '/restaurants/64b7f0c2a1b2c3d4e5f60718/menu-items',
    '/menu-items',
    '/menu-items/64b7f0c2a1b2c3d4e5f60718',
  ])('GET %s is public', async (path) => {
    expect(await status(path)).toBe(200)
  })
})
