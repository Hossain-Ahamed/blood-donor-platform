import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponsesService } from './responses.service';
import { ResponsesController } from './responses.controller';
import { Response } from '../../entities/response.entity';
import { BloodRequest } from '../../entities/request.entity';
import { Donation } from '../../entities/donation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Response, BloodRequest, Donation])],
  controllers: [ResponsesController],
  providers: [ResponsesService],
})
export class ResponsesModule { }
