import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '../../common/enums'
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto'
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto'
import { CategoriesService } from './categories.service'

@ApiTags('categories')
@ApiBearerAuth('bearer')
@Controller()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get('categories')
  findAll(@Query() query: ListCategoriesQueryDto) {
    return this.categoriesService.findAll(query)
  }

  @Roles(Role.Admin)
  @Get('admin/categories')
  findAdmin(@Query() query: ListCategoriesQueryDto) {
    return this.categoriesService.findAdmin(query)
  }

  @Roles(Role.Admin)
  @Post('admin/categories')
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto)
  }

  @Roles(Role.Admin)
  @Patch('admin/categories/:id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto)
  }
}
