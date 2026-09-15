import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../../entities/report.entity';
import { CreateReportDto, UpdateReportDto } from './dto/report.dto';
import { ReportStatus } from '@repo/shared';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) { }

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
    return this.reportRepository.find({ order: { created_at: 'DESC' } });
  }

  async update(id: string, dto: UpdateReportDto): Promise<Report> {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    report.status = dto.status;

    return this.reportRepository.save(report);
  }
}
