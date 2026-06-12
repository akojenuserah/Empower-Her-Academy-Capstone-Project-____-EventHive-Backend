import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { OrganizerService } from './organizer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('organizer')
@UseGuards(JwtAuthGuard)
export class OrganizerController {
  constructor(private organizerService: OrganizerService) {}

  @Get('analytics')
  getAnalytics(@Req() req: any) {
    return this.organizerService.getAnalytics(req.user.sub);
  }

  @Get('events')
  getEvents(@Req() req: any) {
    return this.organizerService.getOrganizerEvents(req.user.sub);
  }
}
