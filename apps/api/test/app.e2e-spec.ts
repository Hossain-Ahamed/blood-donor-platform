import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "../src/entities/user.entity";
import { DonorProfile } from "../src/entities/donor-profile.entity";
import { BloodRequest } from "../src/entities/request.entity";
import { Response } from "../src/entities/response.entity";
import { Donation } from "../src/entities/donation.entity";
import {
  BloodGroup,
  ComponentType,
  UrgencyLevel,
  UserRole,
} from "@repo/shared";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env before starting the app for E2E
dotenv.config({ path: path.join(__dirname, "../../.env") });

describe("AppController (e2e)", () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let userRepository: Repository<User>;

  let requesterToken: string;
  let donorToken: string;
  let adminToken: string;

  let requesterId: string;
  let donorId: string;
  let adminId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );

    // Clear and setup mock users in real DB
    // Assuming DB is running and empty or we can just insert unique users

    // Create Requester
    const requester = await userRepository.save({
      google_id: `google-req-${Date.now()}`,
      email: `req-${Date.now()}@example.com`,
      name: "Test Requester",
      role: UserRole.USER,
    });
    requesterId = requester.id;
    requesterToken = jwtService.sign({
      sub: requester.id,
      email: requester.email,
    });

    // Create Donor
    const donor = await userRepository.save({
      google_id: `google-don-${Date.now()}`,
      email: `don-${Date.now()}@example.com`,
      name: "Test Donor",
      role: UserRole.USER,
    });
    donorId = donor.id;
    donorToken = jwtService.sign({ sub: donor.id, email: donor.email });

    // Create Admin
    const admin = await userRepository.save({
      google_id: `google-adm-${Date.now()}`,
      email: `adm-${Date.now()}@example.com`,
      name: "Test Admin",
      role: UserRole.ADMIN,
    });
    adminId = admin.id;
    adminToken = jwtService.sign({ sub: admin.id, email: admin.email });
  });

  afterAll(async () => {
    await app.close();
  });

  let createdRequestId: string;
  let createdResponseId: string;
  let createdDonationId: string;

  describe("Happy Path: create request -> respond -> accept -> confirm", () => {
    it("should create a request", async () => {
      const res = await request(app.getHttpServer())
        .post("/requests")
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({
          blood_group: BloodGroup.O_POS,
          component_type: ComponentType.WHOLE_BLOOD,
          units_needed: 1,
          urgency: UrgencyLevel.NORMAL,
          lat: 23.8103,
          lng: 90.4125,
          area_name: "Dhaka",
          contact_phone: "0123456789",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      createdRequestId = res.body.id;
    });

    it("should respond to the request as a donor", async () => {
      const res = await request(app.getHttpServer())
        .post(`/requests/${createdRequestId}/responses`)
        .set("Authorization", `Bearer ${donorToken}`)
        .send({
          message: "I can donate!",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      createdResponseId = res.body.id;
    });

    it("should fetch my response for the request as a donor", async () => {
      const res = await request(app.getHttpServer())
        .get(`/requests/${createdRequestId}/my-response`)
        .set("Authorization", `Bearer ${donorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", createdResponseId);
      expect(res.body).toHaveProperty("status", "OFFERED");
    });

    it("should fetch all responses for the request as the requester", async () => {
      const res = await request(app.getHttpServer())
        .get(`/requests/${createdRequestId}/responses`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty("id", createdResponseId);
      expect(res.body[0]).toHaveProperty("donor");
      expect(res.body[0].donor).toHaveProperty("name");
    });

    it("should accept the response", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/responses/${createdResponseId}`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({
          status: "ACCEPTED",
        });

      expect(res.status).toBe(200);

      // Since it's accepted, a donation should be created. We can query donations.
      const donationsRes = await request(app.getHttpServer())
        .get("/donations/me")
        .set("Authorization", `Bearer ${donorToken}`);

      expect(donationsRes.status).toBe(200);
      expect(donationsRes.body.length).toBeGreaterThan(0);
      createdDonationId = donationsRes.body[0].id;
    });

    it("should confirm donation", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/donations/${createdDonationId}/confirm`)
        .set("Authorization", `Bearer ${donorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.confirmed_by_donor).toBe(true);
    });
  });

  describe("Admin Block User Path", () => {
    it("admin should block a user", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${donorId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          is_active: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.is_active).toBe(false);
    });

    it("blocked user token should be rejected", async () => {
      const res = await request(app.getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${donorToken}`);

      expect(res.status).toBe(401);
    });
  });
});
