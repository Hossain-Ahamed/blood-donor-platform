import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { Report } from "../../entities/report.entity";
import { User } from "../../entities/user.entity";
import { BloodRequest } from "../../entities/request.entity";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, User, BloodRequest]),
    AuditLogsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
