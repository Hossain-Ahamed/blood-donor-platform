import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Response } from "../../entities/response.entity";
import { BloodRequest } from "../../entities/request.entity";
import { Donation } from "../../entities/donation.entity";
import { DonorProfile } from "../../entities/donor-profile.entity";
import { User } from "../../entities/user.entity";
import { PushSubscriptionsService } from "../push-subscriptions/push-subscriptions.service";
import { DonorProfilesService, calculateAge } from "../donor-profiles/donor-profiles.service";
import { ResponseStatus, RequestStatus } from "@repo/shared";
import { SmartFeedService } from "../smart-feed/smart-feed.service";

@Injectable()
export class ResponsesService {
  constructor(
    @InjectRepository(Response)
    private readonly responseRepository: Repository<Response>,
    @InjectRepository(BloodRequest)
    private readonly requestRepository: Repository<BloodRequest>,
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(DonorProfile)
    private readonly donorProfileRepository: Repository<DonorProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly pushSubscriptionsService: PushSubscriptionsService,
    private readonly smartFeedService: SmartFeedService,
  ) {}

  async create(
    requestId: string,
    donorId: string,
    message?: string,
  ): Promise<Response> {
    const donor = await this.userRepository.findOne({ where: { id: donorId } });
    if (!donor?.phone?.trim()) {
      throw new BadRequestException(
        "You must have a contact phone number in your profile to respond to blood requests",
      );
    }

    const request = await this.requestRepository.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException("Request not found");
    }

    if (request.requester_id === donorId) {
      throw new BadRequestException("Cannot respond to your own request");
    }

    if (request.status !== RequestStatus.OPEN) {
      throw new BadRequestException("Request is not open for responses");
    }

    // Check if donor already responded
    const existing = await this.responseRepository.findOne({
      where: { request_id: requestId, donor_id: donorId },
    });
    if (existing) {
      if (existing.status === ResponseStatus.CANCELLED) {
        existing.status = ResponseStatus.OFFERED;
        if (message !== undefined) {
          existing.message = message;
        }
        const saved = await this.responseRepository.save(existing);
        this.notifyRequesterOfOffer(request, donorId);
        return saved;
      }
      throw new BadRequestException(
        "You have already responded to this request",
      );
    }

    // Donor must have a completed profile to respond
    // Donor must have a completed profile and phone number to respond
    const donorProfile = await this.donorProfileRepository.findOne({
      where: { user_id: donorId },
      relations: ["user"],
    });
    if (!donorProfile || !donorProfile.blood_group) {
      throw new BadRequestException(
        "You must complete your donor profile with your blood group and details before responding to a blood request",
      );
    }
    if (!donorProfile.user?.phone) {
      throw new BadRequestException(
        "You must have a contact phone number in your profile before responding to a blood request",
      );
    }

    // Donor must have finished the 90-day cooldown period
    if (donorProfile.last_donation_date) {
      const lastDate = new Date(donorProfile.last_donation_date);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      if (lastDate > ninetyDaysAgo) {
        const eligibleDate = new Date(lastDate);
        eligibleDate.setDate(eligibleDate.getDate() + 90);
        const daysRemaining = Math.ceil(
          (eligibleDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        throw new BadRequestException(
          `You are currently in a medical rest cooldown period. You last donated on ${lastDate.toLocaleDateString()}. You will be eligible to donate again in ${daysRemaining} day(s) (on ${eligibleDate.toLocaleDateString()}).`,
        );
      }
    }

    const response = this.responseRepository.create({
      request_id: requestId,
      donor_id: donorId,
      status: ResponseStatus.OFFERED,
      message,
    });

    const saved = await this.responseRepository.save(response);
    this.smartFeedService.invalidateFeedCache(request.requester_id);
    this.notifyRequesterOfOffer(request, donorId);
    return saved;
  }

  async findByRequestId(
    requestId: string,
    userId?: string,
    isAdmin = false,
  ): Promise<any[]> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException("Request not found");
    }

    const isOwner = Boolean(userId && request.requester_id === userId);
    const hasFullAccess = Boolean(isAdmin || isOwner);

    const responses = await this.responseRepository.find({
      where: { request_id: requestId },
      relations: ["donor", "donation"],
      order: { created_at: "DESC" },
    });

    if (responses.length === 0) return [];

    const donorIds = responses.map((r) => r.donor_id).filter(Boolean);
    const profiles = await this.donorProfileRepository.find({
      where: { user_id: In(donorIds) },
    });
    const profileMap = new Map<string, DonorProfile>();
    profiles.forEach((p) => profileMap.set(p.user_id, p));

    return responses.map((r) => {
      const profile = profileMap.get(r.donor_id);
      const computedAge = profile?.date_of_birth
        ? (calculateAge(profile.date_of_birth) ?? profile.age)
        : profile?.age;

      return {
        id: r.id,
        request_id: r.request_id,
        donor_id: r.donor_id,
        status: r.status,
        message: hasFullAccess ? r.message : undefined,
        rejection_reason: hasFullAccess ? r.rejection_reason : undefined,
        created_at: r.created_at,
        updated_at: r.updated_at,
        donation: r.donation
          ? {
              id: r.donation.id,
              donation_date: r.donation.donation_date,
              confirmed_by_donor: r.donation.confirmed_by_donor,
              confirmed_by_requester: r.donation.confirmed_by_requester,
            }
          : null,
        donor: r.donor
          ? {
              id: r.donor.id,
              name: r.donor.name,
              avatar_url: r.donor.avatar_url,
              blood_group: profile?.blood_group,
              area_name: profile?.area_name,
              ...(hasFullAccess
                ? {
                    phone: r.donor.phone,
                    email: r.donor.email,
                    is_available: profile?.is_available,
                    last_donation_date: profile?.last_donation_date,
                    age: computedAge,
                    date_of_birth: profile?.date_of_birth,
                    religion: profile?.religion,
                    bio: profile?.bio,
                    health_notes: profile?.health_notes,
                  }
                : {}),
            }
          : null,
      };
    });
  }

  async findMyResponse(
    requestId: string,
    donorId: string,
  ): Promise<Response | null> {
    return this.responseRepository.findOne({
      where: { request_id: requestId, donor_id: donorId },
      relations: ["donation"],
    });
  }

  async findMyAllResponses(donorId: string): Promise<Response[]> {
    return this.responseRepository.find({
      where: { donor_id: donorId },
      relations: ["request", "donation"],
      order: { created_at: "DESC" },
    });
  }

  async updateStatus(
    responseId: string,
    userId: string,
    status: ResponseStatus,
    isAdmin = false,
    rejectionReason?: string,
  ): Promise<Response> {
    const response = await this.responseRepository.findOne({
      where: { id: responseId },
      relations: ["request"],
    });

    if (!response) throw new NotFoundException("Response not found");

    const isRequester = response.request.requester_id === userId;
    const isDonor = response.donor_id === userId;

    if (status === ResponseStatus.CANCELLED) {
      if (!isDonor && !isRequester && !isAdmin) {
        throw new ForbiddenException(
          "Only the donor, requester, or an admin can cancel this response",
        );
      }
    } else {
      if (!isRequester && !isAdmin) {
        throw new ForbiddenException(
          "Only the requester or an admin can update response status",
        );
      }
    }

    if (response.status === ResponseStatus.ACCEPTED) {
      throw new BadRequestException("Response is already accepted");
    }

    response.status = status;
    if (status === ResponseStatus.DECLINED && rejectionReason) {
      response.rejection_reason = rejectionReason;
    }

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

    if (
      status === ResponseStatus.ACCEPTED ||
      status === ResponseStatus.DECLINED
    ) {
      this.smartFeedService.invalidateFeedCache(response.donor_id);
      this.notifyDonorOfStatusChange(response, status, rejectionReason);
    }

    return updatedResponse;
  }

  private notifyRequesterOfOffer(request: BloodRequest, donorId: string) {
    Promise.all([
      this.userRepository.findOne({ where: { id: donorId } }),
      this.donorProfileRepository.findOne({ where: { user_id: donorId } }),
    ])
      .then(([donorUser, profile]) => {
        const donorName = donorUser?.name || profile?.user?.name || "A donor";
        const bloodGroup = profile?.blood_group
          ? ` (${profile.blood_group})`
          : "";
        const title = "New Blood Donation Offer!";
        const message = `${donorName}${bloodGroup} has volunteered to donate blood for your request (${request.area_name}).`;
        const link = `/requests/${request.id}`;

        return this.pushSubscriptionsService.notifyUsers([request.requester_id], {
          title,
          body: message,
          url: link,
        });
      })
      .catch((err) =>
        console.error("Failed to notify requester of new offer:", err),
      );
  }

  private notifyDonorOfStatusChange(
    response: Response,
    status: ResponseStatus,
    rejectionReason?: string,
  ) {
    const isAccepted = status === ResponseStatus.ACCEPTED;
    const title = isAccepted
      ? "Donation Offer Accepted! 🎉"
      : "Donation Offer Update";
    const message = isAccepted
      ? "Your offer to donate blood was accepted by the requester! Check the request for contact details."
      : rejectionReason
        ? `Your offer was declined: ${rejectionReason}`
        : "Your offer to donate was declined by the requester.";
    const link = `/requests/${response.request_id}`;

    this.pushSubscriptionsService
      .notifyUsers([response.donor_id], {
        title,
        body: message,
        url: link,
      })
      .catch((err) =>
        console.error("Failed to notify donor of response status change:", err),
      );
  }
}
