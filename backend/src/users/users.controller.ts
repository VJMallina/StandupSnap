import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query('role') role?: string, @Request() req?: any) {
    const organizationId = req?.user?.organizationId;
    if (role) {
      return this.usersService.findByRole(role);
    }
    if (organizationId) {
      return this.usersService.findByOrg(organizationId);
    }
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
