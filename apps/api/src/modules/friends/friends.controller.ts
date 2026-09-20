import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
} from "@nestjs/common";
import { FriendsService } from "./friends.service";
import { SendFriendRequestDto } from "./dto/send-friend-request.dto";
import { GetFriendsQueryDto } from "./dto/get-friends-query.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("friends")
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  async getFriends(
    @CurrentUser() user: any,
    @Query() query: GetFriendsQueryDto,
  ) {
    return this.friendsService.getFriends(user.id, query);
  }

  @Get("requests")
  async getPendingRequests(@CurrentUser() user: any) {
    return this.friendsService.getPendingRequests(user.id);
  }

  @Get("status/:targetUserId")
  async getStatus(
    @CurrentUser() user: any,
    @Param("targetUserId") targetUserId: string,
  ) {
    return this.friendsService.getStatus(user.id, targetUserId);
  }

  @Get("search")
  async searchUsers(@CurrentUser() user: any, @Query("q") q: string) {
    return this.friendsService.searchUsers(user.id, q || "");
  }

  @Get(":friendUserId/profile")
  async getFriendProfile(
    @CurrentUser() user: any,
    @Param("friendUserId") friendUserId: string,
  ) {
    return this.friendsService.getFriendProfile(user.id, friendUserId);
  }

  @Post("request")
  async sendRequest(
    @CurrentUser() user: any,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(user.id, dto);
  }

  @Post("request/:id/accept")
  async acceptRequest(@CurrentUser() user: any, @Param("id") id: string) {
    return this.friendsService.acceptRequest(user.id, id);
  }

  @Post("request/:id/decline")
  async declineRequest(@CurrentUser() user: any, @Param("id") id: string) {
    return this.friendsService.declineRequest(user.id, id);
  }

  @Delete("request/:id/cancel")
  async cancelRequest(@CurrentUser() user: any, @Param("id") id: string) {
    return this.friendsService.cancelRequest(user.id, id);
  }

  @Delete(":friendUserId")
  async unfriend(
    @CurrentUser() user: any,
    @Param("friendUserId") friendUserId: string,
  ) {
    return this.friendsService.unfriend(user.id, friendUserId);
  }
}
