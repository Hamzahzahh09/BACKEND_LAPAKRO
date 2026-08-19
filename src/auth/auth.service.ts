import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new HttpException('Email already registered', HttpStatus.CONFLICT);
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);
    const id = uuidv4();
    const now = new Date();

    const user = this.userRepository.create({
      id,
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      phone: dto.phone || '',
      role: 'user',
      isVerified: false,
      referralCode: uuidv4().substring(0, 8).toUpperCase(),
      otp: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.userRepository.save(user);

    // Kirim OTP saat pendaftaran
    await this.sendOtp(user.email);

    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    if (user.isBanned) {
      throw new HttpException('Your account has been banned', HttpStatus.FORBIDDEN);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password || '');
    if (!isPasswordValid) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async googleAuth(googleData: { email: string; name: string; googleId: string }) {
    let user = await this.userRepository.findOne({
      where: { email: googleData.email },
    });

    if (!user) {
      const id = uuidv4();
      const now = new Date();
      user = this.userRepository.create({
        id,
        email: googleData.email,
        password: '',
        name: googleData.name,
        phone: '',
        role: 'user',
        isVerified: true,
        referralCode: uuidv4().substring(0, 8).toUpperCase(),
        otp: null,
        createdAt: now,
        updatedAt: now,
      });
      await this.userRepository.save(user);
    }

    const token = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.userRepository.findOne({
      where: { email },
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.otp !== otp) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }

    user.isVerified = true;
    user.otp = null;
    user.updatedAt = new Date();

    await this.userRepository.save(user);

    return { message: 'OTP verified successfully' };
  }

  async sendOtp(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.updatedAt = new Date();

    await this.userRepository.save(user);

    // Kirim email asli via Mailtrap
    await this.emailService.sendOtpEmail(user.email, otp);

    return { message: 'OTP sent successfully', otp };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: User) {
    const { password, otp, ...rest } = user;
    return rest;
  }
}


