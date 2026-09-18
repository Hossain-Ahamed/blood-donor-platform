import { Controller, Get, Post, Body } from "@nestjs/common";
import { SmartFeedService } from "./smart-feed.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { MarkAlertSeenDto, MarkAllAlertsSeenDto } from "./dto/smart-feed.dto";

@Controller("smart-feed")
export class SmartFeedController {
  constructor(private readonly smartFeedService: SmartFeedService) {}

  /**
   * Retrieves ephemeral smart alerts for the logged-in user.
   * Backed by Redis memory (<1ms latency) with stampede and penetration guards.
   */
  @Get()
  async getMyFeed(@CurrentUser() user: any) {
    return this.smartFeedService.getFeed(user.id);
  }

  /**
   * Marks a specific alert as seen in Redis memory (0 database writes).
   */
  @Post("read")
  async markSeen(@CurrentUser() user: any, @Body() dto: MarkAlertSeenDto) {
    await this.smartFeedService.markAlertAsSeen(user.id, dto.alertId);
    return { success: true };
  }

  /**
   * Marks all provided alerts as seen in Redis memory (0 database writes).
   */
  @Post("read-all")
  async markAllSeen(
    @CurrentUser() user: any,
    @Body() dto: MarkAllAlertsSeenDto,
  ) {
    await this.smartFeedService.markAllAlertsAsSeen(user.id, dto.alertIds || []);
    return { success: true };
  }
}
