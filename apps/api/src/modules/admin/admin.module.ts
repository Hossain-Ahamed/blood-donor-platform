import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../../entities/user.entity";
import { BloodRequest } from "../../entities/request.entity";
import { AdminDashboardService } from "./admin-dashboard.service";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminUsersService } from "./admin-users.service";
import { AdminUsersController } from "./admin-users.controller";
import { AdminRequestsService } from "./admin-requests.service";
import { AdminRequestsController } from "./admin-requests.controller";
import { AdminAuditLogsController } from "./admin-audit-logs.controller";

@Module({
  imports: [TypeOrmModule.forFeature([User, BloodRequest])],
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminRequestsController,
    AdminAuditLogsController,
  ],
  providers: [AdminDashboardService, AdminUsersService, AdminRequestsService],
})
export class AdminModule {}
