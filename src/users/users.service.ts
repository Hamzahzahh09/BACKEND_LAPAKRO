import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createProfile(data: {
    id: string;
    email: string;
    name: string;
    phone: string;
  }): Promise<User> {
    const now = new Date();
    const profile = this.userRepository.create({
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
      bio: '',
      photo: '',
      mode: 'buyer',
      role: 'user',
      isVerified: false,
      referralCode: '',
      kycLevel: 0,
      isBanned: false,
      sellerApplicationStatus: 'none',
      sellerApplicationNotes: '',
      createdAt: now,
      updatedAt: now,
    });
    return this.userRepository.save(profile);
  }

  async getProfile(userId: string): Promise<User> {
    const profile = await this.userRepository.findOne({ where: { id: userId } });
    if (!profile) {
      const now = new Date();
      const newProfile = this.userRepository.create({
        id: userId,
        email: '',
        name: 'User',
        phone: '',
        bio: '',
        photo: '',
        mode: 'buyer',
        role: 'user',
        isVerified: false,
        referralCode: '',
        kycLevel: 0,
        isBanned: false,
        sellerApplicationStatus: 'none',
        sellerApplicationNotes: '',
        createdAt: now,
        updatedAt: now,
      });
      return this.userRepository.save(newProfile);
    }
    return profile;
  }

  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    const profile = await this.getProfile(userId);
    Object.assign(profile, data);
    profile.updatedAt = new Date();
    return this.userRepository.save(profile);
  }

  async updateMode(userId: string, mode: 'buyer' | 'seller' | 'both'): Promise<User> {
    const profile = await this.getProfile(userId);
    profile.mode = mode;
    profile.updatedAt = new Date();
    return this.userRepository.save(profile);
  }

  async applyAsSeller(userId: string, notes: string): Promise<User> {
    const profile = await this.getProfile(userId);
    if (profile.sellerApplicationStatus === 'approved') {
      throw new HttpException('You are already an approved seller', HttpStatus.BAD_REQUEST);
    }
    if (profile.sellerApplicationStatus === 'pending') {
      throw new HttpException('Your application is still pending review', HttpStatus.BAD_REQUEST);
    }
    if (!profile.isVerified) {
      throw new HttpException('Please verify your email first', HttpStatus.BAD_REQUEST);
    }
    profile.sellerApplicationStatus = 'pending';
    profile.sellerApplicationNotes = notes;
    profile.updatedAt = new Date();
    return this.userRepository.save(profile);
  }

  async getSellerApplicationStatus(userId: string): Promise<{ status: string; notes: string }> {
    const profile = await this.getProfile(userId);
    return {
      status: profile.sellerApplicationStatus,
      notes: profile.sellerApplicationNotes,
    };
  }

  async findAll(page?: number, limit?: number, search?: string): Promise<User[]> {
    if (page && limit) {
      const qb = this.userRepository.createQueryBuilder('user');
      if (search) {
        qb.where('LOWER(user.name) LIKE :search OR LOWER(user.email) LIKE :search', {
          search: `%${search.toLowerCase()}%`,
        });
      }
      qb.orderBy('user.createdAt', 'DESC');
      const skip = (page - 1) * limit;
      const [data] = await qb.take(limit).skip(skip).getManyAndCount();
      return data;
    }
    return this.userRepository.find();
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userRepository.delete(userId);
  }

  async upgradeToAdmin(userId: string): Promise<User> {
    const user = await this.getProfile(userId);
    user.role = 'admin';
    user.updatedAt = new Date();
    return this.userRepository.save(user);
  }

  async setKycLevel(userId: string, level: number): Promise<User> {
    const profile = await this.getProfile(userId);
    profile.kycLevel = level;
    profile.updatedAt = new Date();
    return this.userRepository.save(profile);
  }

  async setBanStatus(userId: string, banned: boolean): Promise<User> {
    const profile = await this.getProfile(userId);
    profile.isBanned = banned;
    profile.updatedAt = new Date();
    return this.userRepository.save(profile);
  }

  async setUserRole(userId: string, role: string): Promise<User> {
    const validRoles = ['user', 'seller', 'admin', 'owner'];
    if (!validRoles.includes(role)) {
      throw new HttpException('Invalid role', HttpStatus.BAD_REQUEST);
    }
    const profile = await this.getProfile(userId);
    profile.role = role;
    if (role === 'seller') {
      profile.sellerApplicationStatus = 'approved';
    }
    profile.updatedAt = new Date();
    return this.userRepository.save(profile);
  }

  async getPendingSellerApplications(): Promise<User[]> {
    return this.userRepository.find({
      where: { sellerApplicationStatus: 'pending' },
    });
  }

  async approveSeller(userId: string, approve: boolean, notes: string): Promise<User> {
    const profile = await this.getProfile(userId);
    if (profile.sellerApplicationStatus !== 'pending') {
      throw new HttpException('No pending application found', HttpStatus.BAD_REQUEST);
    }
    if (approve) {
      profile.role = 'seller';
      profile.sellerApplicationStatus = 'approved';
      profile.mode = 'both';
    } else {
      profile.sellerApplicationStatus = 'rejected';
      profile.sellerApplicationNotes = notes;
    }
    profile.updatedAt = new Date();
    return this.userRepository.save(profile);
  }
}
