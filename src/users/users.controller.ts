import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user.sub);
  }

  @Put('profile')
  updateProfile(@Req() req: any, @Body() dto: any) {
    return this.usersService.updateProfile(req.user.sub, dto);
  }

  @Get('tickets')
  getTickets(@Req() req: any, @Query('status') status?: string) {
    return this.usersService.getTickets(req.user.sub, status);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.usersService.getDashboardStats(req.user.sub);
  }

  @Get('tickets/countdowns')
  getCountdowns(@Req() req: any) {
    return this.usersService.getEventCountdowns(req.user.sub);
  }

  @Get('saved-events')
  getSavedEvents(@Req() req: any) {
    return this.usersService.getSavedEvents(req.user.sub);
  }

  @Post('saved-events')
  saveEvent(@Req() req: any, @Body() body: { eventId: string }) {
    return this.usersService.saveEvent(req.user.sub, body.eventId);
  }

  @Delete('saved-events/:eventId')
  unsaveEvent(@Req() req: any, @Param('eventId') eventId: string) {
    return this.usersService.unsaveEvent(req.user.sub, eventId);
  }

  @Post('tickets')
  purchaseTicket(@Req() req: any, @Body() dto: any) {
    return this.usersService.purchaseTicket(req.user.sub, dto);
  }
}
