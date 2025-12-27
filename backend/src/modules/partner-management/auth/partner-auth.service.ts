import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class PartnerAuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async registerPartner(name: string, email: string, phone: string, password: string) {
    if (!name || !email || !password)
      throw new BadRequestException('All required fields must be filled');

    if (!this.emailRegex.test(email))
      throw new BadRequestException('Invalid email address');

    if (password.length < 6)
      throw new BadRequestException('Password too short');

    const exists = await this.prisma.partner.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('Partner already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const partner = await this.prisma.partner.create({
      data: { name, email, phone, password: hashedPassword },
    });

    return { message: 'Partner registered successfully', partner };
  }

  async login({ email, password }: { email: string; password: string }) {
    const partner = await this.prisma.partner.findUnique({ where: { email } });
    if (!partner) throw new UnauthorizedException('Partner not found');

    const valid = await bcrypt.compare(password, partner.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign(
      { id: partner.id, email: partner.email, name: partner.name, type: 'PARTNER' },
      { secret: process.env.JWT_SECRET, expiresIn: '7d' },
    );

    return { partner, token };
  }

  async getProfile(partnerId: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new NotFoundException('Partner not found');
    return partner;
  }

  async editProfile(partnerId: string, data: Partial<{ name: string; email: string; phone: string }>) {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new NotFoundException('Partner not found');

    if (data.email && data.email !== partner.email) {
      const exists = await this.prisma.partner.findUnique({ where: { email: data.email } });
      if (exists) throw new BadRequestException('Email already exists');
    }

    return await this.prisma.partner.update({
      where: { id: partnerId },
      data: {
        name: data.name ?? partner.name,
        email: data.email ?? partner.email,
        phone: data.phone ?? partner.phone,
      },
    });
  }

  async changePassword(partnerId: string, currentPassword: string, newPassword: string) {
    if (!currentPassword || !newPassword)
      throw new BadRequestException('Both current and new password are required');

    if (newPassword.length < 6)
      throw new BadRequestException('New password must be at least 6 characters');

    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new NotFoundException('Partner not found');

    const match = await bcrypt.compare(currentPassword, partner.password);
    if (!match) throw new UnauthorizedException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.partner.update({
      where: { id: partnerId },
      data: { password: hashedPassword },
    });

    return { message: 'Password updated successfully' };
  }
}
