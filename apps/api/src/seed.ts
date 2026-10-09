import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from '@repo/shared';
import { dataSourceOptions } from './config/typeorm.config';

async function seed() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  console.log('🌱 Checking and seeding admin user(s)...');

  const userRepository = dataSource.getRepository(User);

  const rawAdminEmails =
    process.env.ADMIN_EMAIL ||
    process.env.ADMIN_EMAILS ||
    'ahamed.hossain@rpsu.edu.bd';

  const adminEmails = rawAdminEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  for (const email of adminEmails) {
    const existingUser = await userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.role !== UserRole.ADMIN) {
        existingUser.role = UserRole.ADMIN;
        await userRepository.save(existingUser);
        console.log(`✅ User ${email} found with role '${existingUser.role}' -> Promoted to ADMIN.`);
      } else {
        console.log(`ℹ️ User ${email} already exists as ADMIN.`);
      }
    } else {
      const newAdmin = userRepository.create({
        google_id: `seed-admin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        email,
        name: email.split('@')[0],
        role: UserRole.ADMIN,
        is_active: true,
      });
      await userRepository.save(newAdmin);
      console.log(`✅ Created new ADMIN user with email: ${email}`);
    }
  }

  console.log('🏁 Admin seed completed successfully!');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Failed to seed database:', err);
  process.exit(1);
});
