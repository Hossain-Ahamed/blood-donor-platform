import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { DonorProfile } from './entities/donor-profile.entity';
import { BloodRequest } from './entities/request.entity';
import { UserRole, BloodGroup, UrgencyLevel, RequestStatus } from '@repo/shared';
import { dataSourceOptions } from './config/typeorm.config';

async function seed() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  console.log('🌱 Seeding database...');

  const userRepository = dataSource.getRepository(User);
  const donorProfileRepository = dataSource.getRepository(DonorProfile);
  const requestRepository = dataSource.getRepository(BloodRequest);

  // Clean existing data
  await dataSource.query(`TRUNCATE TABLE users, donor_profiles, requests CASCADE`);

  // 1. Create a Fake User & Donor
  const user1 = userRepository.create({
    google_id: 'fake-google-id-1',
    email: 'donor1@example.com',
    name: 'Rahim Uddin',
    role: UserRole.USER,
    is_active: true,
  });
  await userRepository.save(user1);

  const donor1 = donorProfileRepository.create({
    user_id: user1.id,
    blood_group: BloodGroup.O_POS,
    // Gulshan area, Dhaka
    location: {
      type: 'Point',
      coordinates: [90.4125, 23.8103],
    },
    area_name: 'Gulshan 2, Dhaka',
    is_available: true,
  });
  await donorProfileRepository.save(donor1);

  // 2. Create a Fake Request
  const user2 = userRepository.create({
    google_id: 'fake-google-id-2',
    email: 'requester1@example.com',
    name: 'Karim Hasan',
    role: UserRole.USER,
    is_active: true,
  });
  await userRepository.save(user2);

  const request1 = requestRepository.create({
    requester_id: user2.id,
    blood_group: BloodGroup.O_POS,
    units_needed: 2,
    urgency: UrgencyLevel.URGENT,
    // Banani area, Dhaka
    location: {
      type: 'Point',
      coordinates: [90.4043, 23.7940],
    },
    area_name: 'Banani, Dhaka',
    contact_phone: '+8801700000000',
    status: RequestStatus.OPEN,
    expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000), // +72h
  });
  await requestRepository.save(request1);

  console.log('✅ Seeding complete!');
  await dataSource.destroy();
}

seed().catch(err => {
  console.error('Failed to seed DB', err);
  process.exit(1);
});
