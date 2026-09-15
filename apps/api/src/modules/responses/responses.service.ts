import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from '../../entities/response.entity';
import { BloodRequest } from '../../entities/request.entity';
import { Donation } from '../../entities/donation.entity';
import { ResponseStatus, RequestStatus } from '@repo/shared';

@Injectable()
export class ResponsesService {
  constructor(
    @InjectRepository(Response)
    private readonly responseRepository: Repository<Response>,
    @InjectRepository(BloodRequest)
    private readonly requestRepository: Repository<BloodRequest>,
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
  ) { }

  async create(requestId: string, donorId: string): Promise<Response> {
  async create(requestId: string, donorId: string, message?: string): Promise<Response> {
    const request = await this.requestRepository.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Request not found');
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.requester_id === donorId) {
      throw new BadRequestException('Cannot respond to your own request');
    }

    if (request.status !== RequestStatus.OPEN) {
      throw new BadRequestException('Request is not open for responses');
    }

    // Check if donor already responded
    const existing = await this.responseRepository.findOne({
      where: { request_id: requestId, donor_id: donorId }
    });
    if (existing) {
      throw new BadRequestException('You have already responded to this request');
    }

    const response = this.responseRepository.create({
      request_id: requestId,
      donor_id: donorId,
      status: ResponseStatus.OFFERED,
      message,
    });

    return this.responseRepository.save(response);
  }

  async updateStatus(responseId: string, userId: string, status: ResponseStatus): Promise<Response> {
    const response = await this.responseRepository.findOne({
      where: { id: responseId },
      relations: ['request']
    });

    if (!response) throw new NotFoundException('Response not found');

    // Only requester can accept/decline
    if (response.request.requester_id !== userId) {
      throw new ForbiddenException('Only the requester can update response status');
    }

    if (response.status === ResponseStatus.ACCEPTED) {
      throw new BadRequestException('Response is already accepted');
    }

    response.status = status;
    const updatedResponse = await this.responseRepository.save(response);

    // If accepted, auto-create donation and update request
    if (status === ResponseStatus.ACCEPTED) {
      const donation = this.donationRepository.create({
        response_id: response.id,
        donation_date: new Date(),
      });
      await this.donationRepository.save(donation);

      const request = response.request;
      request.units_fulfilled = (request.units_fulfilled || 0) + 1;

      if (request.units_fulfilled >= request.units_needed) {
        request.status = RequestStatus.FULFILLED;
      } else {
        request.status = RequestStatus.PARTIALLY_FULFILLED;
      }
      await this.requestRepository.save(request);
    }

    return updatedResponse;
  }
}
