import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLog } from "../../entities/audit-log.entity";
import { User } from "../../entities/user.entity";
import { BloodRequest } from "../../entities/request.entity";
import { AuditLogsService } from "./audit-logs.service";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, User, BloodRequest])],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}


