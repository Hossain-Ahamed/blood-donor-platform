import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Report } from "../../entities/report.entity";
import { CreateReportDto, UpdateReportDto } from "./dto/report.dto";
import { ReportStatus } from "@repo/shared";
import { AuditLogsService } from "../audit-logs/audit-logs.service";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(userId: string, dto: CreateReportDto): Promise<Report> {
    const report = this.reportRepository.create({
      reporter_id: userId,
      target_type: dto.target_type,
      target_id: dto.target_id,
      reason: dto.reason,
      status: ReportStatus.PENDING,
    });
    return this.reportRepository.save(report);
  }

  async findAll(): Promise<Report[]> {
    return this.reportRepository.find({ order: { created_at: "DESC" } });
  }

  async update(
    id: string,
    dto: UpdateReportDto,
    adminId: string,
  ): Promise<Report> {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) throw new NotFoundException("Report not found");

    const before = { status: report.status };
    report.status = dto.status;
    report.reviewed_by = adminId;
    report.reviewed_at = new Date();

    const after = { status: report.status, reviewed_by: adminId };

    await this.reportRepository.save(report);

    await this.auditLogsService.record(
      adminId,
      "REVIEW_REPORT",
      "REPORT",
      report.id,
      { before, after },
    );

    return report;
  }
}
