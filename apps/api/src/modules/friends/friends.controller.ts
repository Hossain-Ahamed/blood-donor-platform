import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { FriendsService } from "./friends.service";
import { SendFriendRequestDto } from "./dto/send-friend-request.dto";
import { GetFriendsQueryDto } from "./dto/get-friends-query.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Friends")
@ApiBearerAuth()
@Controller("friends")
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @ApiOperation({ summary: "Get list of accepted friends" })
  async getFriends(
    @CurrentUser() user: any,
    @Query() query: GetFriendsQueryDto,
  ) {
    return this.friendsService.getFriends(user.id, query);
  }

  @Get("requests")
  @ApiOperation({ summary: "Get pending friend requests received by current user" })
  async getPendingRequests(@CurrentUser() user: any) {
    return this.friendsService.getPendingRequests(user.id);
  }

  @Get("status/:targetUserId")
  @ApiOperation({ summary: "Check friendship status with a specific target user" })
  @ApiParam({ name: "targetUserId", description: "Target user UUID" })
  async getStatus(
    @CurrentUser() user: any,
    @Param("targetUserId") targetUserId: string,
  ) {
    return this.friendsService.getStatus(user.id, targetUserId);
  }

  @Get("search")
  @ApiOperation({ summary: "Search potential friends by name or email" })
  @ApiQuery({ name: "q", description: "Search query string", required: false })
  async searchUsers(@CurrentUser() user: any, @Query("q") q: string) {
    return this.friendsService.searchUsers(user.id, q || "");
  }

  @Get(":friendUserId/profile")
  @ApiOperation({ summary: "View trusted profile details of an accepted friend" })
  @ApiParam({ name: "friendUserId", description: "Friend's user UUID" })
  async getFriendProfile(
    @CurrentUser() user: any,
    @Param("friendUserId") friendUserId: string,
  ) {
    return this.friendsService.getFriendProfile(
      user.id,
      friendUserId,
      user?.role === "ADMIN",
    );
  }

  @Post("request")
  @ApiOperation({ summary: "Send a friend request by UUID, email, or phone" })
  async sendRequest(
    @CurrentUser() user: any,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(user.id, dto);
  }

  @Post("request/:id/accept")
  @ApiOperation({ summary: "Accept an incoming friend request" })
  @ApiParam({ name: "id", description: "Friend request UUID" })
  async acceptRequest(@CurrentUser() user: any, @Param("id") id: string) {
    return this.friendsService.acceptRequest(user.id, id);
  }

  @Post("request/:id/decline")
  @ApiOperation({ summary: "Decline an incoming friend request" })
  @ApiParam({ name: "id", description: "Friend request UUID" })
  async declineRequest(@CurrentUser() user: any, @Param("id") id: string) {
    return this.friendsService.declineRequest(user.id, id);
  }

  @Delete("request/:id/cancel")
  @ApiOperation({ summary: "Cancel an outgoing friend request" })
  @ApiParam({ name: "id", description: "Friend request UUID" })
  async cancelRequest(@CurrentUser() user: any, @Param("id") id: string) {
    return this.friendsService.cancelRequest(user.id, id);
  }

  @Delete(":friendUserId")
  @ApiOperation({ summary: "Remove/unfriend a connection" })
  @ApiParam({ name: "friendUserId", description: "Friend user UUID" })
  async unfriend(
    @CurrentUser() user: any,
    @Param("friendUserId") friendUserId: string,
  ) {
    return this.friendsService.unfriend(user.id, friendUserId);
  }
}
