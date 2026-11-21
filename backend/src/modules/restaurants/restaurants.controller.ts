import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { ListRestaurantsQueryDto } from './dto/list-restaurants-query.dto'
import { RestaurantsService } from './restaurants.service'

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Public()
  @Get()
  findAll(@Query() query: ListRestaurantsQueryDto) {
    return this.restaurantsService.findAll(query)
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id)
  }
}
