import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ListRestaurantsQueryDto } from './dto/list-restaurants-query.dto'
import { RestaurantsService } from './restaurants.service'

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  findAll(@Query() query: ListRestaurantsQueryDto) {
    return this.restaurantsService.findAll(query)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id)
  }
}
