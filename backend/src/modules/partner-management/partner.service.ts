import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { EmailService } from 'src/global/email/email.service'; // your email service
import { isValidEmail } from 'src/common/utils/validation.util';

@Injectable()
export class PartnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

 async createPartner(data: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}) {
  try {
    const { name, email, phone, address } = data;

    if (!name || !email) {
      throw new BadRequestException('name and email are required');
    }

    if (!isValidEmail(email)) {
      throw new BadRequestException('email is not valid');
    }

    const exists = await this.prisma.partner.findUnique({
      where: { email },
    });

    if (exists) {
      throw new BadRequestException('partner already exists');
    }

    // generate password
    const plainPassword = crypto.randomBytes(4).toString('hex'); // 8 chars
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // create partner
    const partner = await this.prisma.partner.create({
      data: {
        name,
        email,
        phone,
        address,
        password: hashedPassword,
      },
    });

    // send email
    await this.emailService.sendEmail(
      email,
      'Welcome to Aby Inventory – Partner Account Created',
      `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Welcome to Aby Inventory</title>
</head>
<body style="font-family: Arial; background:#f4f6f9; padding:20px;">
  <div style="max-width:600px;margin:auto;background:#fff;padding:30px;border-radius:8px;">
    <h2 style="color:#1f8f7a;">Welcome to Aby Inventory 🎉</h2>

    <p>Hi <strong>${name}</strong>,</p>

    <p>Your partner account has been created. Use the credentials below:</p>

    <div style="background:#f1f9f6;padding:15px;border-radius:6px;">
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Password:</strong> ${plainPassword}</p>
    </div>

    <p>Please change your password after first login.</p>

    <a href="${process.env.FRONTEND_URL}/auth/partner/login"
       style="display:inline-block;margin-top:15px;padding:12px 20px;
              background:#1f8f7a;color:#fff;text-decoration:none;border-radius:6px;">
      Login to Aby Inventory
    </a>

    <p style="margin-top:30px;font-size:13px;color:#999;">
      © ${new Date().getFullYear()} Aby Inventory
    </p>
  </div>
</body>
</html>
      `,
    );

    return {
      message: 'Partner created successfully and email sent',
      partner,
    };
  } catch (error) {
    console.error('Error creating partner:', error);
    throw error;
  }
}

  

  async getAllPartners() {
    return this.prisma.partner.findMany();
  }

  async getPartnerById(id: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id } });
    if (!partner) throw new HttpException('Partner not found', HttpStatus.NOT_FOUND);
    return partner;
  }

  async updatePartner(id: string, data: { name?: string; email?: string; phone?: string; address?: string }) {
    const existing = await this.prisma.partner.findUnique({ where: { id } });
    if (!existing) throw new HttpException('Partner not found', HttpStatus.NOT_FOUND);

    const updated = await this.prisma.partner.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        email: data.email ?? existing.email,
        phone: data.phone ?? existing.phone,
        address: data.address ?? existing.address,
      },
    });

    return { message: 'Partner updated successfully', partner: updated };
  }

  async deletePartner(id: string) {
    const existing = await this.prisma.partner.findUnique({ where: { id } });
    if (!existing) throw new HttpException('Partner not found', HttpStatus.NOT_FOUND);

    const deleted = await this.prisma.partner.delete({ where: { id } });
    return { message: 'Partner deleted successfully', partner: deleted };
  }
}
