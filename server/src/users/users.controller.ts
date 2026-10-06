import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard.js';
import { UsersService } from './users.service.js';

@UseGuards(JwtAccessGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  search(@Query('q') q: string = '') {
    return this.usersService.search(q);
  }
}
