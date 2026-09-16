import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report } from '../../entities/report.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report]),
    AuditLogsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService]
})
export class ReportsModule {}
