import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from './users/entities/user.entity';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'roblox_store',
    entities: [User],
    synchronize: true,
  });

  await dataSource.initialize();
  const userRepository = dataSource.getRepository(User);

  const seeds = [
    {
      email: 'owner@lapakro.id',
      password: 'Owner@123456',
      name: 'Owner LapakRo',
      role: 'owner',
      label: 'Owner',
    },
    {
      email: 'admin@lapakro.id',
      password: 'Admin@123456',
      name: 'Admin LapakRo',
      role: 'admin',
      label: 'Admin',
    },
  ];

  for (const seed of seeds) {
    const existing = await userRepository.findOne({ where: { email: seed.email } });
    if (existing) {
      console.log(`${seed.label} account already exists.`);
    } else {
      const hashedPassword = await bcrypt.hash(seed.password, 10);
      const now = new Date();
      await userRepository.save({
        id: uuidv4(),
        email: seed.email,
        password: hashedPassword,
        name: seed.name,
        phone: '',
        bio: '',
        photo: '',
        mode: 'both',
        role: seed.role,
        isVerified: true,
        referralCode: seed.role.toUpperCase(),
        kycLevel: 3,
        isBanned: false,
        sellerApplicationStatus: 'approved',
        sellerApplicationNotes: '',
        otp: null,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`${seed.label} account created!`);
      console.log(`  Email: ${seed.email}`);
      console.log(`  Password: ${seed.password}`);
    }
  }

  await dataSource.destroy();
  console.log('Seed completed.');
}

bootstrap().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
